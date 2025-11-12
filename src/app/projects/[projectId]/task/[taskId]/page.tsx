"use client"

import * as React from "react"
import { useCallback, useMemo, useRef, useState } from "react"
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
  Info,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { format, isSameDay } from "date-fns"

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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Image from "next/image"
import { TASK_STATUS_LABEL, type TaskRecord, type TaskStatus, type TaskSubmission } from "../data"
import {
  fetchProjectMembership,
  fetchProjectMembers,
  type ProjectMemberDetail,
  type ProjectMembershipSummary,
} from "@/utils/projects/api"
import { PROJECT_ROLE } from "@/types/projects"
import { PROJECT_REFRESH_EVENT } from "@/constants/events"
import { useNotifications } from "@/components/notifications/Notification"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"

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

const ROLE_LABEL_MAP: Record<string, string> = {
  OWNER: "Project Owner",
  HEADER: "Header",
  MEMBER: "Member",
}

const getRoleLabel = (role: string) =>
  role === "OWNER" ? "Header (Project Owner)" : ROLE_LABEL_MAP[role] ?? "Member"

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
  const [reviewComment, setReviewComment] = useState("")
  const [lastReviewerComment, setLastReviewerComment] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [submissionMarker, setSubmissionMarker] = useState<string | null>(null)
  const [submissionAcknowledgedMarker, setSubmissionAcknowledgedMarker] = useState<string | null>(null)
  const [feedbackMarker, setFeedbackMarker] = useState<string | null>(null)
  const [feedbackAcknowledgedMarker, setFeedbackAcknowledgedMarker] = useState<string | null>(null)
  const [assignerProfile, setAssignerProfile] = useState<ProjectMemberDetail | null>(null)
  const [assignerDialogOpen, setAssignerDialogOpen] = useState(false)
  const [assignerProfileLoading, setAssignerProfileLoading] = useState(false)
  const [assignerProfileError, setAssignerProfileError] = useState<string | null>(null)
  const [assigneeList, setAssigneeList] = useState<ProjectMemberDetail[] | null>(null)
  const [assigneeDialogOpen, setAssigneeDialogOpen] = useState(false)
  const [assigneeDialogLoading, setAssigneeDialogLoading] = useState(false)
  const [assigneeDialogError, setAssigneeDialogError] = useState<string | null>(null)
  const [assigneeDetailTarget, setAssigneeDetailTarget] = useState<ProjectMemberDetail | null>(null)
  const [assigneeDetailOpen, setAssigneeDetailOpen] = useState(false)
  const [dateInfoOpen, setDateInfoOpen] = useState(false)
  const [acknowledgingSubmission, setAcknowledgingSubmission] = useState(false)
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

  const loadAssignerProfile = useCallback(async () => {
    if (!task) {
      return
    }
    if (assignerProfile?.id === task.createdBy.id) {
      return
    }
    setAssignerProfileError(null)
    setAssignerProfileLoading(true)
    try {
      const members = await fetchProjectMembers(projectId)
      const match = members.find((member) => member.id === task.createdBy.id)
      if (match) {
        setAssignerProfile(match)
      } else {
        setAssignerProfile(null)
        setAssignerProfileError("Assigner profile is unavailable.")
      }
    } catch (error) {
      console.error("Failed to load assigner profile", error)
      setAssignerProfileError(
        error instanceof Error
          ? error.message
          : "Unable to load assigner profile right now."
      )
    } finally {
      setAssignerProfileLoading(false)
    }
  }, [assignerProfile?.id, projectId, task])

  React.useEffect(() => {
    void loadAssignerProfile()
  }, [loadAssignerProfile])

  const handleAssignerClick = useCallback(() => {
    setAssignerDialogOpen(true)
    void loadAssignerProfile()
  }, [loadAssignerProfile])

  const handleAssignerDialogChange = useCallback((open: boolean) => {
    setAssignerDialogOpen(open)
    if (!open) {
      setAssignerProfileError(null)
    }
  }, [])

  const loadAssigneeList = useCallback(async () => {
    if (!projectId || !task?.assignees?.length) {
      setAssigneeList([])
      return
    }
    if (
      assigneeList &&
      assigneeList.length > 0 &&
      assigneeList.length >= task.assignees.length &&
      task.assignees.every((assignee) =>
        assigneeList.some((member) => member.id === assignee.id)
      )
    ) {
      return
    }
    setAssigneeDialogError(null)
    setAssigneeDialogLoading(true)
    try {
      const members = await fetchProjectMembers(projectId)
      const targetIds = new Set(task.assignees.map((assignee) => assignee.id))
      const filtered = members.filter((member) => targetIds.has(member.id))
      setAssigneeList(filtered)
    } catch (error) {
      console.error("Failed to load assignee list", error)
      setAssigneeDialogError(
        error instanceof Error ? error.message : "Unable to load assignee list right now."
      )
      setAssigneeList([])
    } finally {
      setAssigneeDialogLoading(false)
    }
  }, [assigneeList, projectId, task?.assignees])

  const handleAssigneeInfoClick = useCallback(() => {
    setAssigneeDialogOpen(true)
    void loadAssigneeList()
  }, [loadAssigneeList])

  const handleAssigneeDetailView = useCallback((member: ProjectMemberDetail) => {
    setAssigneeDetailTarget(member)
    setAssigneeDetailOpen(true)
  }, [])

  const handleAssigneeDetailClose = useCallback((open: boolean) => {
    setAssigneeDetailOpen(open)
    if (!open) {
      setAssigneeDetailTarget(null)
    }
  }, [])

  const submissionUpdatedAtRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    const submission = task?.submission
    const updatedAt = submission?.updatedAt ?? null
    if (!updatedAt) {
      submissionUpdatedAtRef.current = null
      setSubmissionMarker(null)
      setFeedbackMarker(null)
      setSubmissionAcknowledgedMarker(null)
      setFeedbackAcknowledgedMarker(null)
      return
    }
    if (submissionUpdatedAtRef.current === updatedAt) {
      return
    }
    submissionUpdatedAtRef.current = updatedAt
    const markerLabel = new Date(updatedAt).toLocaleString()
    const acknowledgedAtLabel = submission?.acknowledgedAt
      ? new Date(submission.acknowledgedAt).toLocaleString()
      : null
    const reviewerCommentPresent = Boolean(submission?.reviewerComment?.trim())
    const ackExists = Boolean(submission.acknowledgedAt)
    const treatAsFeedback =
      submission.status !== "SUBMITTED" ||
      (submission.status === "SUBMITTED" &&
        reviewerCommentPresent &&
        !ackExists)
    if (treatAsFeedback) {
      setFeedbackMarker(markerLabel)
      setFeedbackAcknowledgedMarker(acknowledgedAtLabel)
      setSubmissionMarker(null)
      setSubmissionAcknowledgedMarker(null)
    } else {
      setSubmissionMarker(markerLabel)
      setSubmissionAcknowledgedMarker(acknowledgedAtLabel)
      setFeedbackMarker(null)
      setFeedbackAcknowledgedMarker(null)
    }
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

  const assignerLabel = useMemo(() => {
    if (!task) {
      return "—"
    }
    return task.createdBy.username || task.createdBy.fullName?.trim() || "Assigner"
  }, [task])

  const assigneeLabel = useMemo(() => {
    const members = task?.assignees ?? []
    if (members.length === 0) {
      return "Unassigned"
    }
    const filtered = task
      ? members.filter((assignee) => assignee.id !== task.createdBy.id)
      : members
    const target = filtered.length > 0 ? filtered : members
    return target
      .map((assignee) => assignee.username || assignee.fullName?.trim() || "Assignee")
      .join(", ")
  }, [task?.assignees, task?.createdBy?.id])

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
  const viewerIsAssigner = Boolean(task && membership?.id === task.createdBy.id)
  const isAssigneeMember =
    Boolean(membership) &&
    membership?.role === PROJECT_ROLE.MEMBER &&
    isAssignedMember &&
    !viewerIsAssigner
  const taskBlocked = status === "BLOCKED"
  const taskComplete = status === "SUBMITTED"
  const canSubmitTask = isAssigneeMember && !taskBlocked && !taskComplete
  const assigneeStatusNotice = taskBlocked
    ? "This task is blocked by the owner; you cannot edit or resubmit the submission."
    : taskComplete
      ? "The owner accepted this submission, so no more edits are allowed."
      : null
  const canReviewSubmission = viewerIsAssigner && Boolean(task?.submission)
  const ownerViewingSubmission = viewerIsAssigner && Boolean(task?.submission)
  const assignedMemberWaitingReview = Boolean(task?.submission) && isAssignedMember && !viewerIsAssigner

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

  const handleAcknowledgeSubmission = useCallback(
    async (notifyDescription: string, notifyTitle = "Acknowledged") => {
    if (!task) {
      return
    }
    setAcknowledgingSubmission(true)
    try {
      const response = await fetch(
        `/api/projects/${projectId}/tasks/${taskId}/submission/acknowledge`,
        {
          method: "POST",
        }
      )
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Unable to acknowledge submission"
        )
      }
      const result = (await response.json()) as { submission: TaskSubmission }
      setTask((prev) => (prev ? { ...prev, submission: result.submission } : prev))
      setFeedbackAcknowledgedMarker(feedbackMarker ?? null)
      notify({
        title: notifyTitle,
        description: notifyDescription,
        variant: "success",
      })
    } catch (ackError) {
      console.error(ackError)
      notify({
        title: "Acknowledgement failed",
        description:
          ackError instanceof Error
            ? ackError.message
            : "Unable to acknowledge submission",
        variant: "destructive",
      })
    } finally {
      setAcknowledgingSubmission(false)
    }
  }, [projectId, taskId, task, notify])

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
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(PROJECT_REFRESH_EVENT, {
            detail: { projectId },
          })
        )
      }
      notify({
        title: "Review saved",
        description: "Submission feedback has been stored.",
        variant: "success",
      })
    } catch (reviewErr) {
      console.error(reviewErr)
      setReviewError(
        reviewErr instanceof Error ? reviewErr.message : "Failed to update submission"
      )
      notify({
        title: "Review save failed",
        description:
          reviewErr instanceof Error ? reviewErr.message : "Unable to update submission",
        variant: "destructive",
      })
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

  const assignDateLabel = formatDateTime(task?.createdAt ?? null)
  const startlineDateLabel = formatDateTime(task?.startDate ?? null)
  const deadlineDateLabel = formatDateTime(task?.dueDate ?? null)
  const heroBackground = task?.cardColor ?? "var(--task-hero-background)"
  const heroTextColor = task?.cardTextColor ?? "var(--task-hero-text)"
  const statusColors = TASK_STATUS_COLORS[status]
  const submissionRecord = task?.submission
  const hasSubmission = Boolean(submissionRecord)
  const pendingFeedbackCycle =
    Boolean(feedbackMarker) && feedbackMarker !== feedbackAcknowledgedMarker
  const waitingForOwnerResponse =
    Boolean(submissionRecord && submissionRecord.status === "SUBMITTED" && !submissionRecord.acknowledgedAt)
  const effectiveHasSubmission = hasSubmission && !waitingForOwnerResponse
  const shouldShowWaitingHint = hasSubmission && !effectiveHasSubmission
  const hasPendingSubmissionAcknowledgement = waitingForOwnerResponse
  const assignerAvatarUrl = task?.createdBy?.avatarUrl ?? assignerProfile?.avatarUrl
  const assignerDepartmentLabel = assignerProfile?.department?.name ?? "Unassigned"
  const roleValue = assignerProfile?.role ?? task?.createdBy?.role ?? "MEMBER"
  const assignerRoleLabel = getRoleLabel(roleValue)
  const todayDateLabel = formatDateTime(new Date().toISOString())
  const assignDateValue = useMemo(() => {
    if (!task?.createdAt) return null
    const parsed = new Date(task.createdAt)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }, [task?.createdAt])
  const startlineDateValue = useMemo(() => {
    if (!task?.startDate) return assignDateValue
    const parsed = new Date(task.startDate)
    return Number.isNaN(parsed.getTime()) ? assignDateValue : parsed
  }, [assignDateValue, task?.startDate])
  const deadlineDateValue = useMemo(() => {
    if (!task?.dueDate) return startlineDateValue
    const parsed = new Date(task.dueDate)
    return Number.isNaN(parsed.getTime()) ? startlineDateValue : parsed
  }, [startlineDateValue, task?.dueDate])
  const dateRange = useMemo(() => {
    if (!startlineDateValue || !deadlineDateValue) {
      return undefined
    }
    return { from: startlineDateValue, to: deadlineDateValue }
  }, [deadlineDateValue, startlineDateValue])
  const remainingTimeLabel = useMemo(() => {
    if (!deadlineDateValue) {
      return "—"
    }
    const now = new Date()
    const diffMs = deadlineDateValue.getTime() - now.getTime()
    if (diffMs <= 0) {
      return "Time's up"
    }
    const totalMinutes = Math.floor(diffMs / 60000)
    const days = Math.floor(totalMinutes / 1440)
    const hours = Math.floor((totalMinutes % 1440) / 60)
    const minutes = totalMinutes % 60
    const parts: string[] = []
    if (days > 0) {
      parts.push(`${days} day${days === 1 ? "" : "s"}`)
    }
    if (hours > 0) {
      parts.push(`${hours}h`)
    }
    if (minutes > 0) {
      parts.push(`${minutes}m`)
    }
    return parts.length > 0 ? parts.join(" ") : "<1m"
  }, [deadlineDateValue])
  const dateItems = useMemo(
    () => [
      {
        label: "Today Date",
        value: todayDateLabel,
        color: "var(--calendar-today-bg)",
      },
      {
        label: "Assign Date",
        value: assignDateLabel,
        color: "var(--accent)",
      },
      {
        label: "Startline Date",
        value: startlineDateLabel,
        color: heroBackground,
      },
      {
        label: "Deadline Date",
        value: deadlineDateLabel,
        color: "var(--secondary)",
      },
    ],
    [assignDateLabel, deadlineDateLabel, heroBackground, startlineDateLabel, todayDateLabel]
  )
  const dayClassName = useCallback(
    (day: Date) => {
      if (assignDateValue && isSameDay(day, assignDateValue)) {
        return "bg-[var(--accent)] text-white pointer-events-none"
      }
      if (isSameDay(day, new Date())) {
        return "bg-[var(--calendar-today-bg)] text-[var(--calendar-today-text)] pointer-events-none"
      }
      return "pointer-events-none"
    },
    [assignDateValue]
  )
  const calendarComponents = useMemo(
    () => ({
      DayButton: (props: React.ComponentProps<typeof CalendarDayButton>) => (
        <CalendarDayButton {...props} className="pointer-events-none" />
      ),
    }),
    []
  )

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
        <Button
          data-cy="project-task-detail-error-back-button"
          onClick={() => router.push(`/projects/${projectId}/task`)}
          className="rounded-full px-6"
        >
          Back to tasks
        </Button>
      </div>
    )
  }


  return (
    <div className="asap-scroll w-full min-h-[calc(100vh-6.5rem)] px-[clamp(3.25rem,4vw,3.25rem)] pt-3 pb-10">
      <div className="flex w-full max-w-7xl flex-col items-start gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="sticky top-1 z-10 -ml-3 flex flex-shrink-0 items-start justify-start lg:-mt-0">
          <Button
            type="button"
            variant="ghost"
            data-cy="project-task-detail-back-button"
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
            <div className="space-y-4 w-full max-w-2xl self-center">
              <div className="space-y-2 space-x-2">
                <div className="inline-flex max-w-max items-center justify-center px-3 py-2 text-lg font-semibold text-[var(--task-hero-text)] pl-8">
                  Assigner
                </div>
                <button
                  type="button"
                  onClick={handleAssignerClick}
                  className="group -mt-3 flex w-full items-center gap-4 rounded-[1.75rem] border border-primary/30 bg-white/90 px-4 py-3 text-left shadow-[0_6px_15px_rgba(63,52,120,0.08)] transition hover:border-primary/50 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label={`View details for ${assignerLabel}`}
                >
                  <Avatar className="h-11 w-11 shrink-0">
                    {assignerAvatarUrl ? (
                      <Image
                        src={assignerAvatarUrl}
                        alt={`${assignerLabel} avatar`}
                        width={44}
                        height={44}
                        className="h-full w-full rounded-full object-cover"
                        priority
                      />
                    ) : (
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {assignerLabel.charAt(0).toUpperCase() || "A"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <p className="text-sm font-semibold text-[var(--task-hero-text)]">{assignerLabel}</p>
                    <p className="text-xs text-[var(--task-subtle-text)]">
                      {assignerDepartmentLabel} • {assignerRoleLabel}
                    </p>
                  </div>
                  {!canSubmitTask && assigneeStatusNotice && (
                    <div className="rounded-[2rem] border border-primary/30 bg-primary/5 px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                      {assigneeStatusNotice}
                    </div>
                  )}
                </button>
                <Dialog open={assignerDialogOpen} onOpenChange={handleAssignerDialogChange}>
                  <DialogContent className="max-w-2xl rounded-[2.5rem] border-2 border-primary/30 bg-white px-7 py-7 shadow-[0_20px_40px_rgba(72,68,110,0.25)]">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold text-[var(--task-hero-text)]">
                         View Assigner Details
                      </DialogTitle>
                    </DialogHeader>
                    {assignerProfileLoading ? (
                      <p className="mx-auto mt-4 text-sm font-semibold text-[var(--task-subtle-text)]">
                        Loading profile…
                      </p>
                    ) : assignerProfileError ? (
                      <p className="mx-auto mt-4 text-sm font-semibold text-destructive">
                        {assignerProfileError}
                      </p>
                    ) : (
                      <div className="-mt-2 space-y-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-primary/20 bg-primary/5">
                            <Avatar className="h-20 w-20">
                              {assignerAvatarUrl ? (
                                <Image
                                  src={assignerAvatarUrl}
                                  alt={`${assignerLabel} avatar`}
                                  width={80}
                                  height={80}
                                  className="h-full w-full rounded-full object-cover"
                                  priority
                                />
                              ) : (
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                  {assignerLabel.charAt(0).toUpperCase() || "A"}
                                </AvatarFallback>
                              )}
                            </Avatar>
                          </div>
                          <div className="flex flex-1 flex-col gap-1 mt-2">
                            <p className="text-lg font-semibold text-[var(--task-hero-text)]">
                              {assignerProfile?.username ?? assignerLabel}
                            </p>
                            <p className="text-sm font-semibold  text-primary/70">
                              <span className="text-foreground/40">Department : </span>{assignerDepartmentLabel}
                            </p>
                            <p className="text-sm font-semibold  text-primary/70">
                               <span className="text-foreground/40">Role : </span>{assignerRoleLabel}
                            </p>
                           
                          </div>
                        </div>
                        <div className="space-y-3">
                          {assignerProfile?.email ? (
                            <div>
                              <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">
                                Email
                              </p>
                              <p className="text-sm text-[var(--task-hero-text)]">
                                {assignerProfile.email}
                              </p>
                            </div>
                          ) : null}
                          <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">
                            About me
                          </p>
                          <div className="asap-scroll max-h-[10rem]  -mt-2 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-2 text-sm text-[var(--task-hero-text)] whitespace-pre-line">
                            {assignerProfile?.bio?.length
                              ? assignerProfile.bio
                              : "No bio provided."}
                          </div>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
              <h2 className="text-lg font-semibold text-[var(--task-hero-text)] pl-8">Task Description</h2>
              <div className="rounded-[1.5rem] -mt-3 min-h-[10rem] max-h-[10rem] asap-scroll border-2 border-primary/30 bg-[var(--task-description-bg)] px-4 py-2 text-sm text-[var(--task-hero-text)] whitespace-pre-line">
                {description || "No details provided."}
              </div>
            </div>
            <Dialog open={assigneeDialogOpen} onOpenChange={setAssigneeDialogOpen}>
            <DialogContent className="max-w-[48rem] rounded-[2.5rem] border-2 border-primary/30 bg-white px-8 py-6 text-left shadow-[0_20px_40px_rgba(72,68,110,0.2)]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-[var(--task-hero-text)]">
                    Assignee Members
                  </DialogTitle>
                </DialogHeader>
                {assigneeDialogLoading ? (
                  <p className="mx-auto mt-4 text-sm font-semibold text-[var(--task-subtle-text)]">
                    Loading assignees…
                  </p>
                ) : assigneeDialogError ? (
                  <p className="mx-auto mt-4 text-sm font-semibold text-destructive">
                    {assigneeDialogError}
                  </p>
                ) : (
                  <div className="-mt-2 space-y-3 asap-scroll [scrollbar-gutter:stable] max-h-[25rem] overflow-y-auto pr-1">
                    {(assigneeList && assigneeList.length > 0
                      ? assigneeList
                      : task.assignees.map((assignee) => ({
                          id: assignee.id,
                          username: assignee.username,
                          department: null,
                          role: "Member",
                          email: null,
                          departmentId: null,
                          avatarUrl: assignee.avatarUrl,
                          bio: null,
                          lastSeenAt: null,
                          projectId: projectId,
                          userId: "",
                        } as ProjectMemberDetail))
                    ).map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 rounded-[1.25rem] border border-primary/30 bg-white px-4 py-3 shadow-[0_6px_12px_rgba(63,52,120,0.08)]"
                        onClick={() => handleAssigneeDetailView(member)}
                      >
                        <Avatar className="h-11 w-11 shrink-0 border border-primary/30 bg-primary/5">
                          {member.avatarUrl ? (
                            <Image
                              src={member.avatarUrl}
                              alt={`${member.username} avatar`}
                              width={44}
                              height={44}
                              className="h-full w-full object-cover rounded-full"
                            />
                          ) : (
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {member.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex flex-1 flex-col gap-0.5">
                          <p className="text-sm font-semibold text-[var(--task-hero-text)]">
                            {member.username}
                          </p>
                          <p className="text-[0.65rem] uppercase tracking-[0.3em] text-primary/70">
                            {member.department?.name ?? "Unassigned"} • {getRoleLabel(member.role)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </DialogContent>
            </Dialog>
            <Dialog open={assigneeDetailOpen} onOpenChange={handleAssigneeDetailClose}>
              <DialogContent className="max-w-2xl rounded-[2.5rem] border-2 border-primary/30 bg-white px-7 py-7 shadow-[0_20px_40px_rgba(72,68,110,0.25)]">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-[var(--task-hero-text)]">
                    View Assignee Details
                  </DialogTitle>
                </DialogHeader>
                {assigneeDetailTarget ? (
                  <div className="-mt-2 space-y-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <Avatar className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-primary/20 bg-primary/5">
                          {assigneeDetailTarget.avatarUrl ? (
                            <Image
                              src={assigneeDetailTarget.avatarUrl}
                              alt={`${assigneeDetailTarget.username} avatar`}
                              width={96}
                              height={96}
                              className="size-full object-cover rounded-full"
                            />
                          ) : (
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {assigneeDetailTarget.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      </div>
                      <div className="flex flex-1 flex-col gap-1 mt-2">
                        <p className="text-lg font-semibold text-[var(--task-hero-text)]">
                          {assigneeDetailTarget.username}
                        </p>
                        <p className="text-sm font-semibold text-primary/70">
                          <span className="text-foreground/40">Department : </span>
                          {assigneeDetailTarget.department?.name ?? "Unassigned"}
                        </p>
                        <p className="text-sm font-semibold text-primary/70">
                          <span className="text-foreground/40">Role : </span>
                          {getRoleLabel(assigneeDetailTarget.role)}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                    {assigneeDetailTarget?.email ? (
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">
                          Email
                        </p>
                        <p className="text-sm text-[var(--task-hero-text)]">
                          {assigneeDetailTarget.email}
                        </p>
                      </div>
                    ) : null}
                      <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">
                            About me
                      </p>
                      <div className="asap-scroll max-h-[10rem]  -mt-2 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-2 text-sm text-[var(--task-hero-text)] whitespace-pre-line">
                        {assigneeDetailTarget?.bio?.length
                          ? assigneeDetailTarget.bio
                          : "No bio provided."}
                      </div>
                    </div>
                  </div>
                ) : null}
              </DialogContent>
            </Dialog>

          <div className="grid gap-2 px-5 text-lg text-[var(--task-subtle-text)] sm:grid-cols-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold ml-0 text-[var(--task-hero-text)]">Assigned To</p>
                  {task.assignees.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAssigneeInfoClick}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-white text-primary shadow-sm transition hover:border-primary/60 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      aria-label="View assignee list"
                    >
                      <Info className="size-4" />
                    </button>
                  )}
                </div>
                <div className="asap-scroll max-h-6 overflow-x-auto text-sm font-normal text-[var(--task-hero-text)]">
                  <p className="max-w-full truncate">{assigneeLabel}</p>
                </div>
              </div>
              <div className="space-y-1 text-right sm:text-right">
                <div className="flex items-center justify-end gap-2">
                  <p className="font-semibold text-[var(--task-hero-text)] ml-0">Deadline Date</p>
                  <button
                    type="button"
                    onClick={() => setDateInfoOpen(true)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-white text-primary shadow-sm transition hover:border-primary/60 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    aria-label="View date info"
                  >
                    <Info className="size-4" />
                  </button>
                </div>
                <p className="text-sm font-normal text-[var(--task-hero-text)]">{deadlineDateLabel}</p>
              </div>
            </div>
            <Dialog open={dateInfoOpen} onOpenChange={setDateInfoOpen}>
              <DialogContent className="max-w-3xl rounded-[2.5rem] border-2 border-primary/30 bg-white px-8 py-6 text-left shadow-[0_20px_40px_rgba(72,68,110,0.2)]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-[var(--task-hero-text)]">
                    Date Timeline
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[var(--task-subtle-text)]">
                    Overview of today, assign, startline and deadline dates.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
                  <div className="space-y-3">
                    {dateItems.map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <span
                          className="inline-flex h-3 w-3 rounded-full border border-primary/40"
                          style={{ backgroundColor: item.color }}
                        />
                        <div>
                          <p className="text-[0.65rem] uppercase tracking-[0.3em] text-primary/60">
                            {item.label}
                          </p>
                          <p className="text-sm font-semibold text-[var(--task-hero-text)]">
                            {item.value || "—"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 w-full max-w-[32rem]">
      <Calendar
        mode="range"
        selected={dateRange}
        dayClassName={dayClassName}
        defaultMonth={startlineDateValue ?? new Date()}
        className="w-full rounded-[1.5rem] border-0 bg-transparent shadow-none"
        disabled={{ before: startlineDateValue ?? new Date() }}
      />
                    </div>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 shadow-inner">
            <p className="text-[0.65rem] uppercase tracking-[0.3em] text-primary/60">
              Remaining time
            </p>
            <p className="text-sm font-semibold text-[var(--task-hero-text)]">
              {remainingTimeLabel}
            </p>
          </div>
        </DialogContent>
      </Dialog>

            <div className="space-y-6 w-full max-w-2xl">
              {!viewerIsAssigner && isAssigneeMember && (
                <>
                  <div className="rounded-[2rem] border border-primary/30 bg-white/95 px-6 py-5 shadow-inner">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-[var(--task-hero-text)]">Submit your task</p>
                      <p className="text-xs text-[var(--task-subtle-text)]">
                        {shouldShowWaitingHint
                          ? "Edit your submission to send a new version for approval."
                          : hasSubmission
                            ? "Submission recorded. Please wait for the owner or assignee to review and approve it."
                            : "Add a description and upload any relevant files. Files are stored as data URLs for MVP."}
                      </p>
                      </div>
                      {canSubmitTask && (
                      <Dialog open={submissionDialogOpen} onOpenChange={setSubmissionDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              type="button"
                              data-cy="project-task-detail-submission-button"
                              className={`h-11 rounded-full px-6 text-xs font-semibold uppercase tracking-[0.3em] shadow-[0_6px_0_rgba(63,52,120,0.2)] transition ${
                              effectiveHasSubmission
                                ? "bg-primary text-white hover:bg-primary/90"
                                : "bg-[var(--task-description-bg)] text-[var(--task-hero-text)] border border-primary/30 hover:border-primary/60 hover:bg-white"
                            }`}
                          >
                            {hasSubmission ? "Edit Submission" : "Submission"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-[2rem] border border-primary/30 bg-white/95 px-6 py-6 shadow-[0_20px_60px_rgba(63,52,120,0.2)]">
                          <DialogHeader>
                            <DialogTitle className="text-base font-semibold text-[var(--task-hero-text)]">
                              Submit your task
                            </DialogTitle>
                            <DialogDescription className="text-xs text-[var(--task-subtle-text)]">
                              {shouldShowWaitingHint
                                ? "Edit your submission to send a new version for approval."
                                : hasSubmission
                                  ? "Update your existing submission. Changes will overwrite your previous description and attachments."
                                  : "Add a description and upload any relevant files. Files are stored as data URLs for MVP."}
                            </DialogDescription>
                      </DialogHeader>
                      {hasPendingSubmissionAcknowledgement && (
                        <div className="mt-1 rounded-[1.5rem] border border-primary/30 bg-[var(--task-description-bg)] px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary/80">
                          Sent • awaiting review
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
                              data-cy="project-task-detail-submission-description"
                                onChange={(event) => setSubmissionDescription(event.target.value)}
                                placeholder="Explain your submission…"
                                className="min-h-[8rem] w-full resize-y rounded-[inherit] border-none bg-transparent px-4 py-3 text-sm text-[var(--task-subtle-text)] placeholder:text-[var(--task-placeholder)] shadow-none focus-visible:outline-none focus-visible:ring-0"
                              />
                            </div>

                            <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.3em] text-primary/60">
                              <span className="text-[var(--task-subtle-text)] text-[0.7rem] font-normal lowercase">
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
                                    data-cy="project-task-detail-submission-clear-files"
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
                                    data-cy="project-task-detail-submission-file-input"
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
                                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--task-hero-text)]">
                                          {entry.name}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveSubmissionFile(entry.id)}
                                          aria-label={`Remove ${entry.name}`}
                                          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-transparent bg-primary/10 text-primary transition hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                          data-cy={`project-task-detail-submission-file-remove-${entry.id}`}
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
                            data-cy="project-task-detail-submission-submit"
                            onClick={handleSubmissionSubmit}
                            disabled={submittingSubmission}
                            className={`inline-flex h-12 w-full max-w-xs items-center justify-center rounded-full px-8 text-sm font-semibold text-white shadow-[0_6px_0_rgba(63,52,120,0.2)] transition ${
                                effectiveHasSubmission ? "bg-[var(--task-cta-bg)] hover:bg-[var(--task-cta-hover)]" : "bg-primary hover:bg-primary/90"
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
                            data-cy="project-task-detail-submission-cancel"
                              onClick={() => setSubmissionDialogOpen(false)}
                              disabled={submittingSubmission}
                              className="h-12 rounded-full px-6 text-sm font-semibold uppercase tracking-[0.3em]"
                            >
                              Cancel
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      )}
                    </div>
                  </div>
                </>
              )}
              {viewerIsAssigner && !canSubmitTask && !ownerViewingSubmission &&(
                <div className="rounded-[2rem] border border-dashed border-primary/40 bg-white/70 px-6 py-5 text-sm font-medium text-[var(--task-hero-text)] shadow-inner">
                  <p className="text-base font-semibold text-primary">Awaiting Submission</p>
                  <p className="mt-1 text-sm text-[var(--task-subtle-text)]">
                    Waiting for the assignee to submit their work so you can review it and send feedback back.
                  </p>
                </div>
              )}
              {!viewerIsAssigner && assignedMemberWaitingReview && (
                <div className="rounded-[2rem] border border-primary/30 bg-white/90 px-6 py-5 shadow-inner space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-base font-semibold text-[var(--task-hero-text)]">Review feedback</p>
                    <div className="flex items-center gap-3">
                      {!feedbackMarker && (
                        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/60">
                          Waiting for owner response
                        </span>
                      )}
                      {feedbackMarker && feedbackAcknowledgedMarker === feedbackMarker && (
                        <p className="text-xs uppercase tracking-[0.3em] text-primary/70">
                          Last review: {feedbackMarker}
                        </p>
                      )}
                      {feedbackMarker && feedbackMarker !== feedbackAcknowledgedMarker && (
                        <Button
                          type="button"
                          data-cy="project-task-detail-feedback-acknowledge"
                          onClick={() =>
                            handleAcknowledgeSubmission(`You read the ${feedbackMarker} feedback.`)
                          }
                          disabled={acknowledgingSubmission}
                          className="inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white shadow-[0_4px_0_rgba(63,52,120,0.2)] transition hover:bg-primary/90 disabled:opacity-60 disabled:hover:bg-primary"
                        >
                          {acknowledgingSubmission ? "Marking..." : "Mark as seen"}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="asap-scroll rounded-[1.5rem] min-h-[6rem] max-h-[12rem] overflow-auto border-2 border-primary/30 bg-[var(--task-description-bg)] px-4 py-3 text-sm text-[var(--task-hero-text)] whitespace-pre-line">
                    {lastReviewerComment ?? "No reviewer comment yet."}
                  </div>
                </div>
              )}
              {viewerIsAssigner && ownerViewingSubmission && (
                <div className="rounded-[2rem] border border-primary/30 bg-white/95 px-6 py-5 shadow-inner space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-base font-semibold text-[var(--task-hero-text)]">Submission Details</p>
                      {submissionMarker && (
                        <p className="text-xs uppercase tracking-[0.3em] text-primary/70">
                          {hasPendingSubmissionAcknowledgement
                            ? `New submission: ${submissionMarker}`
                            : `Last submission: ${submissionMarker}`}
                        </p>
                      )}
                    </div>
                    {hasPendingSubmissionAcknowledgement && (
                      <Button
                        type="button"
                        data-cy="project-task-detail-submission-acknowledge"
                        onClick={() =>
                          handleAcknowledgeSubmission("The assignee will know you saw the work.")
                        }
                        disabled={acknowledgingSubmission}
                        className="inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white shadow-[0_4px_0_rgba(63,52,120,0.2)] transition hover:bg-primary/90 disabled:opacity-60 disabled:hover:bg-primary"
                      >
                        {acknowledgingSubmission ? "Marking..." : "Mark as seen"}
                      </Button>
                    )}
                  </div>
                  <div className="asap-scroll rounded-[1.5rem] min-h-[6rem] max-h-[12rem] overflow-auto border-2 border-primary/30 bg-[var(--task-description-bg)] px-4 py-3 text-sm text-[var(--task-hero-text)] whitespace-pre-line">
                    {task.submission?.description ?? "No description provided."}
                  </div>
                  {task.submission?.attachments && task.submission.attachments.length > 0 && (
                    <div className="space-y-2 text-sm text-primary">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--task-subtle-text)]">
                        Attachments
                      </p>
                      <div className="asap-scroll flex flex-wrap gap-3 max-h-[10rem] overflow-y-auto pr-1">
                        {task.submission.attachments.map((attachment) => {
                          const IconComponent = getFileTypeIcon(attachment.name)
                          return (
                            <a
                              key={attachment.url ?? attachment.name}
                              href={attachment.url ?? "#"}
                              download={attachment.name}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => {
                                if (!attachment.url) {
                                  event.preventDefault()
                                }
                              }}
                              className="flex min-w-[12rem] items-center gap-3 rounded-[1rem] border border-primary/30 bg-white px-3 py-2 text-xs font-semibold text-[var(--task-hero-text)] shadow-[0_1px_6px_rgba(63,52,120,0.15)] transition hover:border-primary/60 hover:shadow-[0_2px_8px_rgba(63,52,120,0.25)]"
                            >
                              <span className="flex h-8 w-8 items-center justify-center rounded-[0.85rem] bg-primary/10 text-primary">
                                <IconComponent className="size-4" aria-hidden="true" />
                              </span>
                              <span className="max-w-[12rem] truncate">{attachment.name}</span>
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {viewerIsAssigner && canReviewSubmission && (
                <div className="rounded-[2rem] border border-primary/30 bg-white/95 px-6 py-5 shadow-inner space-y-4">
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-[var(--task-hero-text)]">Review submission</p>
                    <p className="text-xs text-[var(--task-subtle-text)]">
                      Provide feedback and set the task status before sending the response.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
                    <span className="text-base font-semibold text-[var(--task-hero-text)] sm:flex-shrink-0">Task Status :</span>
                    <div className="w-full sm:flex-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-full border-2 border-primary/40 px-6 py-3 text-sm font-semibold shadow-[0_6px_0_rgba(144,122,214,0.2)] transition hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
                    </div>
                  </div>
                  <div className="group/textarea overflow-hidden rounded-[1.25rem] border-2 border-primary/40 bg-white/80 transition-[box-shadow,border-color] focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(0,0,0,0.25)]">
                  <Textarea
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    data-cy="project-task-detail-review-comment"
                      className="project-detail-scroll min-h-[8rem] w-full border-none bg-transparent px-4 py-3 text-sm text-[var(--task-subtle-text)] placeholder:text-[var(--task-placeholder)] shadow-none focus-visible:outline-none focus-visible:ring-0"
                      placeholder="Share feedback…"
                    />
                  </div>
                  {reviewError && (
                    <p className="mt-2 text-xs font-semibold text-destructive">{reviewError}</p>
                  )}
                  <Button
                    type="button"
                    data-cy="project-task-detail-review-submit"
                    onClick={handleReviewSubmit}
                    disabled={reviewing}
                    className="inline-flex h-12 w-full items-center justify-center rounded-full border border-primary/30 bg-[var(--task-description-bg)] px-8 text-sm font-semibold text-[var(--task-hero-text)] shadow-[0_6px_0_rgba(63,52,120,0.2)] transition hover:bg-[var(--task-description-bg-hover)]"
                  >
                    {reviewing ? "Saving…" : "Save review"}
                  </Button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
)
}
