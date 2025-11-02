"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DEFAULT_TASKS,
  TASK_STATUS_LABEL,
  type TaskRecord,
  type TaskStatus,
} from "../data"

type TaskDetailPageProps = {
  params: Promise<{
    projectId: string
    taskId: string
  }>
}

export default function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { projectId, taskId } = React.use(params)
  const router = useRouter()

  const task = React.useMemo<TaskRecord | null>(() => {
    return DEFAULT_TASKS.find((item) => item.id === taskId) ?? null
  }, [taskId])

  const [status, setStatus] = React.useState<TaskStatus>(task?.status ?? "in-progress")
  const [description, setDescription] = React.useState(task?.description ?? "")

  const handleSave = () => {
    // Placeholder persistence stub
    console.info("Would save task", {
      taskId,
      status,
      description,
    })
  }

  if (!task) {
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
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-[clamp(1.5rem,3vw,3.5rem)] pb-16 pt-6">
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

      <section className="relative flex flex-col gap-6 rounded-[3.5rem] border-2 border-primary/40 bg-white/90 px-10 pb-10 pt-14 shadow-[0_18px_0_rgba(144,122,214,0.15)]">
        <div className="absolute -top-8 left-10 rounded-[2.5rem] border-2 border-primary/40 bg-[#E9E0FF] px-10 py-4 text-xl font-bold text-[#2F2766] shadow-[0_10px_0_rgba(144,122,214,0.15)]">
          {task.title}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-[#2F2766]">Task Description</h2>
          <div className="rounded-[2.5rem] border-2 border-primary/30 bg-[#F6F0FF] px-6 py-5">
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Task Detail"
              className="h-40 w-full resize-none rounded-[1.75rem] border-2 border-primary/20 bg-white/80 px-5 py-4 text-sm text-[#2F2766] outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="space-y-4 text-[#2F2766]">
          <p className="text-base font-semibold">
            Assigned To :
            <span className="font-normal">
              {task.assignees.length > 0 ? ` ${task.assignees.join(", ")}` : " —"}
            </span>
          </p>
          <p className="text-base font-semibold">
            Deadline Date : <span className="font-normal">{task.deadline}</span>
          </p>
          <div className="flex flex-col gap-3">
            <span className="text-base font-semibold">Task Status :</span>
            <div className="max-w-xs">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as TaskStatus)}
                className="w-full appearance-none rounded-full border-2 border-primary/40 bg-white px-5 py-3 text-sm font-semibold text-primary shadow-[0_6px_0_rgba(144,122,214,0.2)] focus:border-primary focus:outline-none"
              >
                {Object.entries(TASK_STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleSave}
            className="inline-flex h-12 items-center rounded-full bg-[#3F3478] px-8 text-base font-semibold text-white shadow-[0_6px_0_rgba(63,52,120,0.3)] transition hover:bg-[#2F2766]"
          >
            Save
          </Button>
        </div>
      </section>
    </div>
  )
}
