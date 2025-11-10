"use client"

import * as React from "react"
import { CalendarBody } from "@/modules/components/calendar/calendar-body"
import { CalendarProvider } from "@/modules/components/calendar/contexts/calendar-context"
import { DndProvider } from "@/modules/components/calendar/contexts/dnd-context"
import { CalendarHeader } from "@/modules/components/calendar/header/calendar-header"
import { fetchProjectTasks } from "@/utils/projects/api"
import type { TaskRecord, TaskStatus } from "@/app/projects/[projectId]/task/data"
import type { IEvent, IUser } from "@/modules/components/calendar/interfaces"
import type { TEventColor } from "@/modules/components/calendar/types"

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
        name: userSource.fullName ?? userSource.username ?? "Member",
        picturePath: null,
      },
      taskId: task.id,
      projectId,
      status: task.status,
      accentColor: task.cardColor,
      accentTextColor: task.cardTextColor,
    }
  })
}

function mapTasksToUsers(tasks: TaskRecord[]): IUser[] {
  const unique = new Map<string, IUser>()

  const addUser = (id: string, name: string | null) => {
    if (!unique.has(id)) {
      unique.set(id, { id, name: name ?? "Member", picturePath: null })
    }
  }

  tasks.forEach((task) => {
    addUser(task.createdBy.id, task.createdBy.fullName ?? task.createdBy.username)
    task.assignees.forEach((assignee) => {
      addUser(assignee.id, assignee.fullName ?? assignee.username)
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

  return (
    <div className="flex flex-col gap-3">
      {loading && (
        <div className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Loading tasks…
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-destructive/60 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <CalendarProvider events={events} users={users} view="month" projectId={projectId}>
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
