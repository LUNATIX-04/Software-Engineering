import type { Elysia } from "elysia"

import * as crypto from "crypto"

import { createClient } from "../../utils/supabase/server"
import { prisma } from "../../lib/prisma"
import { projectInvites, projectMembers } from "../projects/db"
import { canInvite, requireProjectMembership } from "../projects/permissions"
import {
  PROJECT_MEMBER_STATUS,
  PROJECT_ROLE,
  PROJECT_ROLES,
  type ProjectRole,
} from "../../types/projects"

async function resolveInvite(token: string) {
  return projectInvites.findFirst({
    where: {
      token,
      revokedAt: null,
    },
    include: {
      project: {
        select: { id: true, title: true },
      },
      department: {
        select: { id: true, name: true },
      },
    },
  })
}

async function getInviteResponse(token: string) {
  const invite = await resolveInvite(token)
  if (!invite) {
    return new Response(JSON.stringify({ error: "Invite not found" }), { status: 404 })
  }

  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    return new Response(JSON.stringify({ error: "Invite not found" }), { status: 404 })
  }

  return new Response(
    JSON.stringify({
      id: invite.id,
      project: invite.project,
      role: invite.role,
      expiresAt: invite.expiresAt,
      departmentId: invite.departmentId,
      departmentName: invite.department?.name ?? null,
      maxUses: invite.maxUses,
      useCount: invite.useCount,
    })
  )
}

async function postInviteResponse(token: string, request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  const invite = await resolveInvite(token)
  if (!invite) {
    return new Response(JSON.stringify({ error: "Invite not found" }), { status: 404 })
  }

  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    return new Response(JSON.stringify({ error: "Invite not found" }), { status: 404 })
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
    return new Response(JSON.stringify({ success: true }))
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
    return new Response(
      JSON.stringify({ error: "This username is already taken in this project." }),
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

  return new Response(JSON.stringify({ success: true }))
}

function registerTokenRoutes(app: Elysia, basePath: "/invite" | "/invites") {
  app.get(`${basePath}/:token`, async ({ params }) => getInviteResponse(params.token))
  app.post(`${basePath}/:token`, async ({ request, params }) =>
    postInviteResponse(params.token, request)
  )
}

export function registerInviteRoutes(app: Elysia) {
  app.get("/projects/:projectId/invites", async ({ request, params }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    let membership
    try {
      membership = await requireProjectMembership(params.projectId, user.id)
    } catch (error) {
      const message = (error as Error).message
      return new Response(
        JSON.stringify({ error: message === "forbidden" ? "Forbidden" : "Not found" }),
        { status: message === "forbidden" ? 403 : 404 }
      )
    }

    if (!canInvite(membership.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
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

    const activeInvites = invites.filter((invite) => !invite.expiresAt || invite.expiresAt >= now)

    return new Response(
      JSON.stringify(
        activeInvites.map((invite) => ({
          ...invite,
          maxUses: invite.maxUses,
          useCount: invite.useCount,
          department: invite.department,
        }))
      )
    )
  })

  app.post("/projects/:projectId/invites", async ({ request, params }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    let membership
    try {
      membership = await requireProjectMembership(params.projectId, user.id)
    } catch (error) {
      const message = (error as Error).message
      return new Response(
        JSON.stringify({ error: message === "forbidden" ? "Forbidden" : "Not found" }),
        { status: message === "forbidden" ? 403 : 404 }
      )
    }

    if (!canInvite(membership.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
    }

    const { expiresAt, role, departmentId, maxUses } = (await request.json()) ?? {}
    let roleToAssign: ProjectRole = PROJECT_ROLE.MEMBER
    if (role && PROJECT_ROLES.includes(role as ProjectRole)) {
      roleToAssign = role
    }

    if (roleToAssign === PROJECT_ROLE.OWNER && membership.role !== PROJECT_ROLE.OWNER) {
      return new Response(JSON.stringify({ error: "Only owners can invite other owners" }), { status: 403 })
    }

    if (membership.role === PROJECT_ROLE.HEADER) {
      if (!membership.departmentId) {
        return new Response(
          JSON.stringify({ error: "Headers must belong to a department to invite members." }),
          { status: 400 }
        )
      }
      if (roleToAssign !== PROJECT_ROLE.MEMBER) {
        return new Response(JSON.stringify({ error: "Headers can only invite members." }), { status: 403 })
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
        return new Response(JSON.stringify({ error: "Department not found" }), { status: 404 })
      }
      departmentToAssign = department.id
    }

    const parsedExpiry = expiresAt ? new Date(expiresAt) : null
    if (parsedExpiry && Number.isNaN(parsedExpiry.getTime())) {
      return new Response(JSON.stringify({ error: "Invalid expiresAt" }), { status: 400 })
    }

    const canCustomizeMaxUses =
      roleToAssign === PROJECT_ROLE.MEMBER ||
      (roleToAssign === PROJECT_ROLE.OWNER && departmentToAssign === null)
    let maxUsesToAssign: number | null = null
    if (canCustomizeMaxUses && maxUses !== undefined && maxUses !== null) {
      const parsedMax = Number(maxUses)
      if (!Number.isFinite(parsedMax) || parsedMax <= 0) {
        return new Response(JSON.stringify({ error: "maxUses must be a positive number" }), { status: 400 })
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
        maxUses:
          roleToAssign === PROJECT_ROLE.HEADER || departmentToAssign
            ? 1
            : maxUsesToAssign,
      },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    })

    return new Response(JSON.stringify(invite), { status: 201 })
  })

  app.delete("/projects/:projectId/invites/:inviteId", async ({ params }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    let membership
    try {
      membership = await requireProjectMembership(params.projectId, user.id)
    } catch (error) {
      const message = (error as Error).message
      return new Response(
        JSON.stringify({ error: message === "forbidden" ? "Forbidden" : "Not found" }),
        { status: message === "forbidden" ? 403 : 404 }
      )
    }

    if (!canInvite(membership.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
    }

    await projectInvites.deleteMany({
      where: { id: params.inviteId, projectId: params.projectId },
    })

    return new Response(JSON.stringify({ success: true }))
  })

  app.get("/invite/:token", async ({ params }) => {
    const invite = await resolveInvite(params.token)
    if (!invite) {
      return new Response(JSON.stringify({ error: "Invite not found" }), { status: 404 })
    }

    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Invite not found" }), { status: 404 })
    }

    return new Response(
      JSON.stringify({
        id: invite.id,
        project: invite.project,
        role: invite.role,
        expiresAt: invite.expiresAt,
        departmentId: invite.departmentId,
        departmentName: invite.department?.name ?? null,
        maxUses: invite.maxUses,
        useCount: invite.useCount,
      })
    )
  })

  app.post("/invite/:token", async ({ request, params }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const invite = await resolveInvite(params.token)
    if (!invite) {
      return new Response(JSON.stringify({ error: "Invite not found" }), { status: 404 })
    }

    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Invite not found" }), { status: 404 })
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
      return new Response(JSON.stringify({ success: true }))
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
      return new Response(
        JSON.stringify({ error: "This username is already taken in this project." }),
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

    return new Response(JSON.stringify({ success: true }))
  })

  registerTokenRoutes(app, "/invite")
  registerTokenRoutes(app, "/invites")

  return app
}
