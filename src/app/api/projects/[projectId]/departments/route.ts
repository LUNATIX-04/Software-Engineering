import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { sanitizeHexColor, getContrastingTextColor, generatePastelColor } from "@/utils/colors"
import { createClient } from "@/utils/supabase/server"
import { requireProjectMembership } from "@/server/projects/permissions"
import { PROJECT_ROLE } from "@/types/projects"

export async function GET(
  _request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await requireProjectMembership(params.projectId, user.id)

  const departments = await prisma.projectDepartment.findMany({
    where: { projectId: params.projectId },
    orderBy: { order: "asc" },
  })

  return NextResponse.json(departments)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await requireProjectMembership(params.projectId, user.id, [PROJECT_ROLE.OWNER])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const payload = await request.json().catch(() => ({}))
  const name =
    typeof payload?.name === "string" && payload.name.trim().length > 0
      ? payload.name.trim()
      : null

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
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

  return NextResponse.json(department, { status: 201 })
}
