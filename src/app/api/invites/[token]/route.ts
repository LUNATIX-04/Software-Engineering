import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/utils/supabase/server"

import { projectInvites, projectMembers } from "@/server/projects/db"
import { PROJECT_MEMBER_STATUS, PROJECT_ROLE } from "@/types/projects"
import { prisma } from "@/lib/prisma"

const INVITE_NOT_FOUND = { error: "Invite not found" }

async function resolveInvite(token: string) {
  return projectInvites.findFirst({
    where: {
      token,
      revokedAt: null,
    },
    include: {
      project: {
        select: {
          id: true,
          title: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  const invite = await resolveInvite(params.token)
  if (!invite) {
    return NextResponse.json(INVITE_NOT_FOUND, { status: 404 })
  }

  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json(INVITE_NOT_FOUND, { status: 404 })
  }
  const shouldRevokeAfterUse =
    invite.role === PROJECT_ROLE.HEADER ||
    (invite.role === PROJECT_ROLE.OWNER && invite.departmentId)
  return NextResponse.json({
    id: invite.id,
    project: invite.project,
    role: invite.role,
    expiresAt: invite.expiresAt,
    departmentId: invite.departmentId,
    departmentName: invite.department?.name ?? null,
    maxUses: invite.maxUses,
    useCount: invite.useCount,
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const invite = await resolveInvite(params.token)
  if (!invite) {
    return NextResponse.json(INVITE_NOT_FOUND, { status: 404 })
  }

  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json(INVITE_NOT_FOUND, { status: 404 })
  }

  const shouldRevokeAfterUse =
    invite.role === PROJECT_ROLE.HEADER ||
    (invite.role === PROJECT_ROLE.OWNER && invite.departmentId)

  const existingMembership = await projectMembers.findFirst({
    where: {
      projectId: invite.projectId,
      userId: user.id,
    },
    include: {
      department: {
        select: { id: true, name: true },
      },
    },
  })

  if (existingMembership) {
    const updates: Record<string, unknown> = {}
    if (existingMembership.role !== invite.role && existingMembership.role !== PROJECT_ROLE.OWNER) {
      updates.role = invite.role
    }
    if (invite.departmentId && existingMembership.departmentId !== invite.departmentId) {
      updates.departmentId = invite.departmentId
    }
    if (Object.keys(updates).length > 0) {
      await projectMembers.update({
        where: { id: existingMembership.id },
        data: updates,
      })
    }
    if (
      invite.departmentId &&
      (invite.role === PROJECT_ROLE.HEADER || invite.role === PROJECT_ROLE.OWNER)
    ) {
      await prisma.projectDepartment.update({
        where: { id: invite.departmentId },
        data: { head: existingMembership.username },
      })
    }
    if (shouldRevokeAfterUse) {
      await projectInvites.delete({ where: { id: invite.id } })
    }
    return NextResponse.json({ success: true })
  }
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { fullName: true, email: true },
  })

  const username = profile?.fullName?.trim()?.length
    ? profile.fullName.trim()
    : profile?.email?.split("@")[0] ?? "Member"

  const payload = await request.json().catch(() => ({}))
  const incomingUsername =
    typeof payload?.username === "string" && payload.username.trim().length > 0
      ? payload.username.trim()
      : null
  const finalUsername = incomingUsername ?? username

  const existingUsername = await projectMembers.findFirst({
    where: {
      projectId: invite.projectId,
      username: finalUsername,
    },
    select: { id: true },
  })
  if (existingUsername) {
    return NextResponse.json(
      { error: "This username is already taken in this project." },
      { status: 400 }
    )
  }

  await projectMembers.create({
    data: {
      projectId: invite.projectId,
      userId: user.id,
      role: invite.role,
      departmentId: invite.departmentId ?? null,
      username: finalUsername,
      status: PROJECT_MEMBER_STATUS.ACTIVE,
      lastSeenAt: new Date(),
    },
  })

  if (shouldRevokeAfterUse) {
    await projectInvites.delete({ where: { id: invite.id } })
  }
  if (
    invite.departmentId &&
    (invite.role === PROJECT_ROLE.HEADER || invite.role === PROJECT_ROLE.OWNER)
  ) {
    await prisma.projectDepartment.update({
      where: { id: invite.departmentId },
      data: { head: finalUsername },
    })
  }

  return NextResponse.json({ success: true })
}
