import type { Elysia } from "elysia"

import { createClient } from "../../utils/supabase/server"
import { prisma } from "../../lib/prisma"
import { projectMembers } from "../projects/db"
import { requireProjectMembership } from "../projects/permissions"
import { PROJECT_MEMBER_STATUS, PROJECT_ROLE } from "../../types/projects"
import {
  generatePastelColor,
  getContrastingTextColor,
  sanitizeHexColor,
} from "../../utils/colors"
import { MAX_DEPARTMENT_LENGTH } from "./constants"

function normalizeDepartmentNames(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const normalized = input
    .filter((dept): dept is string => typeof dept === "string")
    .map((dept) => dept.trim())
    .filter((dept) => dept.length > 0 && dept.length <= MAX_DEPARTMENT_LENGTH)
  return Array.from(new Set(normalized))
}

async function syncProjectDepartments(projectId: string, names: string[]) {
  const existing = await prisma.projectDepartment.findMany({
    where: { projectId },
  })

  const existingMap = new Map(existing.map((dept) => [dept.name, dept]))
  const operations: Array<Promise<unknown>> = []

  names.forEach((name, index) => {
    const match = existingMap.get(name)
    if (match) {
      if (match.order !== index) {
        operations.push(
          prisma.projectDepartment.update({
            where: { id: match.id },
            data: { order: index },
          })
        )
      }
      existingMap.delete(name)
      return
    }

    const color = sanitizeHexColor(generatePastelColor())
    operations.push(
      prisma.projectDepartment.create({
        data: {
          projectId,
          name,
          color,
          textColor: getContrastingTextColor(color),
          order: index,
        },
      })
    )
  })

  const leftovers = Array.from(existingMap.values())
  if (leftovers.length > 0) {
    operations.push(
      prisma.projectDepartment.deleteMany({
        where: { id: { in: leftovers.map((dept) => dept.id) } },
      })
    )
  }

  if (operations.length > 0) {
    await Promise.all(operations)
  }
}

export function registerProjectRoutes(app: Elysia) {
  app.get("/projects", async () => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const memberships = await projectMembers.findMany({
      where: {
        userId: user.id,
        status: PROJECT_MEMBER_STATUS.ACTIVE,
      },
      include: {
        project: true,
      },
    })

    return new Response(
      JSON.stringify(
        memberships.map((membership) => ({
          ...(membership.project ?? {}),
          membership: {
            id: membership.id,
            role: membership.role,
            username: membership.username,
            departmentId: membership.departmentId,
            status: membership.status,
          },
        }))
      )
    )
  })

  app.get("/projects/:projectId", async ({ params }) => {
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
    if (!membership) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    }

    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      include: {
        projectDepartments: {
          orderBy: { order: "asc" },
        },
      },
    })

    if (!project) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    }

    return new Response(
      JSON.stringify({
        ...project,
        membership: {
          id: membership.id,
          role: membership.role,
          username: membership.username,
          departmentId: membership.departmentId,
          status: membership.status,
        },
      })
    )
  })

  app.post("/projects", async ({ request }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null
    const title = typeof payload?.title === "string" ? payload.title.trim() : ""
    const description =
      typeof payload?.description === "string" && payload.description.trim().length > 0
        ? payload.description.trim()
        : null
    const departments = payload?.departments
    const normalizedDepartments = normalizeDepartmentNames(departments)
    const imageUrl =
      typeof payload?.imageUrl === "string" && payload.imageUrl.trim().length > 0
        ? payload.imageUrl.trim()
        : null

    try {
      if (!title) {
        return new Response(JSON.stringify({ error: "Title is required" }), { status: 400 })
      }

      const project = await prisma.project.create({
        data: {
          ownerId: user.id,
          title,
          description,
          departments: normalizedDepartments,
          imageUrl,
        },
      })

      if (normalizedDepartments.length > 0) {
        await syncProjectDepartments(project.id, normalizedDepartments)
      }

      const profile = await prisma.profile.findUnique({
        where: { id: user.id },
        select: { fullName: true, email: true },
      })

      const defaultUsername = profile?.fullName?.trim()?.length
        ? profile.fullName.trim()
        : profile?.email?.split("@")[0] ?? "Owner"

      const membership = await projectMembers.create({
        data: {
          projectId: project.id,
          userId: user.id,
          role: PROJECT_ROLE.OWNER,
          username: defaultUsername,
          lastSeenAt: new Date(),
        },
      })

      return new Response(
        JSON.stringify({
          ...project,
          membership: {
            id: membership.id,
            role: membership.role,
            username: membership.username,
            departmentId: membership.departmentId,
            status: membership.status,
          },
        }),
        { status: 201 }
      )
    } catch (error) {
      console.error("Failed to create project", error)
      const message =
        error instanceof Error && error.message.length > 0
          ? error.message
          : "Unable to create project"
      return new Response(JSON.stringify({ error: message }), { status: 500 })
    }
  })

  app.post("/projects/:projectId/usage", async ({ params }) => {
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

    return new Response(JSON.stringify({ success: true }))
  })

  app.patch("/projects/:projectId", async ({ request, params }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    let membership
    try {
      membership = await requireProjectMembership(params.projectId, user.id, [PROJECT_ROLE.OWNER])
    } catch (error) {
      const message = (error as Error).message
      return new Response(
        JSON.stringify({ error: message === "forbidden" ? "Forbidden" : "Not found" }),
        { status: message === "forbidden" ? 403 : 404 }
      )
    }
    if (!membership) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    }

    const payload = await request.json()
    const { title, description, departments, imageUrl } = payload ?? {}

    if (typeof title !== "string" || title.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Title is required" }), { status: 400 })
    }

    if (departments && !Array.isArray(departments)) {
      return new Response(JSON.stringify({ error: "Departments must be an array" }), { status: 400 })
    }

    const normalizedDepartments = normalizeDepartmentNames(departments)

    await prisma.project.update({
      where: { id: params.projectId },
      data: {
        title: title.trim(),
        description: typeof description === "string" ? description.trim() || null : null,
        departments: normalizedDepartments,
        imageUrl: typeof imageUrl === "string" && imageUrl.length > 0 ? imageUrl : null,
      },
    })

    if (normalizedDepartments.length > 0) {
      await syncProjectDepartments(params.projectId, normalizedDepartments)
    }

    const updated = await prisma.project.findUnique({
      where: { id: params.projectId },
      include: {
        projectDepartments: { orderBy: { order: "asc" } },
      },
    })

    return new Response(
      JSON.stringify({
        ...updated,
        membership: {
          id: membership.id,
          role: membership.role,
          username: membership.username,
          departmentId: membership.departmentId,
          status: membership.status,
        },
      })
    )
  })

  app.delete("/projects/:projectId", async ({ params }) => {
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

    await prisma.project.delete({
      where: { id: params.projectId },
    })

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  })

  return app
}
