import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"
import type { ProjectRole } from "@/types/projects"
import { PROJECT_ROLE } from "@/types/projects"

import { requireProjectMembership } from "@/server/projects/permissions"
import {
  generatePastelColor,
  getContrastingTextColor,
  sanitizeHexColor,
} from "@/utils/colors"

const MAX_DEPARTMENT_LENGTH = 128

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
      operations.push(
        prisma.projectDepartment.update({
          where: { id: match.id },
          data: { order: index },
        })
      )
      existingMap.delete(name)
    } else {
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
    }
  })

  const leftovers = Array.from(existingMap.values())
  if (leftovers.length) {
    operations.push(
      prisma.projectDepartment.deleteMany({
        where: { id: { in: leftovers.map((dept) => dept.id) } },
      })
    )
  }

  await Promise.all(operations)
}

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let membership
  try {
    membership = await requireProjectMembership(params.projectId, user.id)
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (!membership) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
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
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({
    ...project,
    membership: {
      id: membership.id,
      role: membership.role,
      username: membership.username,
      departmentId: membership.departmentId,
      status: membership.status,
    },
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let membership: Awaited<ReturnType<typeof requireProjectMembership>> | null = null
  try {
    membership = await requireProjectMembership(params.projectId, user.id, [PROJECT_ROLE.OWNER])
  } catch (error) {
    const message = (error as Error).message
    return NextResponse.json(
      { error: message === "forbidden" ? "Forbidden" : "Not found" },
      { status: message === "forbidden" ? 403 : 404 }
    )
  }
  if (!membership) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const payload = await request.json()
  const { title, description, departments, imageUrl } = payload ?? {}

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  if (departments && !Array.isArray(departments)) {
    return NextResponse.json({ error: "Departments must be an array" }, { status: 400 })
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

  return NextResponse.json({
    ...updated,
    membership: {
      id: membership.id,
      role: membership.role,
      username: membership.username,
      departmentId: membership.departmentId,
      status: membership.status,
    },
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await requireProjectMembership(params.projectId, user.id, [PROJECT_ROLE.OWNER])
  } catch (error) {
    const message = (error as Error).message
    return NextResponse.json(
      { error: message === "forbidden" ? "Forbidden" : "Not found" },
      { status: message === "forbidden" ? 403 : 404 }
    )
  }

  await prisma.project.delete({
    where: { id: params.projectId },
  })

  return NextResponse.json({ success: true }, { status: 200 })
}
