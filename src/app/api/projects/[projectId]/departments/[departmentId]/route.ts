import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getContrastingTextColor, sanitizeHexColor } from "@/utils/colors"
import { createClient } from "@/utils/supabase/server"
import { projectMembers } from "@/server/projects/db"
import { PROJECT_MEMBER_STATUS, PROJECT_ROLE } from "@/types/projects"

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string; departmentId: string } }
) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const isOwner = membership.role === PROJECT_ROLE.OWNER
  const isDepartmentHead =
    membership.role === PROJECT_ROLE.HEADER &&
    membership.departmentId === department.id &&
    membership.username === department.head

  if (!isOwner && !isDepartmentHead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const payload = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}

  if (typeof payload?.name === "string" && payload.name.trim().length > 0) {
    data.name = payload.name.trim()
  }

  if (typeof payload?.head === "string") {
    data.head = payload.head.trim() ? payload.head.trim() : null
  } else if (payload && Object.prototype.hasOwnProperty.call(payload, "head") && payload.head === null) {
    data.head = null
  }

  if (typeof payload?.memberCount === "number" && Number.isFinite(payload.memberCount)) {
    data.memberCount = Math.max(0, Math.floor(payload.memberCount))
  }

  if (typeof payload?.color === "string" && payload.color.trim().length > 0) {
    const normalizedColor = sanitizeHexColor(payload.color)
    data.color = normalizedColor
    data.textColor = getContrastingTextColor(normalizedColor)
  } else if (typeof payload?.textColor === "string" && payload.textColor.trim().length > 0) {
    data.textColor = sanitizeHexColor(payload.textColor)
  }

  if (typeof payload?.order === "number" && Number.isFinite(payload.order)) {
    data.order = Math.max(0, Math.floor(payload.order))
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 })
  }

  await prisma.projectDepartment.update({
    where: { id: department.id },
    data,
  })

  const updated = await prisma.projectDepartment.findUnique({ where: { id: department.id } })
  return NextResponse.json(updated)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { projectId: string; departmentId: string } }
) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const department = await assertDepartmentAccess(params.projectId, params.departmentId, user.id)
  if (!department) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.projectDepartment.delete({ where: { id: department.id } })
  return NextResponse.json({ success: true })
}
