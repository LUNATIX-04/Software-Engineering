"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { ProgressBar } from "@/components/ui/progress-bar"
import { TaskForm, type TaskFormValues } from "@/components/tasks"
import { DEFAULT_TASK_CARD_COLOR } from "@/constants/task-colors"
import { useNotifications } from "@/components/notifications/Notification"
import { PROJECT_REFRESH_EVENT } from "@/constants/events"

import { createProjectTask, useTaskFormData } from "./hooks/useTaskFormData"

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
  const { memberOptions, loading: formLoading, error: formError } = useTaskFormData(projectId)

  const handleSubmit = async (values: TaskFormValues) => {
    if (!projectId) {
      notify({
        title: "Create task failed",
        description: "Project ID is missing.",
        variant: "destructive",
      })
      return
    }
    setSubmitting(true)
    try {
      await createProjectTask(projectId, values)
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(PROJECT_REFRESH_EVENT, { detail: { projectId } })
        )
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
      <div className="flex w-full max-w-full flex-col items-start gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="sticky top-1 z-10 -ml-3 flex flex-shrink-0 items-start justify-start lg:-mt-0">
          <Button
            type="button"
            variant="ghost"
            data-cy="project-task-create-back-button"
            onClick={handleBackClick}
            className="inline-flex size-12 items-center justify-center rounded-full border border-primary/20 bg-white text-primary shadow-sm transition hover:border-primary/40 hover:bg-primary/10 focus-visible:border-primary focus-visible:ring-0"
            aria-label="Back to projects"
          >
            <ArrowLeft className="size-6" aria-hidden="true" />
          </Button>
        </div>
        <div className="mx-0 flex-1">
          {formLoading ? (
            <div className="rounded-[2rem] border-2 border-dashed border-primary/30 bg-white/60 px-6 py-10 text-center text-primary">
              <div className="flex flex-col items-center gap-3">
                <span className="text-base font-semibold">Loading form…</span>
                <ProgressBar className="max-w-md" />
              </div>
            </div>
          ) : formError ? (
            <div className="rounded-[2rem] border-2 border-destructive/30 bg-destructive/10 px-6 py-10 text-center text-destructive">
              {formError}
            </div>
          ) : (
            <div className="lg:mt-10 mb-10 form-entry">
              <TaskForm
                className="w-full"
                heading="Create Task"
                submitLabel={submitting ? "Creating…" : "Create"}
                initialValues={DEFAULT_VALUES}
                submitting={submitting}
                onSubmit={handleSubmit}
                assigneeOptions={memberOptions}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
