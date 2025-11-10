"use client"

import * as React from "react"
import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Archive,
  ChevronDown,
  File as FileIcon,
  FileCode,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { TASK_STATUS_LABEL, type TaskRecord, type TaskStatus, type TaskSubmission } from "../data"
import { fetchProjectMembership, type ProjectMembershipSummary } from "@/utils/projects/api"
import { PROJECT_ROLE } from "@/types/projects"
import { PROJECT_REFRESH_EVENT } from "@/constants/events"
import { useNotifications } from "@/components/notifications/Notification"
import { Textarea } from "@/components/ui/textarea"

const TASK_STATUS_COLORS: Record<TaskStatus, { background: string; text: string }> = {
  SUBMITTED: {
    background: "var(--task-status-submitted-bg)",
    text: "var(--task-status-submitted-text)",
  },
  IN_PROGRESS: {
    background: "var(--task-status-in-progress-bg)",
    text: "var(--task-status-in-progress-text)",
  },
  BLOCKED: {
    background: "var(--task-status-blocked-bg)",
    text: "var(--task-status-blocked-text)",
  },
}

const FILE_TYPE_ICON_MAP: Record<string, LucideIcon> = {
  doc: FileText,
  docx: FileText,
  pdf: FileText,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  ppt: FileText,
  pptx: FileText,
  txt: FileText,
  md: FileText,
  js: FileCode,
  jsx: FileCode,
  ts: FileCode,
  tsx: FileCode,
  png: ImageIcon,
  jpg: ImageIcon,
  jpeg: ImageIcon,
  gif: ImageIcon,
  svg: ImageIcon,
  bmp: ImageIcon,
  zip: Archive,
  rar: Archive,
  tar: Archive,
  gz: Archive,
  apk: Archive,
}

