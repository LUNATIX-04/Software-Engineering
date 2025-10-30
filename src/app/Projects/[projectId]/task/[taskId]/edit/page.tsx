"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowLeft, Calendar, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DEFAULT_TASKS,
  TASK_STATUS_LABEL,
  type TaskRecord,
  type TaskStatus,
} from "../../data"

type EditTaskPageProps = {
  params: Promise<{
    projectId: string
    taskId: string
  }>
}

const ASSIGNEE_OPTIONS = ["Member", "Username 1", "Username 2", "Username 3"]

export default function EditTaskPage({ params }: EditTaskPageProps) {
  const { projectId, taskId } = React.use(params)
  const router = useRouter()

  const task = React.useMemo<TaskRecord | null>(() => {
    return DEFAULT_TASKS.find((item) => item.id === taskId) ?? null
  }, [taskId])

  const [title, setTitle] = React.useState(task?.title ?? "")
  const [description, setDescription] = React.useState(task?.description ?? "")
  const [assignee, setAssignee] = React.useState(task?.assignee ?? ASSIGNEE_OPTIONS[0])
  const [deadline, setDeadline] = React.useState(task?.deadline ?? "DD/MM/YYYY")
  const [status, setStatus] = React.useState<TaskStatus>(task?.status ?? "in-progress")

  const handleSave = () => {
    console.info("Would save task", {
      projectId,
      taskId,
      title,
      description,
      assignee,
      deadline,
      status,
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

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="flex flex-col gap-6 rounded-[3.5rem] border-2 border-primary/40 bg-white/90 px-10 pb-10 pt-10 shadow-[0_18px_0_rgba(144,122,214,0.15)]">
          <h1 className="text-2xl font-bold text-[#2F2766]">Edit Task</h1>

          <label className="flex flex-col gap-3 text-sm font-semibold text-[#2F2766]">
            Task Title
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Task Title"
              className="h-12 rounded-full border-2 border-primary/40 bg-white px-5 text-base font-medium text-[#2F2766] shadow-[0_6px_0_rgba(144,122,214,0.2)] focus:border-primary focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-3 text-sm font-semibold text-[#2F2766]">
            Add detail
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add detail"
              className="h-36 resize-none rounded-[2.25rem] border-2 border-primary/30 bg-white px-5 py-4 text-sm font-medium text-[#2F2766] shadow-[0_6px_0_rgba(144,122,214,0.15)] focus:border-primary focus:outline-none"
            />
          </label>

          <div className="space-y-3 text-sm font-semibold text-[#2F2766]">
            <span>Assigned To :</span>
            <select
              value={assignee}
              onChange={(event) => setAssignee(event.target.value)}
              className="h-12 rounded-full border-2 border-primary/40 bg-white px-5 text-base font-medium text-[#2F2766] shadow-[0_6px_0_rgba(144,122,214,0.2)] focus:border-primary focus:outline-none"
            >
              {ASSIGNEE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="inline-flex h-12 items-center justify-start gap-2 rounded-full border-2 border-primary/40 bg-white px-5 text-base font-medium text-[#2F2766] shadow-[0_6px_0_rgba(144,122,214,0.2)] transition hover:border-primary hover:text-primary"
            >
              <Plus className="size-4" />
              Add
            </button>
          </div>

          <div className="space-y-3 text-sm font-semibold text-[#2F2766]">
            <span>Deadline Date :</span>
            <div className="relative">
              <input
                type="text"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
                placeholder="DD/MM/YYYY"
                className="h-12 w-full rounded-full border-2 border-primary/40 bg-white px-5 pr-12 text-base font-medium text-[#2F2766] shadow-[0_6px_0_rgba(144,122,214,0.2)] focus:border-primary focus:outline-none"
              />
              <Calendar className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#2F2766]" />
            </div>
          </div>

          <div className="space-y-3 text-sm font-semibold text-[#2F2766]">
            <span>Task Status :</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as TaskStatus)}
              className="h-12 rounded-full border-2 border-primary/40 bg-white px-5 text-base font-medium text-[#2F2766] shadow-[0_6px_0_rgba(144,122,214,0.2)] focus:border-primary focus:outline-none"
            >
              {Object.entries(TASK_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="button"
              onClick={handleSave}
              className="inline-flex h-12 items-center rounded-full bg-[#3F3478] px-8 text-base font-semibold text-white shadow-[0_6px_0_rgba(63,52,120,0.3)] transition hover:bg-[#2F2766]"
            >
              Save
            </Button>
          </div>
        </section>

        <aside className="flex items-center justify-center">
          <div className="relative size-72 md:size-[22rem]">
            <Image
              src="/illustrations/task-dashboard.png"
              alt="Task dashboard illustration"
              fill
              className="object-contain"
              priority
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
