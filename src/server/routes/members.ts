import type { Elysia } from "elysia"

import { createClient } from "../../utils/supabase/server"
import { prisma } from "../../lib/prisma"
import { projectMembers } from "../projects/db"
import {
  ensureActiveMembership,
  requireProjectMembership,
} from "../projects/permissions"
import {
  PROJECT_MEMBER_STATUS,
  PROJECT_ROLE,
  PROJECT_ROLES,
  type ProjectRole,
} from "../../types/projects"

export function registerMemberRoutes(app: Elysia) {
  app.get("/projects/:projectId/members", async ({ params }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    try {
      await requireProjectMembership(params.projectId, user.id)
    } catch {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
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

    const payload = members.map((member) => ({
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

    return new Response(JSON.stringify(payload))
  })

  app.patch("/projects/:projectId/members", async ({ request, params }) => {
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
    } catch {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
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
      return new Response(JSON.stringify({ error: "memberId is required" }), { status: 400 })
    }

    if (membership.role === PROJECT_ROLE.MEMBER) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
    }

    if (role && !PROJECT_ROLES.includes(role as ProjectRole)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), { status: 400 })
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
      return new Response(JSON.stringify({ error: "Member not found" }), { status: 404 })
    }

    if (membership.role === PROJECT_ROLE.HEADER) {
      if (!membership.departmentId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
      }
      if (targetMember.departmentId !== membership.departmentId) {
        return new Response(
          JSON.stringify({ error: "Headers may only manage members in their department" }),
          { status: 403 }
        )
      }
    }

    const updatePayload: Record<string, unknown> = {}
    if (role) {
      if (membership.role !== PROJECT_ROLE.OWNER && role === PROJECT_ROLE.OWNER) {
        return new Response(JSON.stringify({ error: "Only owners can promote to owner" }), { status: 403 })
      }
      updatePayload.role = role
    }
    if (nextDepartmentId !== undefined) {
      if (membership.role === PROJECT_ROLE.HEADER && membership.departmentId) {
        if (nextDepartmentId !== membership.departmentId) {
          return new Response(
            JSON.stringify({ error: "Headers may only assign their own department" }),
            {
              status: 403,
            }
          )
        }
      } else if (membership.role === PROJECT_ROLE.HEADER) {
        return new Response(JSON.stringify({ error: "Headers may not reassign departments" }), { status: 403 })
      }
      if (nextDepartmentId) {
        const department = await prisma.projectDepartment.findFirst({
          where: { id: nextDepartmentId, projectId: params.projectId },
          select: { id: true },
        })
        if (!department) {
          return new Response(JSON.stringify({ error: "Department not found" }), { status: 404 })
        }
        updatePayload.departmentId = nextDepartmentId
      } else {
        updatePayload.departmentId = null
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return new Response(JSON.stringify({ error: "No updates provided" }), { status: 400 })
    }

    await projectMembers.update({
      where: { id: memberId },
      data: updatePayload,
    })

    return new Response(JSON.stringify({ success: true }))
  })

  app.patch("/projects/:projectId/members/username", async ({ request, params }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    let membership
    try {
      membership = await ensureActiveMembership(params.projectId, user.id)
    } catch {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    }

    const payload = await request.json().catch(() => ({}))
    const username = typeof payload?.username === "string" ? payload.username.trim() : ""
    if (!username) {
      return new Response(JSON.stringify({ error: "Username is required" }), { status: 400 })
    }

    const updated = await projectMembers.update({
      where: { id: membership.id },
      data: { username },
      select: {
        id: true,
        username: true,
      },
    })

    return new Response(JSON.stringify(updated))
  })

  app.post("/projects/:projectId/members/leave", async ({ params }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    let membership
    try {
      membership = await ensureActiveMembership(params.projectId, user.id)
    } catch {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    }

    if (membership.role === PROJECT_ROLE.OWNER) {
      const ownerCount = await projectMembers.count({
        where: {
          projectId: params.projectId,
          role: PROJECT_ROLE.OWNER,
          status: PROJECT_MEMBER_STATUS.ACTIVE,
          id: { not: membership.id },
        },
      })
      if (ownerCount === 0) {
        return new Response(JSON.stringify({ error: "Transfer ownership before leaving" }), { status: 400 })
      }
    }

    if (
      membership.departmentId &&
      (membership.role === PROJECT_ROLE.HEADER || membership.role === PROJECT_ROLE.OWNER) &&
      membership.username
    ) {
      await prisma.projectDepartment.updateMany({
        where: {
          id: membership.departmentId,
          head: membership.username,
        },
        data: {
          head: null,
        },
      })
    }

    await projectMembers.delete({
      where: { id: membership.id },
    })

    return new Response(JSON.stringify({ success: true }))
  })

  app.get("/projects/:projectId/members/status", async ({ request, params }) => {
    const url = new URL(request.url)
    const userId = url.searchParams.get("userId")

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), { status: 400 })
    }

    const membership = await projectMembers.findFirst({
      where: { projectId: params.projectId, userId },
      select: { id: true },
    })

    const project = await prisma.project.findFirst({
      where: { id: params.projectId },
      select: { ownerId: true },
    })

    return new Response(
      JSON.stringify({
        isMember: Boolean(membership),
        isOwner: project?.ownerId === userId,
      })
    )
  })

  app.delete("/projects/:projectId/members", async ({ request, params }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const actingMember = await ensureActiveMembership(params.projectId, user.id).catch(() => null)
    if (!actingMember) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    }

    const actingIsOwner = actingMember.role === PROJECT_ROLE.OWNER
    const actingIsHeader = actingMember.role === PROJECT_ROLE.HEADER

    const payload = await request.json().catch(() => ({}))
    const memberId = typeof payload?.memberId === "string" ? payload.memberId : null
    if (!memberId) {
      return new Response(JSON.stringify({ error: "memberId is required" }), { status: 400 })
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
      return new Response(JSON.stringify({ error: "Member not found" }), { status: 404 })
    }

    if (!actingIsOwner) {
      if (!actingIsHeader || !actingMember.departmentId || actingMember.departmentId !== targetMember.departmentId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
      }
      if (targetMember.role === PROJECT_ROLE.OWNER) {
        return new Response(JSON.stringify({ error: "Headers cannot remove owners" }), { status: 403 })
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
        return new Response(JSON.stringify({ error: "Transfer ownership before removing this member" }), {
          status: 400,
        })
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

    return new Response(JSON.stringify({ success: true }))
  })

  app.get("/projects/:projectId/membership", async ({ params }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    try {
      const membership = await requireProjectMembership(params.projectId, user.id)
      return new Response(
        JSON.stringify({
          id: membership.id,
          role: membership.role,
          username: membership.username,
          departmentId: membership.departmentId,
          status: membership.status,
        })
      )
    } catch (error) {
      const message = (error as Error).message
      return new Response(
        JSON.stringify({ error: message === "forbidden" ? "Forbidden" : "Not found" }),
        { status: message === "forbidden" ? 403 : 404 }
      )
    }
  })

  app.post("/projects/:projectId/owners", async ({ request, params }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    let requester
    try {
      requester = await requireProjectMembership(params.projectId, user.id, [PROJECT_ROLE.OWNER])
    } catch (error) {
      const message = (error as Error).message
      return new Response(
        JSON.stringify({ error: message === "forbidden" ? "Forbidden" : "Not found" }),
        { status: message === "forbidden" ? 403 : 404 }
      )
    }

    const payload = await request.json().catch(() => ({}))
    const { ownerIds } = payload ?? {}
    if (!Array.isArray(ownerIds) || ownerIds.length === 0) {
      return new Response(JSON.stringify({ error: "ownerIds is required" }), { status: 400 })
    }

    const uniqueOwnerIds = Array.from(
      new Set(ownerIds.filter((id): id is string => typeof id === "string"))
    )
    if (uniqueOwnerIds.length === 0) {
      return new Response(JSON.stringify({ error: "ownerIds is required" }), { status: 400 })
    }

    const targetMembers = await projectMembers.findMany({
      where: {
        projectId: params.projectId,
        status: PROJECT_MEMBER_STATUS.ACTIVE,
        id: { in: uniqueOwnerIds },
      },
      select: { id: true, userId: true },
    })

    const currentOwners = await projectMembers.findMany({
      where: {
        projectId: params.projectId,
        status: PROJECT_MEMBER_STATUS.ACTIVE,
        role: PROJECT_ROLE.OWNER,
      },
      select: { id: true, username: true },
    })

    if (targetMembers.length !== uniqueOwnerIds.length) {
      return new Response(JSON.stringify({ error: "One or more members were not found" }), { status: 404 })
    }

    const ownerUserMap = new Map(targetMembers.map((member) => [member.id, member.userId]))
    const primaryOwnerUserId =
      ownerUserMap.get(uniqueOwnerIds[0]) ??
      targetMembers[0]?.userId ??
      requester.project.ownerId

    const departmentHeads = await prisma.projectDepartment.findMany({
      where: { projectId: params.projectId },
      select: { head: true },
    })
    const headUsernames = new Set(
      departmentHeads.map((dept) => dept.head).filter((head): head is string => Boolean(head?.trim()))
    )

    const demoteTargets = currentOwners.filter((owner) => !uniqueOwnerIds.includes(owner.id))

    await prisma.$transaction(async (txRaw) => {
      const tx = txRaw as typeof prisma & {
        projectMember: typeof projectMembers
      }

      if (demoteTargets.length > 0) {
        await Promise.all(
          demoteTargets.map((owner) =>
            tx.projectMember.update({
              where: { id: owner.id },
              data: {
                role: headUsernames.has(owner.username ?? "")
                  ? PROJECT_ROLE.HEADER
                  : PROJECT_ROLE.MEMBER,
              },
            })
          )
        )
      }

      await tx.projectMember.updateMany({
        where: { id: { in: uniqueOwnerIds } },
        data: { role: PROJECT_ROLE.OWNER },
      })

      await tx.project.update({
        where: { id: params.projectId },
        data: { ownerId: primaryOwnerUserId },
      })
    })

    const owners = await projectMembers.findMany({
      where: { projectId: params.projectId, role: PROJECT_ROLE.OWNER },
      select: {
        id: true,
        userId: true,
        username: true,
      },
      orderBy: { createdAt: "asc" },
    })

    return new Response(JSON.stringify({ owners }))
  })

  return app
}
