import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/utils/supabase/server"

import { projectMembers } from "@/server/projects/db"
import { ensureActiveMembership, requireProjectMembership } from "@/server/projects/permissions"
import type { ProjectMemberStatus, ProjectRole } from "@/types/projects"
import { PROJECT_MEMBER_STATUS, PROJECT_ROLE, PROJECT_ROLES } from "@/types/projects"
import { prisma } from "@/lib/prisma"

export async function GET(_request: NextRequest, { params }: { params: { projectId: string } }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await requireProjectMembership(params.projectId, user.id)
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const members = await projectMembers.findMany({
    where: {
      projectId: params.projectId,
      status: PROJECT_MEMBER_STATUS.ACTIVE,
    },
    include: {
      profile: {
        select: {
          email: true,
          fullName: true,
          avatarUrl: true,
          bio: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
          color: true,
          textColor: true,
        },
      },
    },
    orderBy: [
      { role: "desc" },
      { createdAt: "asc" },
    ],
  })

  type MemberWithRelations = typeof members[number]

  const payload = members.map((member: MemberWithRelations) => ({
    id: member.id,
    projectId: member.projectId,
    userId: member.userId,
    role: member.role,
    username: member.username,
    email: member.profile?.email ?? null,
    fullName: member.profile?.fullName ?? null,
    avatarUrl: member.profile?.avatarUrl ?? null,
    bio: member.profile?.bio ?? null,
    department: member.department
      ? {
          id: member.department.id,
          name: member.department.name,
          color: member.department.color,
          textColor: member.department.textColor,
        }
      : null,
    lastSeenAt: member.lastSeenAt,
  }))

  return NextResponse.json(payload)
}

export async function PATCH(request: NextRequest, { params }: { params: { projectId: string } }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let membership
  try {
    membership = await requireProjectMembership(params.projectId, user.id)
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const payload = await request.json().catch(() => ({}))
  const memberId = typeof payload?.memberId === "string" ? payload.memberId : null
  const role = typeof payload?.role === "string" ? payload.role : undefined
  const hasDepartmentField = Object.prototype.hasOwnProperty.call(payload ?? {}, "departmentId")
  const nextDepartmentId =
    !hasDepartmentField
      ? undefined
      : payload?.departmentId === null
        ? null
        : typeof payload?.departmentId === "string"
          ? payload.departmentId
          : null

  if (!memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 })
  }

  if (membership.role === PROJECT_ROLE.MEMBER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (role && !PROJECT_ROLES.includes(role as ProjectRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })
  }

  const targetMember = await projectMembers.findFirst({
    where: { id: memberId, projectId: params.projectId },
    select: {
      id: true,
      departmentId: true,
      role: true,
    },
  })

  if (!targetMember) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 })
  }

  if (membership.role === PROJECT_ROLE.HEADER) {
    if (!membership.departmentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (targetMember.departmentId !== membership.departmentId) {
      return NextResponse.json(
        { error: "Headers may only manage members in their department" },
        { status: 403 }
      )
    }
  }

  const updatePayload: Record<string, unknown> = {}
  if (role) {
    if (membership.role !== PROJECT_ROLE.OWNER && role === PROJECT_ROLE.OWNER) {
      return NextResponse.json({ error: "Only owners can promote to owner" }, { status: 403 })
    }
    updatePayload.role = role
  }
  if (nextDepartmentId !== undefined) {
    if (membership.role === PROJECT_ROLE.HEADER && membership.departmentId) {
      if (nextDepartmentId !== membership.departmentId) {
        return NextResponse.json(
          { error: "Headers may only assign their own department" },
          { status: 403 }
        )
      }
    } else if (membership.role === PROJECT_ROLE.HEADER) {
      return NextResponse.json(
        { error: "Headers may not reassign departments" },
        { status: 403 }
      )
    }
    if (nextDepartmentId) {
      const department = await prisma.projectDepartment.findFirst({
        where: { id: nextDepartmentId, projectId: params.projectId },
        select: { id: true },
      })
      if (!department) {
        return NextResponse.json({ error: "Department not found" }, { status: 404 })
      }
      updatePayload.departmentId = nextDepartmentId
    } else {
      updatePayload.departmentId = null
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 })
  }

  await projectMembers.update({
    where: { id: memberId },
    data: updatePayload,
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest, { params }: { params: { projectId: string } }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const actingMember = await ensureActiveMembership(params.projectId, user.id).catch(() => null)
  if (!actingMember) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const actingIsOwner = actingMember.role === PROJECT_ROLE.OWNER
  const actingIsHeader = actingMember.role === PROJECT_ROLE.HEADER

  const payload = await request.json().catch(() => ({}))
  const memberId = typeof payload?.memberId === "string" ? payload.memberId : null
  if (!memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 })
  }

  const targetMember = await projectMembers.findFirst({
    where: { id: memberId, projectId: params.projectId },
    select: {
      id: true,
      role: true,
      departmentId: true,
      username: true,
      userId: true,
    },
  })

  if (!targetMember) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 })
  }

  if (!actingIsOwner) {
    if (!actingIsHeader || !actingMember.departmentId || actingMember.departmentId !== targetMember.departmentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (targetMember.role === PROJECT_ROLE.OWNER) {
      return NextResponse.json({ error: "Headers cannot remove owners" }, { status: 403 })
    }
  }

  if (targetMember.role === PROJECT_ROLE.OWNER) {
    const otherOwners = await projectMembers.count({
      where: {
        projectId: params.projectId,
        role: PROJECT_ROLE.OWNER,
        status: PROJECT_MEMBER_STATUS.ACTIVE,
        id: { not: targetMember.id },
      },
    })
    if (otherOwners === 0) {
      return NextResponse.json({ error: "Transfer ownership before removing this member" }, { status: 400 })
    }
  }

  if (
    targetMember.departmentId &&
    targetMember.username &&
    (targetMember.role === PROJECT_ROLE.HEADER || targetMember.role === PROJECT_ROLE.OWNER)
  ) {
    await prisma.projectDepartment.updateMany({
      where: { id: targetMember.departmentId, head: targetMember.username },
      data: { head: null },
    })
  }

  await projectMembers.delete({ where: { id: targetMember.id } })

  return NextResponse.json({ success: true })
}
