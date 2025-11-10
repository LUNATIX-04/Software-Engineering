import type { Elysia } from "elysia"

import { createClient } from "../../utils/supabase/server"
import { prisma } from "../../lib/prisma"
import { projectMembers } from "../projects/db"
import { requireProjectMembership } from "../projects/permissions"
import { PROJECT_MEMBER_STATUS, PROJECT_ROLE } from "../../types/projects"
import { MAX_DEPARTMENT_LENGTH } from "./constants"
import {
  generatePastelColor,
  getContrastingTextColor,
  sanitizeHexColor,
} from "../../utils/colors"

export function registerDepartmentRoutes(app: Elysia) {
  app.get("/projects/:projectId/departments", async ({ params }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    await requireProjectMembership(params.projectId, user.id)

    const departments = await prisma.projectDepartment.findMany({
      where: { projectId: params.projectId },
      orderBy: { order: "asc" },
    })

    return new Response(JSON.stringify(departments))
  })

  app.post("/projects/:projectId/departments", async ({ request, params }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    try {
      await requireProjectMembership(params.projectId, user.id, [PROJECT_ROLE.OWNER])
    } catch {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
    }

    const payload = await request.json().catch(() => ({}))
    const name =
      typeof payload?.name === "string" && payload.name.trim().length > 0
        ? payload.name.trim()
        : null

    if (!name) {
      return new Response(JSON.stringify({ error: "Name is required" }), { status: 400 })
    }

    const colorInput =
      typeof payload?.color === "string" && payload.color.trim().length > 0
        ? payload.color
        : generatePastelColor()
    const backgroundColor = sanitizeHexColor(colorInput)
    const textColor = getContrastingTextColor(backgroundColor)

    const currentCount = await prisma.projectDepartment.count({
      where: { projectId: params.projectId },
    })

    const department = await prisma.projectDepartment.create({
      data: {
        projectId: params.projectId,
        name,
        color: backgroundColor,
        textColor,
        order: currentCount,
      },
    })

    await syncProjectDepartmentNames(params.projectId)

    return new Response(JSON.stringify(department), { status: 201 })
  })

  app.get("/projects/:projectId/departments/:departmentId", async ({ params }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    try {
      await requireProjectMembership(params.projectId, user.id)
    } catch (error) {
      const message = (error as Error).message
      return new Response(
        JSON.stringify({ error: message === "forbidden" ? "Forbidden" : "Not found" }),
        { status: message === "forbidden" ? 403 : 404 }
      )
    }

    const department = await prisma.projectDepartment.findFirst({
      where: { id: params.departmentId, projectId: params.projectId },
    })

    if (!department) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    }

    return new Response(JSON.stringify(department))
  })

  app.patch("/projects/:projectId/departments/:departmentId", async ({ request, params }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const [membership, department] = await Promise.all([
      projectMembers.findFirst({
        where: {
          projectId: params.projectId,
          userId: user.id,
          status: PROJECT_MEMBER_STATUS.ACTIVE,
        },
        select: {
          role: true,
          username: true,
          departmentId: true,
        },
      }),
      prisma.projectDepartment.findFirst({
        where: { id: params.departmentId, projectId: params.projectId },
        select: {
          id: true,
          head: true,
        },
      }),
    ])

    if (!membership || !department) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    }

    const isOwner = membership.role === PROJECT_ROLE.OWNER
    const isDepartmentHead =
      membership.role === PROJECT_ROLE.HEADER &&
      membership.departmentId === department.id &&
      membership.username === department.head

    if (!isOwner && !isDepartmentHead) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
    }

    let payload: Record<string, unknown> = {}
    try {
      const parsed = await request.json()
      if (typeof parsed === "object" && parsed !== null) {
        payload = parsed as Record<string, unknown>
      }
    } catch {
      // ignore invalid JSON
    }

    const updates: Record<string, unknown> = {}

    if (typeof payload.name === "string") {
      const trimmedName = payload.name.trim()
      if (trimmedName.length > 0) {
        if (trimmedName.length > MAX_DEPARTMENT_LENGTH) {
          return new Response(
            JSON.stringify({ error: `Department name must be ${MAX_DEPARTMENT_LENGTH} characters or fewer.` }),
            { status: 400 }
          )
        }
        updates.name = trimmedName
      }
    }

    const hasHead = Object.prototype.hasOwnProperty.call(payload, "head")
    if (hasHead) {
      if (payload.head === null) {
        updates.head = null
      } else if (typeof payload.head === "string") {
        const trimmedHead = payload.head.trim()
        updates.head = trimmedHead.length > 0 ? trimmedHead : null
      } else {
        updates.head = null
      }
    }

    if (typeof payload.memberCount === "number" && Number.isFinite(payload.memberCount)) {
      updates.memberCount = Math.max(0, Math.floor(payload.memberCount))
    }

    const rawColor = typeof payload.color === "string" ? payload.color.trim() : ""
    const rawTextColor = typeof payload.textColor === "string" ? payload.textColor.trim() : ""
    const sanitizedTextColor = rawTextColor.length > 0 ? sanitizeHexColor(rawTextColor) : null

    if (rawColor.length > 0) {
      const normalized = sanitizeHexColor(rawColor)
      updates.color = normalized
      updates.textColor = sanitizedTextColor ?? getContrastingTextColor(normalized)
    } else if (sanitizedTextColor) {
      updates.textColor = sanitizedTextColor
    }

    if (typeof payload.order === "number" && Number.isFinite(payload.order)) {
      updates.order = Math.max(0, Math.floor(payload.order))
    }

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ error: "No changes provided" }), { status: 400 })
    }

    const updated = await prisma.projectDepartment.update({
      where: { id: department.id },
      data: updates,
    })

    await syncProjectDepartmentNames(params.projectId)

    return new Response(JSON.stringify(updated))
  })

  app.delete("/projects/:projectId/departments/:departmentId", async ({ params }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    try {
      await requireProjectMembership(params.projectId, user.id, [PROJECT_ROLE.OWNER])
    } catch (error) {
      const message = (error as Error).message
      return new Response(
        JSON.stringify({ error: message === "forbidden" ? "Forbidden" : "Not found" }),
        { status: message === "forbidden" ? 403 : 404 }
      )
    }

    const department = await prisma.projectDepartment.findFirst({
      where: { id: params.departmentId, projectId: params.projectId },
    })

    if (!department) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    }

    await prisma.projectDepartment.delete({ where: { id: department.id } })
    await syncProjectDepartmentNames(params.projectId)
    return new Response(JSON.stringify({ success: true }))
  })

  return app
}

async function syncProjectDepartmentNames(projectId: string) {
  const departments = await prisma.projectDepartment.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
    select: { name: true },
  })

  await prisma.project.update({
    where: { id: projectId },
    data: {
      departments: departments.map((dept) => dept.name),
    },
  })
}
