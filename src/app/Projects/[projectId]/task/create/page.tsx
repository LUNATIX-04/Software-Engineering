"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TaskForm, type TaskFormValues } from "@/components/tasks"

const DEFAULT_VALUES: TaskFormValues = {
  title: "",
  detail: "",
  assignees: ["Member"],
  deadline: "DD/MM/YYYY",
  status: "in-progress",
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

  const handleSubmit = async (values: TaskFormValues) => {
    setSubmitting(true)
    try {
      console.info("Creating task", { projectId, values })
      router.push(`/projects/${projectId}/task`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-[clamp(1.5rem,3vw,3.5rem)] pb-16 pt-6">
      <header className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="size-12 rounded-full border border-primary/30 bg-white text-primary shadow-[0_6px_0_rgba(144,122,214,0.2)] hover:border-primary hover:text-primary"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5" />
        </Button>
      </header>

      <TaskForm
        heading="Create New Task"
        submitLabel={submitting ? "Creating…" : "Create"}
        initialValues={DEFAULT_VALUES}
        submitting={submitting}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
