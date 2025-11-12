"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { TaskForm, type TaskAssigneeOption, type TaskFormValues } from "@/components/tasks"
import { DEFAULT_TASK_CARD_COLOR } from "@/constants/task-colors"
import { useNotifications } from "@/components/notifications/Notification"
import { PROJECT_REFRESH_EVENT } from "@/constants/events"

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

      const deadlineText = (() => {
        if (!task.dueDate) {
          return ""
        }
        const date = new Date(task.dueDate)
        const base = format(date, "dd/MM/yyyy")
        const hasTime = date.getUTCHours() !== 0 || date.getUTCMinutes() !== 0
        return hasTime ? `${base} ${format(date, "HH:mm")}` : base
      })()
      const startDateText = task.startDate
        ? format(new Date(task.startDate), "dd/MM/yyyy")
        : ""

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
      setSaving(true)
      try {
        const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          const message =
            typeof payload?.error === "string" ? payload.error : "Failed to save task"
          throw new Error(message)
        }
        notify({
          title: "Task updated",
          description: "Your changes have been saved.",
        })
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(PROJECT_REFRESH_EVENT, { detail: { projectId } })
          )
        }
        router.push(`/projects/${projectId}/task`)
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
        {formLoading ? (
          <div className="mx-0 flex-1 rounded-[2rem] border-2 border-dashed border-primary/30 bg-white/60 px-6 py-10 text-center text-primary">
            Loading task…
          </div>
        ) : formError ? (
          <div className="mx-0 flex-1 rounded-[2rem] border-2 border-destructive/30 bg-destructive/10 px-6 py-10 text-center text-destructive">
            {formError}
          </div>
        ) : initialValues ? (
          <div className="mx-0 flex-1 lg:mt-10 mb-10 w-full">
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
          <div className="mx-0 flex-1 rounded-[2rem] border-2 border-destructive/30 bg-destructive/10 px-6 py-10 text-center text-destructive">
            Task not found.
          </div>
        )}
      </div>
    </div>
  )
}
