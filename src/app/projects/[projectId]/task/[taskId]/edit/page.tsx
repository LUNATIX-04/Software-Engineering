"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ProgressBar } from "@/components/ui/progress-bar"
import { TaskForm, type TaskAssigneeOption, type TaskFormValues } from "@/components/tasks"
import { DEFAULT_TASK_CARD_COLOR } from "@/constants/task-colors"
import { useNotifications } from "@/components/notifications/Notification"
import { PROJECT_REFRESH_EVENT } from "@/constants/events"

const padTwoDigits = (value: number) => String(value).padStart(2, "0")

const parseIsoDate = (value?: string | null) => {
  if (!value) {
    return null
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

const formatUtcDate = (value?: string | null) => {
  const parsed = parseIsoDate(value)
  if (!parsed) {
    return ""
  }
  const day = padTwoDigits(parsed.getUTCDate())
  const month = padTwoDigits(parsed.getUTCMonth() + 1)
  const year = parsed.getUTCFullYear()
  return `${day}/${month}/${year}`
}

const formatUtcDateTime = (value?: string | null) => {
  const parsed = parseIsoDate(value)
  if (!parsed) {
    return ""
  }
  const hasTime = parsed.getUTCHours() !== 0 || parsed.getUTCMinutes() !== 0
  const datePart = `${padTwoDigits(parsed.getUTCDate())}/${padTwoDigits(
    parsed.getUTCMonth() + 1
  )}/${parsed.getUTCFullYear()}`
  if (!hasTime) {
    return datePart
  }
  const hour = padTwoDigits(parsed.getUTCHours())
  const minute = padTwoDigits(parsed.getUTCMinutes())
  return `${datePart} ${hour}:${minute}`
}

type EditTaskPageProps = {
  params: Promise<{
    projectId: string
    taskId: string
  }>
}

export default function EditTaskPage({ params }: EditTaskPageProps) {
  const { projectId, taskId } = React.use(params)
  const router = useRouter()
  const { notify } = useNotifications()
  const [saving, setSaving] = React.useState(false)
  const [initialValues, setInitialValues] = React.useState<TaskFormValues | null>(null)
  const [memberOptions, setMemberOptions] = React.useState<TaskAssigneeOption[]>([])
  const [formLoading, setFormLoading] = React.useState(true)
  const [formError, setFormError] = React.useState<string | null>(null)

  const loadFormData = React.useCallback(async () => {
    setFormLoading(true)
    setFormError(null)
    try {
      const [taskResponse, membersResponse] = await Promise.all([
        fetch(`/api/projects/${projectId}/tasks/${taskId}`, { cache: "no-store" }),
        fetch(`/api/projects/${projectId}/members`, { cache: "no-store" }),
      ])

      if (taskResponse.status === 404) {
        throw new Error("Not found")
      }
      if (!taskResponse.ok || !membersResponse.ok) {
        throw new Error("Failed to load task")
      }

      const task = (await taskResponse.json()) as {
        id: string
        title: string
        detail: string | null
        status: TaskFormValues["status"]
        dueDate: string | null
        startDate: string | null
        assignees: Array<{ id: string; username: string; fullName: string | null }>
        department: { id: string; name: string } | null
        cardColor: string
      }

      const deadlineText = formatUtcDateTime(task.dueDate)
      const startDateText = task.startDate ? formatUtcDate(task.startDate) : ""

      setInitialValues({
        title: task.title,
        detail: task.detail ?? "",
        assigneeIds: task.assignees.map((assignee) => assignee.id),
        startDate: startDateText,
        deadline: deadlineText,
        status: task.status,
        cardColor: task.cardColor ?? DEFAULT_TASK_CARD_COLOR,
      })

      const members = (await membersResponse.json()) as Array<{
        id: string
        username: string
        fullName: string | null
        role: string
        department: {
          id: string
          name: string
          color: string
          textColor: string
        } | null
      }>
      setMemberOptions(
        members.map((member) => ({
          id: member.id,
          label: member.username || member.fullName || "Member",
          username: member.username,
          fullName: member.fullName,
          role: member.role,
          departmentName: member.department?.name ?? null,
          departmentColor: member.department?.color ?? null,
          departmentTextColor: member.department?.textColor ?? null,
        }))
      )
    } catch (error) {
      console.error(error)
      setFormError(error instanceof Error ? error.message : "Failed to load task")
    } finally {
      setFormLoading(false)
    }
  }, [projectId, taskId])

  React.useEffect(() => {
    loadFormData()
  }, [loadFormData])

  const handleSave = React.useCallback(
    async (values: TaskFormValues) => {
      const normalizedAssignees = values.assigneeIds.filter(Boolean)
      if (normalizedAssignees.length === 0) {
        notify({
          title: "Update failed",
          description: "Assign at least one member before saving changes.",
          variant: "destructive",
        })
        return
      }
      setSaving(true)
      try {
        const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...values, assigneeIds: normalizedAssignees }),
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          const message =
            typeof payload?.error === "string" ? payload.error : "Failed to save task"
          throw new Error(message)
        }
        const taskTitle = values.title.trim() || "Task"
        notify({
          title: "Task updated",
          description: `Updates to “${taskTitle}” are saved.`,
        })
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(PROJECT_REFRESH_EVENT, { detail: { projectId } })
          )
        }
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back()
        } else {
          router.push(`/projects/${projectId}/task`)
        }
      } catch (error) {
        console.error(error)
        notify({
          title: "Update failed",
          description: error instanceof Error ? error.message : "Unable to update task",
          variant: "destructive",
        })
      } finally {
        setSaving(false)
      }
    },
    [notify, projectId, router, taskId]
  )

  const handleBackClick = React.useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
      return
    }
    router.push(`/projects/${projectId}/task`)
  }, [projectId, router])

  return (
    <div className="asap-scroll w-full min-h-[calc(100vh-6.5rem)] px-[clamp(3.25rem,4vw,3.25rem)] pt-3">
      <div className="flex w-full max-w-7xl flex-col items-start gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="sticky top-1 z-10 -ml-3 flex flex-shrink-0 items-start justify-start lg:-mt-0">
          <Button
            type="button"
            variant="ghost"
            data-cy="project-task-edit-back-button"
            onClick={handleBackClick}
            className="inline-flex size-12 items-center justify-center rounded-full border border-primary/20 bg-white text-primary shadow-sm transition hover:border-primary/40 hover:bg-primary/10 focus-visible:border-primary focus-visible:ring-0"
            aria-label="Back to tasks"
          >
            <ArrowLeft className="size-6" aria-hidden="true" />
          </Button>
        </div>
        <div className="mx-0 flex-1">
          {formLoading ? (
            <div className="rounded-[2rem] border-2 border-dashed border-primary/30 bg-white/60 px-6 py-10 text-center text-primary">
              <div className="flex flex-col items-center gap-3">
                <span className="text-base font-semibold">Loading task…</span>
                <div className="w-full max-w-sm">
                  <ProgressBar />
                </div>
              </div>
            </div>
          ) : formError ? (
            <div className="rounded-[2rem] border-2 border-destructive/30 bg-destructive/10 px-6 py-10 text-center text-destructive">
              {formError}
            </div>
          ) : initialValues ? (
            <div className="lg:mt-10 mb-10 w-full form-entry">
              <TaskForm
                className="w-full"
                heading="Edit Task"
                submitLabel={saving ? "Saving…" : "Save"}
                initialValues={initialValues}
                submitting={saving}
                onSubmit={handleSave}
                assigneeOptions={memberOptions}
              />
            </div>
          ) : (
            <div className="rounded-[2rem] border-2 border-destructive/30 bg-destructive/10 px-6 py-10 text-center text-destructive">
              Task not found.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
