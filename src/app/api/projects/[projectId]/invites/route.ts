import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/utils/supabase/server"
import { prisma } from "@/lib/prisma"

import { projectInvites } from "@/server/projects/db"
import { canInvite, requireProjectMembership } from "@/server/projects/permissions"
import type { ProjectRole } from "@/types/projects"
import { PROJECT_ROLE, PROJECT_ROLES } from "@/types/projects"

export async function GET(_request: NextRequest, { params }: { params: { projectId: string } }) {
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
  } catch (error) {
    const message = (error as Error).message
    return NextResponse.json(
      { error: message === "forbidden" ? "Forbidden" : "Not found" },
      { status: message === "forbidden" ? 403 : 404 }
    )
  }

  if (!canInvite(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const inviteWhere: Record<string, unknown> = { projectId: params.projectId }
  if (membership.role === PROJECT_ROLE.HEADER && membership.departmentId) {
    inviteWhere.departmentId = membership.departmentId
    inviteWhere.role = PROJECT_ROLE.MEMBER
  }

  const invites = await projectInvites.findMany({
    where: inviteWhere,
    orderBy: { createdAt: "desc" },
    include: {
      department: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  const now = new Date()
  const expiredInviteIds = invites
    .filter((invite) => invite.expiresAt && invite.expiresAt < now)
    .map((invite) => invite.id)

  if (expiredInviteIds.length > 0) {
    await projectInvites.deleteMany({
      where: { id: { in: expiredInviteIds } },
    })
  }

  const activeInvites = invites.filter(
    (invite) => !invite.expiresAt || invite.expiresAt >= now
  )

  return NextResponse.json(
    activeInvites.map((invite) => ({
      ...invite,
      maxUses: invite.maxUses,
      useCount: invite.useCount,
      department: invite.department,
    }))
  )
}

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
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
  } catch (error) {
    const message = (error as Error).message
    return NextResponse.json(
      { error: message === "forbidden" ? "Forbidden" : "Not found" },
      { status: message === "forbidden" ? 403 : 404 }
    )
  }

  if (!canInvite(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { expiresAt, role, departmentId, maxUses } = (await request.json()) ?? {}
  let roleToAssign: ProjectRole = PROJECT_ROLE.MEMBER
  if (role && PROJECT_ROLES.includes(role as ProjectRole)) {
    roleToAssign = role
  }

  if (roleToAssign === PROJECT_ROLE.OWNER && membership.role !== PROJECT_ROLE.OWNER) {
    return NextResponse.json({ error: "Only owners can invite other owners" }, { status: 403 })
  }

  if (membership.role === PROJECT_ROLE.HEADER) {
    if (!membership.departmentId) {
      return NextResponse.json(
        { error: "Headers must belong to a department to invite members." },
        { status: 400 }
      )
    }
    if (roleToAssign !== PROJECT_ROLE.MEMBER) {
      return NextResponse.json({ error: "Headers can only invite members." }, { status: 403 })
    }
  }

  let departmentToAssign: string | null = null
  if (membership.role === PROJECT_ROLE.HEADER) {
    departmentToAssign = membership.departmentId ?? null
  } else if (typeof departmentId === "string" && departmentId.trim().length > 0) {
    const department = await prisma.projectDepartment.findFirst({
      where: { id: departmentId, projectId: params.projectId },
      select: { id: true },
    })
    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 })
    }
    departmentToAssign = department.id
  }

  const parsedExpiry = expiresAt ? new Date(expiresAt) : null
  if (parsedExpiry && Number.isNaN(parsedExpiry.getTime())) {
    return NextResponse.json({ error: "Invalid expiresAt" }, { status: 400 })
  }

  const canCustomizeMaxUses =
    roleToAssign === PROJECT_ROLE.MEMBER ||
    (roleToAssign === PROJECT_ROLE.OWNER && departmentToAssign === null)
  let maxUsesToAssign: number | null = null
  if (canCustomizeMaxUses && maxUses !== undefined && maxUses !== null) {
    const parsedMax = Number(maxUses)
    if (!Number.isFinite(parsedMax) || parsedMax <= 0) {
      return NextResponse.json({ error: "maxUses must be a positive number" }, { status: 400 })
    }
    maxUsesToAssign = Math.floor(parsedMax)
  }

  const invite = await projectInvites.create({
    data: {
      projectId: params.projectId,
      token: crypto.randomUUID(),
      role: roleToAssign,
      createdBy: user.id,
      expiresAt: parsedExpiry,
      departmentId: departmentToAssign,
      maxUses: roleToAssign === PROJECT_ROLE.HEADER || departmentToAssign
        ? 1
        : maxUsesToAssign,
    },
    include: {
      department: {
        select: { id: true, name: true },
      },
    },
  })

  return NextResponse.json(invite, { status: 201 })
}
