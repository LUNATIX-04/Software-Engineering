"use client"

import * as React from "react"
import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronDown } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TASK_STATUS_LABEL, type TaskRecord, type TaskStatus } from "../data"
import { useNotifications } from "@/components/notifications/Notification"

type TaskDetailPageProps = {
  params: Promise<{
    projectId: string
    taskId: string
  }>
}

export default function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { projectId, taskId } = React.use(params)
  const router = useRouter()
  const { notify } = useNotifications()
  const [task, setTask] = useState<TaskRecord | null>(null)
  const [status, setStatus] = useState<TaskStatus>("IN_PROGRESS")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const loadTask = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        cache: "no-store",
      })
      if (response.status === 404) {
        throw new Error("Not found")
      }
      if (!response.ok) {
        throw new Error("Failed to load task")
      }
      const data = (await response.json()) as TaskRecord
      setTask(data)
      setStatus(data.status)
      setDescription(data.detail ?? "")
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Failed to load task")
    } finally {
      setLoading(false)
    }
  }, [projectId, taskId])

  React.useEffect(() => {
    loadTask()
  }, [loadTask])

  const selectedStatusLabel = React.useMemo(() => TASK_STATUS_LABEL[status] ?? status, [status])

  const formatDateTime = useCallback((value: string | null) => {
    if (!value) {
      return "—"
    }
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return "—"
    }
    return format(date, "dd/MM/yyyy HH:mm")
  }, [])

  const handleSave = async () => {
    if (!task) {
      return
    }
    setSaving(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          detail: description,
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message =
          typeof payload?.error === "string" ? payload.error : "Failed to save changes"
        throw new Error(message)
      }
      const updated = (await response.json()) as TaskRecord
      setTask(updated)
      setStatus(updated.status)
      setDescription(updated.detail ?? "")
      notify({
        title: "Task updated",
        description: "Changes saved successfully.",
      })
      router.push(`/projects/${projectId}/task`)
    } catch (err) {
      console.error(err)
      notify({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Unable to update task.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleBackClick = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
      return
    }
    router.push("/projects")
  }, [router])

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center text-primary">
        Loading task…
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <p className="text-xl font-semibold text-destructive">{error ?? "Task not found."}</p>
        <Button onClick={() => router.push(`/projects/${projectId}/task`)} className="rounded-full px-6">
          Back to tasks
        </Button>
      </div>
    )
  }
  const assignDateLabel = formatDateTime(task.createdAt)
  const startlineDateLabel = formatDateTime(task.startDate)
  const deadlineDateLabel = formatDateTime(task.dueDate)

  return (
    <div className="asap-scroll w-full min-h-[calc(100vh-6.5rem)] px-[clamp(3.25rem,4vw,3.25rem)] pt-3 pb-10">
      <div className="flex w-full max-w-7xl flex-col items-start gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="sticky top-1 z-10 -ml-3 flex flex-shrink-0 items-start justify-start lg:-mt-0">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBackClick}
            className="inline-flex size-12 items-center justify-center rounded-full border border-primary/20 bg-white text-primary shadow-sm transition hover:border-primary/40 hover:bg-primary/10 focus-visible:border-primary focus-visible:ring-0"
          >
            <ArrowLeft className="size-6" aria-hidden="true" />
          </Button>
        </div>

        <div className="mx-auto mt-20 flex w-full max-w-4xl flex-1 flex-col gap-10 px-[clamp(1.5rem,3.4vw,3.85rem)] lg:max-w-5xl">
          <div className="relative mt-3 w-full max-w-3xl self-center">
          <div
            className="absolute -top-11 left-0 z-0
                      flex min-h-[8rem] min-w-[16rem] items-center justify-center
                      rounded-[2.5rem] border-2 border-primary/40 bg-[#E9E0FF]
                      px-6 py-4 text-xl font-bold text-[#2F2766]
                      shadow-[0_6px_0_rgba(144,122,214,0.15)]"
          >
            <span className="-translate-y-10 transform">{task.title}</span>
          </div>

          {/* กล่องขาว (เนื้อหาหลัก) */}
          <section
            className="relative z-10 flex w-full flex-col gap-8
                      rounded-[3.5rem] border-2 border-primary/40 bg-white/95
                      px-[clamp(1.5rem,3.2vw,3rem)] pb-10 pt-8
                      shadow-[0_6px_0_rgba(144,122,214,0.15)]"
          >
            <div className="space-y-3 w-full max-w-2xl self-center">
              <h2 className="text-lg font-semibold text-[#2F2766] pl-8">Task Description</h2>
              <div className="rounded-[2.5rem] border-2 border-primary/30 bg-[#F6F0FF] px-6 py-5 text-sm text-[#2F2766]">
                {description || "No details provided."}
              </div>

            </div>

            <div className="space-y-4 w-full max-w-2xl self-center text-[#2F2766]">
              <p className="text-base font-semibold pl-4">
                Assigned To :
                <span className="font-normal">
                  {task.assignees.length > 0
                    ? ` ${task.assignees
                        .map((assignee) => assignee.username || assignee.fullName || "Member")
                        .join(", ")}`
                    : " —"}
                </span>
              </p>
              <p className="text-base font-semibold pl-4">
                Assign Date : <span className="font-normal">{assignDateLabel}</span>
              </p>
              <p className="text-base font-semibold pl-4">
                Startline Date : <span className="font-normal">{startlineDateLabel}</span>
              </p>
              <p className="text-base font-semibold pl-4">
                Deadline Date :{" "}
                <span className="font-normal">{deadlineDateLabel}</span>
              </p>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col gap-3 sm:max-w-xl">
                  <span className="text-base font-semibold pl-4">Task Status :</span>
                  <div className="w-full max-w-2xl">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex w-[14rem] items-center justify-between rounded-full 
                                    border-2 border-primary/40 bg-white px-6 py-3 
                                    text-sm font-semibold text-primary 
                                    shadow-[0_6px_0_rgba(144,122,214,0.2)] 
                                    transition hover:border-primary 
                                    focus:outline-none focus-visible:ring-2 
                                    focus-visible:ring-primary/40"
                        >
                          <span className="text-left">{selectedStatusLabel}</span>
                          <ChevronDown className="size-4 shrink-0" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-72 rounded-3xl border border-primary/40 bg-white px-3 py-2 text-sm font-semibold text-primary shadow-[0_10px_30px_rgba(72,68,110,0.2)]"
                      >
                        {Object.entries(TASK_STATUS_LABEL).map(([value, label]) => (
                          <DropdownMenuItem
                            key={value}
                            onSelect={() => setStatus(value as TaskStatus)}
                            className={`rounded-2xl px-3 py-2 focus:bg-primary/10 focus:text-primary ${
                              value === status ? "bg-primary/10 text-primary" : ""
                            }`}
                          >
                            {label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex h-12 items-center rounded-full bg-[#3F3478] px-8 text-base font-semibold text-white shadow-[0_6px_0_rgba(63,52,120,0.3)] transition hover:bg-[#2F2766]"
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
)
}
