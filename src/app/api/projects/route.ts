import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"
import type { ProjectRole } from "@/types/projects"
import { PROJECT_MEMBER_STATUS, PROJECT_ROLE } from "@/types/projects"
import {
  generatePastelColor,
  getContrastingTextColor,
  sanitizeHexColor,
} from "@/utils/colors"
import { projectMembers } from "@/server/projects/db"

const MAX_DEPARTMENT_LENGTH = 128

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

  type MembershipItem = typeof memberships[number]
  type MembershipWithProject = MembershipItem & {
    project: NonNullable<MembershipItem["project"]>
  }

  const membersWithProject: MembershipWithProject[] = memberships.filter(
    (membership: { project: any }): membership is MembershipWithProject => Boolean(membership.project)
  )

  const projectsWithMembership = membersWithProject.map((membership: MembershipWithProject) => {
    const { project, ...rest } = membership
    return {
      ...project,
      membership: {
        id: rest.id,
        role: rest.role,
        username: rest.username,
        departmentId: rest.departmentId,
        status: rest.status,
      },
      lastActivity: rest.lastSeenAt ?? project.updatedAt,
    }
  })

  const sorted = [...projectsWithMembership].sort((a, b) => {
    const aTime = a.lastActivity instanceof Date ? a.lastActivity.getTime() : Date.parse(String(a.lastActivity))
    const bTime = b.lastActivity instanceof Date ? b.lastActivity.getTime() : Date.parse(String(b.lastActivity))
    return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0)
  })

  return NextResponse.json(sorted)
}

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
      const color = generatePastelColor()
      const normalizedColor = sanitizeHexColor(color)
      operations.push(
        prisma.projectDepartment.create({
          data: {
            projectId,
            name,
            color: normalizedColor,
            textColor: getContrastingTextColor(normalizedColor),
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

  const normalizedDepartments = normalizeDepartmentNames(departments)

  const project = await prisma.project.create({
    data: {
      ownerId: user.id,
      title: title.trim(),
      description: typeof description === "string" ? description.trim() || null : null,
      departments: normalizedDepartments,
      imageUrl: typeof imageUrl === "string" && imageUrl.length > 0 ? imageUrl : null,
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

  return NextResponse.json(
    {
      ...project,
      membership: {
        id: membership.id,
        role: membership.role,
        username: membership.username,
        departmentId: membership.departmentId,
        status: membership.status,
      },
    },
    { status: 200 }
  )
}
