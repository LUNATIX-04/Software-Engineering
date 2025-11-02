"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TaskForm, type TaskFormValues } from "@/components/tasks"
import { DEFAULT_TASKS, type TaskRecord } from "../../data"

type EditTaskPageProps = {
  params: Promise<{
    projectId: string
    taskId: string
  }>
}

export default function EditTaskPage({ params }: EditTaskPageProps) {
  const { projectId, taskId } = React.use(params)
  const router = useRouter()

  const task = React.useMemo<TaskRecord | null>(() => {
    return DEFAULT_TASKS.find((item) => item.id === taskId) ?? null
  }, [taskId])

  const [saving, setSaving] = React.useState(false)

  const initialValues = React.useMemo<TaskFormValues | null>(() => {
    if (!task) {
      return null
    }
    return {
      title: task.title,
      detail: task.description ?? "",
      assignees: task.assignees.length > 0 ? [...task.assignees] : [],
      deadline: task.deadline ?? "DD/MM/YYYY",
      status: task.status,
    }
  }, [task])

  const handleSave = React.useCallback(
    async (values: TaskFormValues) => {
      setSaving(true)
      try {
        console.info("Would save task", {
          projectId,
          taskId,
          ...values,
        })
      } finally {
        setSaving(false)
      }
    },
    [projectId, taskId]
  )

  if (!task || !initialValues) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <p className="text-xl font-semibold text-primary">Task not found.</p>
        <Button onClick={() => router.push(`/projects/${projectId}/task`)} className="rounded-full px-6">
          Back to tasks
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-[clamp(1.5rem,3vw,3.5rem)] pb-16 pt-6">
      <header className="flex items-center gap-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="size-12 rounded-full border border-primary/30 bg-[#E9E0FF] text-primary shadow-[0_6px_0_rgba(144,122,214,0.25)] hover:border-primary hover:text-primary"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5" />
        </Button>
      </header>

      <TaskForm
        heading="Edit Task"
        submitLabel={saving ? "Saving…" : "Save"}
        initialValues={initialValues}
        submitting={saving}
        onSubmit={handleSave}
      />
    </div>
  )
}
