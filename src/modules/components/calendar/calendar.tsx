"use client"

import * as React from "react"
import { CalendarBody } from "@/modules/components/calendar/calendar-body"
import { CalendarProvider } from "@/modules/components/calendar/contexts/calendar-context"
import { DndProvider } from "@/modules/components/calendar/contexts/dnd-context"
import { CalendarHeader } from "@/modules/components/calendar/header/calendar-header"
import {
  fetchProjectMembership,
  fetchProjectTasks,
} from "@/utils/projects/api"
import type { TaskRecord, TaskStatus } from "@/app/projects/[projectId]/task/data"
import type { IEvent, IUser } from "@/modules/components/calendar/interfaces"
import type { TEventColor } from "@/modules/components/calendar/types"
import { PROJECT_ROLE, type ProjectRole } from "@/types/projects"

const STATUS_COLOR_MAP: Record<TaskStatus, TEventColor> = {
  SUBMITTED: "purple",
  IN_PROGRESS: "blue",
  BLOCKED: "red",
}

const DEFAULT_EVENT_COLOR: TEventColor = "blue"

function toEventId(taskId: string) {
  let hash = 0
  for (let i = 0; i < taskId.length; i += 1) {
    hash = (hash * 31 + taskId.charCodeAt(i)) & 0xffffffff
  }
  return Math.abs(hash)
}

function resolveDate(value: string | null, fallback?: string) {
  if (value) {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }
  if (fallback) {
    const parsed = new Date(fallback)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }
  return new Date()
}

function mapTasksToEvents(tasks: TaskRecord[], projectId: string): IEvent[] {
  return tasks.map((task) => {
    const startDate = resolveDate(task.startDate, task.createdAt)
    const endDate = resolveDate(task.dueDate, task.startDate ?? task.createdAt)
    const userSource = task.assignees[0] ?? task.createdBy
    const avatarUrl = userSource.avatarUrl ?? null
    const color = STATUS_COLOR_MAP[task.status] ?? DEFAULT_EVENT_COLOR
    return {
      id: toEventId(task.id),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      title: task.title,
      description: task.detail ?? "No description provided.",
      color,
      user: {
        id: userSource.id,
        name: userSource.username ?? userSource.fullName ?? "Member",
        picturePath: avatarUrl,
      },
      taskId: task.id,
      projectId,
      status: task.status,
      accentColor: task.cardColor,
      accentTextColor: task.cardTextColor,
      departmentId: task.department?.id ?? null,
      departmentName: task.department?.name ?? null,
      departmentColor: task.department?.color ?? null,
      departmentTextColor: task.department?.textColor ?? null,
    }
  })
}

function mapTasksToUsers(tasks: TaskRecord[]): IUser[] {
  const unique = new Map<string, IUser>()

  const addUser = (id: string, username: string | null, nameHint: string | null, picturePath: string | null) => {
    if (!unique.has(id)) {
      unique.set(id, { id, name: username ?? nameHint ?? "Member", picturePath })
      return
    }
    if (!unique.get(id)?.picturePath && picturePath) {
      unique.set(id, { ...unique.get(id)!, picturePath })
    }
  }

  tasks.forEach((task) => {
    addUser(
      task.createdBy.id,
      task.createdBy.username,
      task.createdBy.fullName,
      task.createdBy.avatarUrl ?? null
    )
    task.assignees.forEach((assignee) => {
      addUser(assignee.id, assignee.username, assignee.fullName, assignee.avatarUrl ?? null)
    })
  })

  return Array.from(unique.values())
}

type CalendarProps = {
  projectId: string
}

export function Calendar({ projectId }: CalendarProps) {
  const [events, setEvents] = React.useState<IEvent[]>([])
  const [users, setUsers] = React.useState<IUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [membershipRole, setMembershipRole] = React.useState<ProjectRole | null>(
    null,
  )
  const [membershipLoading, setMembershipLoading] = React.useState(true)

  React.useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    fetchProjectTasks(projectId)
      .then((tasks) => {
        if (!active) return
        setEvents(mapTasksToEvents(tasks, projectId))
        setUsers(mapTasksToUsers(tasks))
      })
      .catch((fetchError) => {
        if (!active) return
        console.error(fetchError)
        setError(
          fetchError instanceof Error ? fetchError.message : "Unable to load tasks"
        )
        setEvents([])
        setUsers([])
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [projectId])

  React.useEffect(() => {
    let active = true
    if (!projectId) {
      if (active) {
        setMembershipRole(null)
        setMembershipLoading(false)
      }
      return
    }
    setMembershipLoading(true)
    fetchProjectMembership(projectId)
      .then((membership) => {
        if (!active) return
        setMembershipRole(membership.role)
      })
      .catch(() => {
        if (!active) return
        setMembershipRole(null)
      })
      .finally(() => {
        if (!active) return
        setMembershipLoading(false)
      })
    return () => {
      active = false
    }
  }, [projectId])

  const canCreateTasks =
    !membershipLoading && membershipRole !== PROJECT_ROLE.MEMBER

  return (
    <div className="flex flex-col gap-3" data-cy="project-calendar-root">
      {loading && (
        <div
          className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground"
          data-cy="project-calendar-loading"
        >
          Loading tasks…
        </div>
      )}
      {error && (
        <div
          className="rounded-2xl border border-destructive/60 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          data-cy="project-calendar-error"
        >
          {error}
        </div>
      )}
      <CalendarProvider
        events={events}
        users={users}
        view="month"
        projectId={projectId}
        canCreateTasks={canCreateTasks}
      >
        <DndProvider showConfirmation={false}>
          <div className="w-full border rounded-xl">
            <CalendarHeader />
            <CalendarBody />
          </div>
        </DndProvider>
      </CalendarProvider>
    </div>
  )
}
