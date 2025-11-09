"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { TaskForm, type TaskAssigneeOption, type TaskFormValues } from "@/components/tasks"
import { DEFAULT_TASK_CARD_COLOR } from "@/constants/task-colors"
import { useNotifications } from "@/components/notifications/Notification"

const now = new Date()
const defaultStartDateText = format(now, "dd/MM/yyyy HH:mm")
const tomorrowStart = new Date(now)
tomorrowStart.setDate(tomorrowStart.getDate() + 1)
tomorrowStart.setHours(0, 0, 0, 0)
const defaultDeadlineText = format(tomorrowStart, "dd/MM/yyyy HH:mm")

const DEFAULT_VALUES: TaskFormValues = {
  title: "",
  detail: "",
  assigneeIds: [],
  startDate: defaultStartDateText,
  deadline: defaultDeadlineText,
  status: "IN_PROGRESS",
  cardColor: DEFAULT_TASK_CARD_COLOR,
}

type CreateTaskPageProps = {
  params: Promise<{
    projectId: string
  }>
}

export default function CreateTaskPage({ params }: CreateTaskPageProps) {
  const { projectId } = React.use(params)
  const router = useRouter()
  const [submitting, setSubmitting] = React.useState(false)
  const { notify } = useNotifications()
  const [memberOptions, setMemberOptions] = React.useState<TaskAssigneeOption[]>([])
  const [formLoading, setFormLoading] = React.useState(true)
  const [formError, setFormError] = React.useState<string | null>(null)

  const loadFormData = React.useCallback(async () => {
    if (!projectId) {
      return
    }
    setFormLoading(true)
    setFormError(null)
    try {
      const membersResponse = await fetch(`/api/projects/${projectId}/members`, {
        cache: "no-store",
      })

      if (membersResponse.status === 404) {
        throw new Error("Not found")
      }
      if (!membersResponse.ok) {
        throw new Error("Failed to load form data")
      }

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
      setFormError("Unable to load task form data")
    } finally {
      setFormLoading(false)
    }
  }, [projectId])

  React.useEffect(() => {
    loadFormData()
  }, [loadFormData])

  const handleSubmit = async (values: TaskFormValues) => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })
      //alert(response.body)
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message =
          typeof payload?.error === "string" ? payload.error : "Failed to create task"
        throw new Error(message)
      }
      router.push(`/projects/${projectId}/task`)
    } catch (error) {
      console.error(error)
      notify({
        title: "Create task failed",
        description: error instanceof Error ? error.message : "Unable to create task",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

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
            onClick={handleBackClick}
            className="inline-flex size-12 items-center justify-center rounded-full border border-primary/20 bg-white text-primary shadow-sm transition hover:border-primary/40 hover:bg-primary/10 focus-visible:border-primary focus-visible:ring-0"
            aria-label="Back to projects"
          >
            <ArrowLeft className="size-6" aria-hidden="true" />
          </Button>
        </div>
        {formLoading ? (
          <div className="mx-0 flex-1 rounded-[2rem] border-2 border-dashed border-primary/30 bg-white/60 px-6 py-10 text-center text-primary">
            Loading form…
          </div>
        ) : formError ? (
          <div className="mx-0 flex-1 rounded-[2rem] border-2 border-destructive/30 bg-destructive/10 px-6 py-10 text-center text-destructive">
            {formError}
          </div>
        ) : (
          <div className="mx-0 flex-1 lg:mt-10 ml-0 lg:ml-13 mb-10">
            <TaskForm
              className="w-full"
              heading="Create Task"
              submitLabel={submitting ? "Creating…" : "Create"}
              initialValues={DEFAULT_VALUES}
              submitting={submitting}
              showStatus={false}
              onSubmit={handleSubmit}
              assigneeOptions={memberOptions}
            />
          </div>
        )}
      </div>
    </div>
  )
}