const getFileTypeIcon = (fileName: string): LucideIcon => {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? ""
  return FILE_TYPE_ICON_MAP[extension] ?? FileIcon
}

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
  const [membership, setMembership] = useState<ProjectMembershipSummary | null>(null)
  const [membershipLoading, setMembershipLoading] = useState(true)
  type SubmissionAttachmentEntry = {
    id: string
    name: string
    url: string | null
    file?: File
    isExisting: boolean
  }
  const [submissionDescription, setSubmissionDescription] = useState("")
  const [submissionFileEntries, setSubmissionFileEntries] = useState<SubmissionAttachmentEntry[]>([])
  const [submittingSubmission, setSubmittingSubmission] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false)
  const [reviewStatus, setReviewStatus] = useState<TaskSubmission["status"]>("SUBMITTED")
  const [reviewComment, setReviewComment] = useState("")
  const [lastReviewerComment, setLastReviewerComment] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [reviewMarker, setReviewMarker] = useState<string | null>(null)
  const [acknowledgedMarker, setAcknowledgedMarker] = useState<string | null>(null)

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
      setReviewStatus(data.submission?.status ?? "SUBMITTED")
      setReviewComment(data.submission?.reviewerComment ?? "")
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

  React.useEffect(() => {
    if (task?.submission?.updatedAt) {
      setReviewMarker(new Date(task.submission.updatedAt).toLocaleString())
    } else {
      setReviewMarker(null)
    }
    setAcknowledgedMarker(null)
  }, [task?.submission])

  React.useEffect(() => {
    setLastReviewerComment(task?.submission?.reviewerComment ?? null)
  }, [task?.submission?.reviewerComment])

  React.useEffect(() => {
    let active = true
    setMembershipLoading(true)
    fetchProjectMembership(projectId)
      .then((data) => {
        if (!active) return
        setMembership(data)
      })
      .catch((fetchError) => {
        console.error("Failed to load membership", fetchError)
      })
      .finally(() => {
        if (!active) return
        setMembershipLoading(false)
      })
    return () => {
      active = false
    }
  }, [projectId])

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
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(PROJECT_REFRESH_EVENT, { detail: { projectId } })
        )
      }
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

  const assignedMemberIds = React.useMemo(() => {
    if (!task) return new Set<string>()
    return new Set(task.assignees.map((assignee) => assignee.id))
  }, [task])
  const isAssignedMember = membership ? assignedMemberIds.has(membership.id) : false
  const isProjectOwner = membership?.role === PROJECT_ROLE.OWNER
  const canSubmitTask = Boolean(membership) && membership?.role === PROJECT_ROLE.MEMBER && isAssignedMember
  const canReviewSubmission = Boolean(membership) && isProjectOwner && Boolean(task?.submission)
  const ownerViewingSubmission = Boolean(task?.submission) && isProjectOwner
  const assignedMemberWaitingReview = Boolean(task?.submission) && isAssignedMember && !canReviewSubmission

  const readFileAsDataUrl = (file: File) =>
    new Promise<{ name: string; url: string }>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve({ name: file.name, url: reader.result as string })
      }
      reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })

  const handleSubmissionFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) {
      return
    }
    setSubmissionFileEntries((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: `new-${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
        name: file.name,
        url: null,
        file,
        isExisting: false,
      })),
    ])
    event.target.value = ""
  }

  const handleRemoveSubmissionFile = (id: string) => {
    setSubmissionFileEntries((prev) => prev.filter((entry) => entry.id !== id))
  }

  const handleSubmissionSubmit = async () => {
    if (!task) {
      return
    }
    setSubmittingSubmission(true)
    setSubmissionError(null)
    try {
      const attachments = await Promise.all(
        submissionFileEntries.map(async (entry) => {
          if (entry.file) {
            return readFileAsDataUrl(entry.file)
          }
          return { name: entry.name, url: entry.url ?? "" }
        })
      )
      const filteredAttachments = attachments.filter((attachment) => Boolean(attachment.url))
      const response = await fetch(
        `/api/projects/${projectId}/tasks/${taskId}/submission`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            description: submissionDescription,
            attachments: filteredAttachments,
          }),
        }
      )
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Failed to create submission"
        )
      }
      const result = (await response.json()) as { submission: TaskSubmission }
      setTask((prev) => (prev ? { ...prev, submission: result.submission } : prev))
      setSubmissionDescription("")
      setSubmissionFileEntries([])
      setSubmissionDialogOpen(false)
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(PROJECT_REFRESH_EVENT, {
            detail: { projectId },
          })
        )
      }
    } catch (submitError) {
      console.error(submitError)
      setSubmissionError(
        submitError instanceof Error ? submitError.message : "Unable to submit task"
      )
    } finally {
      setSubmittingSubmission(false)
    }
  }

  React.useEffect(() => {
    if (!submissionDialogOpen) {
      return
    }
    setSubmissionDescription(task?.submission?.description ?? "")
    setSubmissionFileEntries(
      (task?.submission?.attachments ?? []).map((attachment, index) => ({
        id: `existing-${attachment.name}-${attachment.url}-${index}`,
        name: attachment.name,
        url: attachment.url,
        file: undefined,
        isExisting: true,
      }))
    )
  }, [submissionDialogOpen, task?.submission])

  const handleReviewSubmit = async () => {
    const submissionId = task?.submission?.id
    if (!submissionId) {
      setReviewError("Submission not found.")
      return
    }
    setReviewing(true)
    setReviewError(null)
    try {
      const response = await fetch(
        `/api/projects/${projectId}/tasks/${taskId}/submission`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            submissionId,
            status: reviewStatus,
            reviewerComment: reviewComment,
          }),
        }
      )
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message =
          typeof payload?.error === "string" ? payload.error : "Unable to update submission"
        throw new Error(message)
      }
      const result = (await response.json()) as { submission: TaskSubmission }
      setTask((prev) => (prev ? { ...prev, submission: result.submission } : prev))
      const reviewerComment = result.submission.reviewerComment ?? null
      setReviewComment(reviewerComment ?? "")
      setLastReviewerComment(reviewerComment)
      const markerLabel = new Date().toLocaleString()
      setReviewMarker(markerLabel)
      setAcknowledgedMarker(null)
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(PROJECT_REFRESH_EVENT, {
            detail: { projectId },
          })
        )
      }
    } catch (reviewErr) {
      console.error(reviewErr)
      setReviewError(
        reviewErr instanceof Error ? reviewErr.message : "Failed to update submission"
      )
    } finally {
      setReviewing(false)
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
  const heroBackground = task.cardColor || "#E9E0FF"
  const heroTextColor = task.cardTextColor || "#2F2766"
  const statusColors = TASK_STATUS_COLORS[status]
  const hasSubmission = Boolean(task?.submission)

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
                      rounded-[2.5rem] border-2
                      px-6 py-4 text-xl font-bold shadow-[0_6px_0_rgba(144,122,214,0.15)]"
            style={{
              backgroundColor: heroBackground,
              color: heroTextColor,
              borderColor: heroBackground,
            }}
          >
            <span className="-translate-y-10 transform">{task.title}</span>
          </div>
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

            <div className="space-y-6 w-full max-w-2xl">
              {canSubmitTask && (
                <div className="rounded-[2rem] border border-primary/30 bg-white/95 px-6 py-5 shadow-inner">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-[#2F2766]">Submit your task</p>
                      <p className="text-xs text-[#3F3478]">
                        {hasSubmission
                          ? "Submission recorded. Please wait for the owner or assignee to review and approve it."
                          : "Add a description and upload any relevant files. Files are stored as data URLs for MVP."}
                      </p>
                    </div>
                    <Dialog open={submissionDialogOpen} onOpenChange={setSubmissionDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          className={`h-11 rounded-full px-6 text-xs font-semibold uppercase tracking-[0.3em] shadow-[0_6px_0_rgba(63,52,120,0.2)] transition ${
                            hasSubmission
                              ? "bg-primary text-white hover:bg-primary/90"
                              : "bg-[#F6F0FF] text-[#2F2766] border border-primary/30 hover:border-primary/60 hover:bg-white"
                          }`}
                        >
                          {hasSubmission ? "Edit Submission" : "Submission"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-[2rem] border border-primary/30 bg-white/95 px-6 py-6 shadow-[0_20px_60px_rgba(63,52,120,0.2)]">
                        <DialogHeader>
                          <DialogTitle className="text-base font-semibold text-[#2F2766]">
                            Submit your task
                          </DialogTitle>
                          <DialogDescription className="text-xs text-[#3F3478]">
                            {hasSubmission
                              ? "Update your existing submission. Changes will overwrite your previous description and attachments."
                              : "Add a description and upload any relevant files. Files are stored as data URLs for MVP."}
                          </DialogDescription>
                        </DialogHeader>
                        {hasSubmission && (
                          <div className="mt-1 rounded-[1.5rem] border border-primary/30 bg-[#F6F0FF] px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary/80">
                            Sent • awaiting review by the owner / assignee
                          </div>
                        )}
                        <div className="mt-3 space-y-4">
                          <label className="sr-only" htmlFor="submission-description">
                            Submission description
                          </label>
                          <div className="group/textarea overflow-hidden rounded-[1.25rem] border-2 border-primary/40 bg-white/80 transition-[box-shadow,border-color] focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(0,0,0,0.25)]">
                            <Textarea
                              id="submission-description"
                              value={submissionDescription}
                              onChange={(event) => setSubmissionDescription(event.target.value)}
                              placeholder="Explain your submission…"
                              className="min-h-[8rem] w-full resize-y rounded-[inherit] border-none bg-transparent px-4 py-3 text-sm text-[#3F3478] placeholder:text-[#AFA9D0] shadow-none focus-visible:outline-none focus-visible:ring-0"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.3em] text-primary/60">
                            <span className="text-[#3F3478] text-[0.7rem] font-normal lowercase">
                              {submissionFileEntries.length > 0
                                ? `${submissionFileEntries.length} files selected`
                                : "No files selected yet"}
                            </span>
                            <div className="flex items-center gap-2">
                              {submissionFileEntries.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setSubmissionFileEntries([])}
                                  className="rounded-full border border-primary/30 bg-primary/5 px-4 py-1 text-[0.65rem] font-semibold text-primary transition hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                >
                                  Clear
                                </button>
                              )}
                              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-primary/40 bg-white/80 px-4 py-1 text-[0.65rem] font-semibold text-primary transition hover:border-primary/70 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                                Add File +
                                <input
                                  type="file"
                                  multiple
                                  className="hidden"
                                  onChange={handleSubmissionFilesChange}
                                />
                              </label>
                            </div>
                          </div>
                          {submissionFileEntries.length > 0 && (
                            <div className="asap-scroll [scrollbar-gutter:stable] max-h-[14rem] overflow-y-auto pr-1">
                              <ul className="flex flex-wrap gap-3">
                                {submissionFileEntries.map((entry) => {
                                  const IconComponent = getFileTypeIcon(entry.name)
                                  return (
                                    <li
                                      key={entry.id}
                                      className="flex min-w-[12rem] max-w-[100%] items-center gap-3 rounded-[1rem] border border-primary/30 bg-white px-3 py-2 shadow-[0_1px_6px_rgba(63,52,120,0.15)]"
                                    >
                                      <span className="flex h-10 w-10 items-center justify-center rounded-[0.85rem] bg-primary/10 text-primary">
                                        <IconComponent className="size-5" aria-hidden="true" />
                                      </span>
                                      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#2F2766]">
                                        {entry.name}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveSubmissionFile(entry.id)}
                                        aria-label={`Remove ${entry.name}`}
                                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-transparent bg-primary/10 text-primary transition hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                      >
                                        <X className="size-3" aria-hidden="true" />
                                      </button>
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>
                          )}
                        </div>
                        {submissionError && (
                          <p className="mt-2 text-xs font-semibold text-destructive">{submissionError}</p>
                        )}
                        <DialogFooter className="mt-4 flex flex-wrap gap-3">
                          <Button
                            type="button"
                            onClick={handleSubmissionSubmit}
                            disabled={submittingSubmission}
                            className={`inline-flex h-12 w-full max-w-xs items-center justify-center rounded-full px-8 text-sm font-semibold text-white shadow-[0_6px_0_rgba(63,52,120,0.2)] transition ${
                              hasSubmission ? "bg-[#4C43F2] hover:bg-[#3933d1]" : "bg-primary hover:bg-primary/90"
                            }`}
                          >
                            {submittingSubmission
                              ? hasSubmission
                                ? "Updating…"
                                : "Submitting…"
                              : hasSubmission
                                ? "Update Submission"
                                : "Submit Work"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setSubmissionDialogOpen(false)}
                            disabled={submittingSubmission}
                            className="h-12 rounded-full px-6 text-sm font-semibold uppercase tracking-[0.3em]"
                          >
                            Cancel
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              )}

              {assignedMemberWaitingReview && (
                <div className="rounded-[2rem] border border-primary/30 bg-white/90 px-6 py-5 shadow-inner">
                  <div className="flex items-center justify-between">
                    <p className="text-base font-semibold text-[#2F2766]">Review feedback</p>
                    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/60">
                      Waiting for owner response
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[#3F3478]">
                    {lastReviewerComment ?? "No reviewer comment yet."}
                  </p>
                  {reviewMarker && (
                    <p className="mt-2 text-xs uppercase tracking-[0.3em] text-primary/70">
                      Last review: {reviewMarker}
                    </p>
                  )}
                  {reviewMarker && reviewMarker !== acknowledgedMarker ? (
                    <div className="mt-4 flex justify-end">
                      <Button
                        type="button"
                        onClick={() => {
                          setAcknowledgedMarker(reviewMarker)
                          notify({
                            title: "Acknowledged",
                            description: "The owner will know you read the feedback.",
                            variant: "success",
                          })
                        }}
                        className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-6 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_4px_0_rgba(63,52,120,0.2)] transition hover:bg-primary/90"
                      >
                        Mark as seen
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}

              {ownerViewingSubmission && (
                <div className="rounded-[2rem] border border-primary/30 bg-white/95 px-6 py-5 shadow-inner space-y-4">
                  <div>
                    <p className="text-base font-semibold text-[#2F2766]">Submission details</p>
                    <p className="text-xs text-[#3F3478]">
                      {task.submission?.description ?? "No description provided."}
                    </p>
                  </div>
                  {task.submission?.attachments && task.submission.attachments.length > 0 ? (
                    <div className="space-y-1 text-sm text-primary">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#3F3478]">
                        Attachments
                      </p>
                      <ul className="space-y-1">
                        {task.submission.attachments.map((attachment) => (
                          <li key={attachment.url ?? attachment.name}>
                            <a href={attachment.url} className="text-sm underline" target="_blank" rel="noreferrer">
                              {attachment.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}

              {canReviewSubmission && (
                <div className="rounded-[2rem] border border-primary/30 bg-white/95 px-6 py-5 shadow-inner">
                  <p className="text-base font-semibold text-[#2F2766]">Review submission</p>
                  <p className="text-xs text-[#3F3478]">
                    Mark the work as approved or request revision, and leave a comment for the member.
                  </p>
                  <div className="mt-3 group/textarea overflow-hidden rounded-[1rem] border-2 border-primary/40 bg-white/80 transition-[box-shadow,border-color] focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(0,0,0,0.25)]">
                    <Textarea
                      value={reviewComment}
                      onChange={(event) => setReviewComment(event.target.value)}
                      className="project-detail-scroll min-h-[8rem] w-full border-none bg-transparent px-4 py-3 text-sm text-[#3F3478] placeholder:text-[#AFA9D0] shadow-none focus-visible:outline-none focus-visible:ring-0"
                      placeholder="Share feedback…"
                    />
                  </div>
                  {reviewError && (
                    <p className="mt-2 text-xs font-semibold text-destructive">{reviewError}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-3">
                    {["APPROVED", "REVISION_REQUESTED"].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setReviewStatus(value as TaskSubmission["status"])}
                        className={`rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] ${
                          reviewStatus === value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-primary/30 text-[#3F3478]"
                        }`}
                      >
                        {value === "APPROVED" ? "Approve" : "Request Revision"}
                      </button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    onClick={handleReviewSubmit}
                    disabled={reviewing}
                    className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full border border-primary/30 bg-[#F6F0FF] px-8 text-sm font-semibold text-[#2F2766] shadow-[0_6px_0_rgba(63,52,120,0.2)] transition hover:bg-[#E9E0FF]"
                  >
                    {reviewing ? "Updating…" : "Send Submission"}
                  </Button>
                </div>
              )}
            </div>
            
            <div className="space-y-4 text-[#2F2766]">
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
                Deadline Date : <span className="font-normal">{deadlineDateLabel}</span>
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex flex-col gap-3 sm:max-w-xl">
                    <span className="text-base font-semibold pl-4 text-[#2F2766]">
                      Task Status :
                    </span>
                <div className="w-full max-w-2xl">
                  {isProjectOwner ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex w-[14rem] items-center justify-between rounded-full 
                                    border-2 border-primary/40 px-6 py-3 
                                    text-sm font-semibold shadow-[0_6px_0_rgba(144,122,214,0.2)] 
                                    transition hover:border-primary 
                                    focus:outline-none focus-visible:ring-2 
                                    focus-visible:ring-primary/40"
                          style={{
                            backgroundColor: statusColors.background,
                            color: statusColors.text,
                            borderColor: statusColors.background,
                          }}
                        >
                          <span className="flex items-center gap-3 text-left">
                            <span
                              className="h-3 w-3 rounded-full border border-primary/30"
                              style={{ backgroundColor: statusColors.background }}
                            />
                            <span>{selectedStatusLabel}</span>
                          </span>
                          <ChevronDown className="size-4 shrink-0" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-72 rounded-3xl border border-primary/40 bg-white px-3 py-2 text-sm font-semibold text-primary shadow-[0_10px_30px_rgba(72,68,110,0.2)]"
                      >
                        {Object.entries(TASK_STATUS_LABEL).map(([value, label]) => {
                          const itemColors = TASK_STATUS_COLORS[value as TaskStatus]
                          const isActive = value === status
                          return (
                            <DropdownMenuItem
                              key={value}
                              onSelect={() => setStatus(value as TaskStatus)}
                              className={`rounded-2xl px-3 py-2 focus:bg-primary/10 focus:text-primary ${
                                isActive ? "bg-primary/10 text-primary" : ""
                              }`}
                            >
                              <span className="flex items-center gap-3">
                                <span
                                  className="h-3 w-3 rounded-full border border-primary/30"
                                  style={{ backgroundColor: itemColors.background }}
                                />
                                {label}
                              </span>
                            </DropdownMenuItem>
                          )
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <div
                      className="flex w-[14rem] items-center justify-between rounded-full border-2 border-primary/40 px-6 py-3 text-sm font-semibold shadow-[0_4px_0_rgba(144,122,214,0.1)] opacity-70"
                      style={{
                        backgroundColor: statusColors.background,
                        color: statusColors.text,
                        borderColor: statusColors.background,
                      }}
                    >
                      <span className="flex items-center gap-3 text-left">
                        <span
                          className="h-3 w-3 rounded-full border border-primary/30"
                          style={{ backgroundColor: statusColors.background }}
                        />
                        <span>{selectedStatusLabel}</span>
                      </span>
                      <ChevronDown className="size-4 shrink-0 opacity-0" />
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="button"
                onClick={handleReviewSubmit}
                disabled={reviewing}
                className="inline-flex h-12 items-center rounded-full bg-[#3F3478] px-8 text-base font-semibold text-white shadow-[0_6px_0_rgba(63,52,120,0.3)] transition hover:bg-[#2F2766]"
              >
                {reviewing ? "Saving…" : "Save"}
              </Button>
            </div>
         
            
          </section>
        </div>
      </div>
    </div>
  </div>
)
}
