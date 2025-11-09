import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

import { createClient } from "@/utils/supabase/server"
import { prisma } from "@/lib/prisma"
import { requireProjectMembership } from "@/server/projects/permissions"
import { projectMembers, projectTaskAssignees, projectTasks } from "@/server/projects/db"

type RouteParams = {
  params: {
    projectId: string
    taskId: string
  }
}

const TASK_STATUS_VALUES = ["SUBMITTED", "IN_PROGRESS", "BLOCKED"] as const
type TaskStatusEnum = (typeof TASK_STATUS_VALUES)[number]

type TaskWithRelations = NonNullable<Awaited<ReturnType<typeof loadTask>>>

async function loadTask(projectId: string, taskId: string) {
  return projectTasks.findFirst({
    where: { id: taskId, projectId },
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
          role: true,
        },
      },
    },
  })
}

function serializeTask(task: TaskWithRelations) {
  return {
    id: task.id,
    title: task.title,
    detail: task.detail,
    status: task.status,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
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

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min
  }
  return Math.min(max, Math.max(min, value))
}

function parseDeadlineInput(value: unknown): Date | null | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === null) {
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

async function ensurePermission(projectId: string, userId: string, taskId: string) {
  const membership = await requireProjectMembership(projectId, userId)
  const task = await loadTask(projectId, taskId)
  if (!task) {
    throw new Error("not_found")
  }
  const canManage =
    membership.role === "OWNER" ||
    membership.role === "HEADER" ||
    task.createdByMemberId === membership.id

  if (!canManage) {
    throw new Error("forbidden")
  }

  return { membership, task }
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
    const membership = await requireProjectMembership(params.projectId, user.id)
    const task = await loadTask(params.projectId, params.taskId)
    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return NextResponse.json(serializeTask(task))
  } catch (error) {
    const message = (error as Error).message === "not_found" ? "Not found" : "Forbidden"
    return NextResponse.json({ error: message }, { status: 404 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await ensurePermission(params.projectId, user.id, params.taskId)
  } catch (error) {
    const message = (error as Error).message === "not_found" ? "Not found" : "Forbidden"
    return NextResponse.json({ error: message }, { status: 404 })
  }

  const payload = await request.json().catch(() => null)
  const title =
    typeof payload?.title === "string" && payload.title.trim().length > 0
      ? payload.title.trim()
      : undefined
  const detail =
    typeof payload?.detail === "string"
      ? payload.detail.trim() || null
      : undefined
  const departmentId =
    Object.prototype.hasOwnProperty.call(payload ?? {}, "departmentId") && payload?.departmentId === null
      ? null
      : typeof payload?.departmentId === "string"
        ? payload.departmentId
        : undefined
  const statusRaw =
    typeof payload?.status === "string" ? payload.status.toUpperCase() : undefined
  const status =
    statusRaw && TASK_STATUS_VALUES.includes(statusRaw as TaskStatusEnum)
      ? (statusRaw as TaskStatusEnum)
      : undefined
  const dueDate = parseDeadlineInput(payload?.deadline)
  const assigneeIds = Array.isArray(payload?.assigneeIds)
    ? payload.assigneeIds.filter((value: unknown): value is string => typeof value === "string")
    : undefined

  const updatePayload: Prisma.ProjectTaskUncheckedUpdateInput = {}
  if (title !== undefined) {
    updatePayload.title = title
  }
  if (detail !== undefined) {
    updatePayload.detail = detail
  }
  if (status !== undefined) {
    updatePayload.status = status
  }
  if (dueDate !== undefined) {
    updatePayload.dueDate = dueDate
  }
  if (departmentId !== undefined) {
    if (departmentId === null) {
      updatePayload.departmentId = null
    } else {
      const department = await prisma.projectDepartment.findFirst({
        where: { id: departmentId, projectId: params.projectId },
        select: { id: true },
      })
      if (!department) {
        return NextResponse.json({ error: "Department not found" }, { status: 404 })
      }
      updatePayload.departmentId = departmentId
    }
  }

  if (Object.keys(updatePayload).length === 0 && assigneeIds === undefined) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 })
  }

  if (assigneeIds !== undefined) {
    if (assigneeIds.length > 0) {
      const members = await projectMembers.findMany({
        where: {
          id: { in: assigneeIds },
          projectId: params.projectId,
        },
        select: { id: true },
      })
      if (members.length !== assigneeIds.length) {
        return NextResponse.json({ error: "One or more assignees are invalid" }, { status: 400 })
      }
    }
  }

  const task = await prisma.$transaction(async (tx) => {
    if (Object.keys(updatePayload).length > 0) {
      await tx.projectTask.update({
        where: { id: params.taskId },
        data: updatePayload,
      })
    }
    if (assigneeIds !== undefined) {
      await tx.projectTaskAssignee.deleteMany({
        where: { taskId: params.taskId },
      })
      if (assigneeIds.length > 0) {
        await tx.projectTaskAssignee.createMany({
          data: assigneeIds.map((memberId: string) => ({
            taskId: params.taskId,
            memberId,
          })),
        })
      }
    }

    return loadTask(params.projectId, params.taskId)
  })

  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(serializeTask(task))
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await ensurePermission(params.projectId, user.id, params.taskId)
  } catch (error) {
    const message = (error as Error).message === "not_found" ? "Not found" : "Forbidden"
    return NextResponse.json({ error: message }, { status: 404 })
  }

  await projectTaskAssignees.deleteMany({
    where: { taskId: params.taskId },
  })
  await projectTasks.delete({
    where: { id: params.taskId },
  })

  return NextResponse.json({ success: true })
}
