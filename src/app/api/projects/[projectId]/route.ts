import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"

const MAX_DEPARTMENT_LENGTH = 128

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

  const project = await prisma.project.findFirst({
    where: {
      id: params.projectId,
      ownerId: user.id,
    },
  })

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(project)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const payload = await request.json()
  const { title, description, departments, imageUrl } = payload ?? {}

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  if (departments && !Array.isArray(departments)) {
    return NextResponse.json({ error: "Departments must be an array" }, { status: 400 })
  }

  const normalizedDepartments =
    Array.isArray(departments)
      ? Array.from(
          new Set(
            departments
              .filter((dept) => typeof dept === "string")
              .map((dept: string) => dept.trim())
              .filter((dept) => dept.length > 0 && dept.length <= MAX_DEPARTMENT_LENGTH)
          )
        )
      : []

  const project = await prisma.project.updateMany({
    where: { id: params.projectId, ownerId: user.id },
    data: {
      title: title.trim(),
      description: typeof description === "string" ? description.trim() || null : null,
      departments: normalizedDepartments,
      imageUrl: typeof imageUrl === "string" && imageUrl.length > 0 ? imageUrl : null,
    },
  })

  if (project.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const updated = await prisma.project.findUnique({
    where: { id: params.projectId },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const deleted = await prisma.project.deleteMany({
    where: { id: params.projectId, ownerId: user.id },
  })

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
