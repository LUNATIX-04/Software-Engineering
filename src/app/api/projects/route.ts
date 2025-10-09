import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"

const MAX_DEPARTMENT_LENGTH = 128

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(projects)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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

  const project = await prisma.project.create({
    data: {
      ownerId: user.id,
      title: title.trim(),
      description: typeof description === "string" ? description.trim() || null : null,
      departments: normalizedDepartments,
      imageUrl: typeof imageUrl === "string" && imageUrl.length > 0 ? imageUrl : null,
    },
  })

  return NextResponse.json(project, { status: 201 })
}
