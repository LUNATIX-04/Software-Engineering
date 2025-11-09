import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/utils/supabase/server"
import { prisma } from "@/lib/prisma"
import { requireProjectMembership } from "@/server/projects/permissions"
import { projectMembers, projectTaskAssignees, projectTasks } from "@/server/projects/db"
import { getContrastingTextColor, sanitizeHexColor } from "@/utils/colors"
import { DEFAULT_TASK_CARD_COLOR } from "@/constants/task-colors"

type RouteParams = {
  params: {
    projectId: string
  }
}

const TASK_STATUS_VALUES = ["SUBMITTED", "IN_PROGRESS", "BLOCKED"] as const
type TaskStatusEnum = (typeof TASK_STATUS_VALUES)[number]

function parseCardColor(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }
  return sanitizeHexColor(trimmed)
}

function resolveCardTextColor(cardColor: string) {
  return getContrastingTextColor(cardColor)
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min
  }
  return Math.min(max, Math.max(min, value))
}

function parseDeadlineInput(value: unknown): Date | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const normalized = trimmed.replace(/-/g, "/").replace("T", " ")
  const segments = normalized
    .split(/\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
  if (segments.length === 0) {
    return null
  }
  const [dateText, ...rest] = segments
  const dateParts = dateText.split("/").map((part) => part.trim())
  if (dateParts.length !== 3) {
    return null
  }
  const [dayRaw, monthRaw, yearRaw] = dateParts
  const day = Number(dayRaw)
  const monthIndex = Number(monthRaw) - 1
  const year = Number(yearRaw)
  if (!Number.isFinite(day) || !Number.isFinite(monthIndex) || !Number.isFinite(year)) {
    return null
  }
  const safeYear = clampNumber(Math.trunc(year), 1900, 2100)
  const safeMonthIndex = clampNumber(Math.trunc(monthIndex), 0, 11)
  const maxDays = new Date(safeYear, safeMonthIndex + 1, 0).getDate()
  const safeDay = clampNumber(Math.trunc(day), 1, maxDays)
  const candidate = new Date(Date.UTC(safeYear, safeMonthIndex, safeDay))

  if (rest.length > 0) {
    const timePart = rest.join(" ")
    const [hoursRaw, minutesRaw] = timePart.split(":")
    const hours = clampNumber(Math.trunc(Number(hoursRaw ?? "0")), 0, 23)
    const minutes = clampNumber(Math.trunc(Number(minutesRaw ?? "0")), 0, 59)
    candidate.setUTCHours(hours, minutes, 0, 0)
  } else {
    candidate.setUTCHours(0, 0, 0, 0)
  }
  return candidate
}

type TaskWithRelations = Awaited<ReturnType<typeof fetchTasks>>[number]

function serializeTask(task: TaskWithRelations) {
  return {
    id: task.id,
    title: task.title,
    detail: task.detail,
    status: task.status,
    startDate: task.startDate ? task.startDate.toISOString() : null,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    cardColor: task.cardColor,
    cardTextColor: task.cardTextColor,
    department: task.department
      ? {
          id: task.department.id,
          name: task.department.name,
          color: task.department.color,
          textColor: task.department.textColor,
        }
      : null,
    assignees: task.assignees.map((assignment) => ({
      id: assignment.member.id,
      username: assignment.member.username,
      fullName: assignment.member.profile?.fullName ?? null,
      departmentId: assignment.member.departmentId,
    })),
    createdBy: {
      id: task.createdBy.id,
      username: task.createdBy.username,
      fullName: task.createdBy.profile?.fullName ?? null,
      role: task.createdBy.role,
    },
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }
}

function fetchTasks(projectId: string) {
  return projectTasks.findMany({
    where: { projectId },
    include: {
      department: {
        select: {
          id: true,
          name: true,
          color: true,
          textColor: true,
        },
      },
      assignees: {
        include: {
          member: {
            select: {
              id: true,
              username: true,
              departmentId: true,
              profile: {
                select: {
                  fullName: true,
                },
              },
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          username: true,
          profile: {
            select: { fullName: true },
          },
          role: true,
        },
      },
    },
    orderBy: [
      { createdAt: "desc" },
      { title: "asc" },
    ],
  })
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await requireProjectMembership(params.projectId, user.id)
  } catch (error) {
    const message = (error as Error).message === "not_found" ? "Not found" : "Forbidden"
    return NextResponse.json({ error: message }, { status: 404 })
  }

  const tasks = await fetchTasks(params.projectId)
  return NextResponse.json(tasks.map(serializeTask))
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let membership: Awaited<ReturnType<typeof requireProjectMembership>> | null = null
  try {
    membership = await requireProjectMembership(params.projectId, user.id)
  } catch (error) {
    const message = (error as Error).message === "not_found" ? "Not found" : "Forbidden"
    return NextResponse.json({ error: message }, { status: 404 })
  }
  if (!membership) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const payload = await request.json().catch(() => null)
  const title = typeof payload?.title === "string" ? payload.title.trim() : ""
  const detail =
    typeof payload?.detail === "string" && payload.detail.trim().length > 0
      ? payload.detail.trim()
      : null
  const departmentId =
    typeof payload?.departmentId === "string" && payload.departmentId.trim().length > 0
      ? payload.departmentId
      : null
  const assigneeIds = Array.isArray(payload?.assigneeIds)
    ? payload.assigneeIds.filter((value: unknown): value is string => typeof value === "string")
    : []
  const statusRaw =
    typeof payload?.status === "string" ? payload.status.toUpperCase() : "SUBMITTED"
  const status = TASK_STATUS_VALUES.includes(statusRaw as TaskStatusEnum)
    ? (statusRaw as TaskStatusEnum)
    : "SUBMITTED"
  const startDate = parseDeadlineInput(payload?.startDate)
  const dueDate = parseDeadlineInput(payload?.deadline)
  const cardColor = parseCardColor(payload?.cardColor) ?? DEFAULT_TASK_CARD_COLOR
  const cardTextColor = resolveCardTextColor(cardColor)

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  if (departmentId) {
    const department = await prisma.projectDepartment.findFirst({
      where: { id: departmentId, projectId: params.projectId },
      select: { id: true },
    })
    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 })
    }
  }

  if (assigneeIds.length > 0) {
    const members = await projectMembers.findMany({
      where: {
        id: {
          in: assigneeIds,
        },
        projectId: params.projectId,
      },
      select: { id: true },
    })
    if (members.length !== assigneeIds.length) {
      return NextResponse.json({ error: "One or more assignees are invalid" }, { status: 400 })
    }
  }

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.projectTask.create({
      data: {
        projectId: params.projectId,
        departmentId,
        createdByMemberId: membership.id,
        title,
        detail,
        status,
        startDate,
        dueDate,
        cardColor,
        cardTextColor,
      },
    })

    if (assigneeIds.length > 0) {
      await tx.projectTaskAssignee.createMany({
        data: assigneeIds.map((memberId: string) => ({
          taskId: created.id,
          memberId,
        })),
      })
    }

    return tx.projectTask.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            color: true,
            textColor: true,
          },
        },
        assignees: {
          include: {
            member: {
              select: {
                id: true,
                username: true,
                departmentId: true,
                profile: {
                  select: { fullName: true },
                },
              },
            },
          },
    },
    createdBy: {
      select: {
        id: true,
        username: true,
        profile: {
          select: { fullName: true },
        },
      },
    },
  },
    })
  })

  return NextResponse.json(serializeTask(task))
}
