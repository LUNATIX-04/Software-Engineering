"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import { cn } from "@/lib/utils"
import { TASK_STATUS_LABEL, type TaskRecord, type TaskStatus, type TaskSubmission } from "../data"
import {
  fetchProjectMembership,
  fetchProjectMembers,
  type ProjectMemberDetail,
  type ProjectMembershipSummary,
} from "@/utils/projects/api"
import { fetchProjectDepartments } from "@/utils/projects/departments"
import { PROJECT_ROLE } from "@/types/projects"
import { PROJECT_REFRESH_EVENT } from "@/constants/events"
import { useNotifications } from "@/components/notifications/Notification"
import { Textarea } from "@/components/ui/textarea"
import { usePreferences } from "@/contexts/preferences"
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import { ProgressBar } from "@/components/ui/progress-bar"
import { parseUtcDateAsLocal } from "@/lib/utc-date"
import { LinkifiedText } from "@/components/linkified-text"
import { getSupabaseBrowserClient } from "@/utils/supabase/client"

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

const DATE_TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
}

type TaskDateInfoItem = {
  label: string
  value: string
  color: string
}

type TaskDateInfoDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  dateItems: TaskDateInfoItem[]
  dateRange?: { from: Date; to: Date }
  startlineDateValue: Date | null
  todayStart: Date
  calendarComponents: Record<string, React.ComponentType<any>>
  remainingTimeLabel: string
}

const DATE_TIMELINE_HEIGHT_CLASS = "h-[36rem]"

function TaskDateInfoDialog({
  open,
  onOpenChange,
  dateItems,
  dateRange,
  startlineDateValue,
  todayStart,
  calendarComponents,
  remainingTimeLabel,
}: TaskDateInfoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-3xl rounded-[2.5rem] border-2 border-primary/30 bg-white px-8 py-6 text-left shadow-[0_20px_40px_rgba(72,68,110,0.2)]",
          "flex flex-col gap-6",
          DATE_TIMELINE_HEIGHT_CLASS,
          "overflow-hidden"
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[var(--task-hero-text)]">Date Timeline</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-hidden ">
          <div className="mt-4 overflow-hidden  flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8 min-h-0">
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {dateItems.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span
                    className="inline-flex h-3 w-3 rounded-full border border-primary/40"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.3em] text-primary/60">{item.label}</p>
                    <p className="text-sm font-semibold text-[var(--task-hero-text)]">{item.value || "—"}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3 flex-1">
              <div className="rounded-2xlborder border-primary/20 bg-primary/5 px-4 py-3 w-full max-w-[32rem] h-full">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  defaultMonth={startlineDateValue ?? new Date()}
                  className="h-full w-full rounded-[1.5rem] border-0 bg-transparent shadow-none"
                  disabled={{ before: startlineDateValue ?? new Date() }}
                  components={calendarComponents}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 shadow-inner">
          <p className="text-[0.65rem] uppercase tracking-[0.3em] text-primary/60">Remaining time</p>
          <p className="text-sm font-semibold text-[var(--task-hero-text)]">{remainingTimeLabel}</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}



type AssignerDialogProps = {
  label: string
  avatarUrl?: string | null
  departmentLabel?: string | null
  roleLabel: string
  statusNotice?: string | null
  showStatusNotice: boolean
  dialogOpen: boolean
  onTriggerClick: () => void
  onDialogOpenChange: (open: boolean) => void
  profile?: ProjectMemberDetail | null
  loading: boolean
  error: string | null
}

function AssignerDialog({
  label,
  avatarUrl,
  departmentLabel,
  roleLabel,
  statusNotice,
  showStatusNotice,
  dialogOpen,
  onTriggerClick,
  onDialogOpenChange,
  profile,
  loading,
  error,
}: AssignerDialogProps) {
  const isBlockedNotice =
    statusNotice ===
    "This task is blocked by the owner; you cannot edit or resubmit the submission."
  const noticeBaseClass =
    "rounded-[2rem] border px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em]"
  const noticeVariantClass = isBlockedNotice
    ? "border-destructive bg-destructive/10 text-destructive"
    : "border-primary/30 bg-primary/5 text-primary"
  return (
    <>
      <div className="space-y-2">
        {showStatusNotice && statusNotice ? (
          <div className={`${noticeBaseClass} ${noticeVariantClass}`}>
            {statusNotice}
          </div>
        ) : null}
        <div className="inline-flex max-w-max items-center justify-center px-3 py-2 text-lg font-semibold text-[var(--task-hero-text)] pl-8">
          Assigner
        </div>
        <button
          type="button"
          onClick={onTriggerClick}
          className="group -mt-3 flex w-full items-center gap-4 rounded-[1.75rem] border border-primary/30 bg-[var(--card)]/90 px-4 py-3 text-left shadow-[0_6px_15px_rgba(63,52,120,0.08)] transition hover:border-primary/50 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label={`View details for ${label}`}
        >
          <Avatar className="h-11 w-11 shrink-0">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={`${label} avatar`}
                width={44}
                height={44}
                className="h-full w-full rounded-full object-cover"
                priority
                data-cy="task-assigner-avatar"
              />
            ) : (
              <AvatarFallback className="bg-primary text-primary-foreground">
                {label.charAt(0).toUpperCase() || "A"}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex flex-1 flex-col gap-0.5">
            <p className="text-sm font-semibold text-[var(--task-hero-text)]">{label}</p>
            <p className="text-xs text-[var(--task-subtle-text)]">
              {departmentLabel ? `${departmentLabel} • ${roleLabel}` : roleLabel}
            </p>
          </div>
        </button>
      </div>
      <Dialog open={dialogOpen} onOpenChange={onDialogOpenChange}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] border-2 border-primary/30 bg-white px-7 py-7 shadow-[0_20px_40px_rgba(72,68,110,0.25)]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[var(--task-hero-text)]">View Assigner Details</DialogTitle>
          </DialogHeader>
          {loading ? (
            <p className="mx-auto mt-4 text-sm font-semibold text-[var(--task-subtle-text)]">Loading profile…</p>
          ) : error ? (
            <p className="mx-auto mt-4 text-sm font-semibold text-destructive">{error}</p>
          ) : (
            <div className="-mt-2 space-y-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-primary/20 bg-primary/5">
                  <Avatar className="h-20 w-20">
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt={`${label} avatar`}
                        width={80}
                        height={80}
                        className="h-full w-full rounded-full object-cover"
                        priority
                        data-cy="task-assigner-detail-avatar"
                      />
                    ) : (
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {label.charAt(0).toUpperCase() || "A"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </div>
                <div className="flex flex-1 flex-col gap-1 mt-2">
                  <p className="text-lg font-semibold text-[var(--task-hero-text)]">
                    {profile?.username ?? label}
                  </p>
                  <p className="text-sm font-semibold text-primary/70">
                    <span className="text-foreground/40">Department : </span>
                    {departmentLabel}
                  </p>
                  <p className="text-sm font-semibold text-primary/70">
                    <span className="text-foreground/40">Role : </span>
                    {roleLabel}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {profile?.email ? (
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">Email</p>
                    <p className="text-sm text-[var(--task-hero-text)]">{profile.email}</p>
                  </div>
                ) : null}
                <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">About me</p>
                <div className="asap-scroll max-h-[10rem] -mt-2 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-2 text-sm text-[var(--task-hero-text)] whitespace-pre-line">
                  <LinkifiedText value={profile?.bio?.length ? profile.bio : "No bio provided."} />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

type AssigneeListDialogProps = {
  assignees: ProjectMemberDetail[]
  open: boolean
  onOpenChange: (open: boolean) => void
  loading: boolean
  error: string | null
  onMemberSelect: (member: ProjectMemberDetail) => void
  resolveRoleLabel: (rawRole: string | null | undefined, options?: { departmentId?: string | null; username?: string | null }) => string
}

function AssigneeListDialog({
  assignees,
  open,
  onOpenChange,
  loading,
  error,
  onMemberSelect,
  resolveRoleLabel,
}: AssigneeListDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-white text-primary shadow-sm transition hover:border-primary/60 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="View assignee list"
        >
          <Info className="size-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-[2.5rem] border-2 border-primary/30 bg-white px-7 py-7 shadow-[0_20px_40px_rgba(72,68,110,0.25)]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[var(--task-hero-text)]">Assignees</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="mx-auto flex w-full max-w-sm flex-col gap-3 text-center">
            <p className="text-sm font-semibold text-[var(--task-subtle-text)]">Loading assignees…</p>
            <ProgressBar className="h-1.5 rounded-full" />
          </div>
        ) : error ? (
          <p className="mx-auto mt-4 text-sm font-semibold text-destructive">{error}</p>
        ) : (
          <div className="space-y-3">
            {assignees.map((assignee) => (
              <button
                key={assignee.id}
                type="button"
                onClick={() => onMemberSelect(assignee)}
                className="flex w-full items-center gap-3 rounded-[1.25rem] border border-primary/30 px-4 py-3 text-left shadow-[0_6px_0_rgba(63,52,120,0.08)] transition hover:border-primary hover:bg-primary/5 focus-visible:border-primary"
              >
                <Avatar className="h-10 w-10">
                  {assignee.avatarUrl ? (
                    <Image
                      src={assignee.avatarUrl}
                      alt={`${assignee.username || assignee.fullName} avatar`}
                      width={40}
                      height={40}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {assignee.username?.charAt(0).toUpperCase() ?? "M"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex flex-1 flex-col gap-0.5">
                  <p className="text-sm font-semibold text-[var(--task-hero-text)]">
                    {assignee.username || assignee.fullName || "Assignee"}
                  </p>
                  <p className="text-xs text-[var(--task-subtle-text)]">
                    {assignee.department?.name ?? "No department"} •{" "}
                    {resolveRoleLabel(assignee.role, {
                      departmentId: assignee.department?.id ?? null,
                      username: assignee.username,
                    })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}


type SubmissionAttachmentEntry = {
  id: string
  name: string
  url: string | null
  file?: File
  isExisting: boolean
}

type TaskSubmissionDialogContentProps = {
  submissionDescription: string
  onSubmissionDescriptionChange: (value: string) => void
  submissionFileEntries: SubmissionAttachmentEntry[]
  hasSubmission: boolean
  hasPendingSubmissionAcknowledgement: boolean
  onSubmissionFilesChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveSubmissionFile: (id: string) => void
  clearSubmissionFiles: () => void
  submissionError: string | null
  submittingSubmission: boolean
  effectiveHasSubmission: boolean
  onSubmit: () => Promise<void> | void
  onClose: () => void
  readOnly: boolean
}

function TaskSubmissionDialogContent({
  submissionDescription,
  onSubmissionDescriptionChange,
  submissionFileEntries,
  hasSubmission,
  hasPendingSubmissionAcknowledgement,
  onSubmissionFilesChange,
  onRemoveSubmissionFile,
  clearSubmissionFiles,
  submissionError,
  submittingSubmission,
  effectiveHasSubmission,
  onSubmit,
  onClose,
  readOnly,
}: TaskSubmissionDialogContentProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-base font-semibold text-[var(--task-hero-text)]">
          {readOnly ? "See Submission" : "Submit your task"}
        </DialogTitle>
        <DialogDescription className="text-xs text-[var(--task-subtle-text)]">
          {hasSubmission ? "Review your latest delivery." : "Add a description and upload files."}
        </DialogDescription>
      </DialogHeader>
      {hasPendingSubmissionAcknowledgement && (
        <div className="mt-1 rounded-[1.5rem] border border-primary/30 bg-[var(--task-description-bg)] px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary/80">
          Sent • awaiting review
        </div>
      )}
      {readOnly ? (
        <div className="mt-3 space-y-4">
          <div className="rounded-[1.5rem] border border-primary/20 bg-[var(--task-description-bg)] px-4 py-3 text-sm text-[var(--task-hero-text)]">
            <LinkifiedText value={submissionDescription || "No description provided."} />
          </div>
          <div className="text-xs uppercase tracking-[0.3em] text-primary/60">
            {submissionFileEntries.length > 0
              ? `${submissionFileEntries.length} files attached`
              : "No files attached"}
          </div>
          {submissionFileEntries.length > 0 && (
            <div className="asap-scroll [scrollbar-gutter:stable] max-h-[14rem] overflow-y-auto pr-1">
              <ul className="flex flex-wrap gap-3">
                {submissionFileEntries.map((entry) => {
                  const IconComponent = getFileTypeIcon(entry.name)
                  return (
                    <li
                      key={entry.id}
                      className="min-w-[12rem]"
                    >
                      <a
                        href={entry.url ?? "#"}
                        download={entry.name}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => {
                          if (!entry.url) {
                            event.preventDefault()
                          }
                        }}
                        className="flex w-full items-center gap-3 rounded-[1rem] border border-primary/30 bg-white px-3 py-2 shadow-[0_1px_6px_rgba(63,52,120,0.15)]"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-[0.85rem] bg-primary/10 text-primary">
                          <IconComponent className="size-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--task-hero-text)]">
                          {entry.name}
                        </span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          <label className="sr-only" htmlFor="submission-description">
            Submission description
          </label>
          <div className="textarea-surface group/textarea overflow-hidden rounded-[1.25rem]">
            <Textarea
              id="submission-description"
              value={submissionDescription}
              data-cy="project-task-detail-submission-description"
              onChange={(event) => onSubmissionDescriptionChange(event.target.value)}
              placeholder="Explain your submission…"
              className="min-h-[8rem] w-full resize-y rounded-[inherit] border-none bg-transparent px-4 py-3 text-sm shadow-none focus-visible:outline-none focus-visible:ring-0"
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
                  onClick={clearSubmissionFiles}
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
                  onChange={onSubmissionFilesChange}
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
                        onClick={() => onRemoveSubmissionFile(entry.id)}
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
      )}
      {!readOnly && submissionError && (
        <p className="mt-2 text-xs font-semibold text-destructive">{submissionError}</p>
      )}
      <DialogFooter className="mt-4 flex flex-wrap gap-3">
        {readOnly ? (
          <Button
            type="button"
            variant="ghost"
            data-cy="project-task-detail-submission-close"
            onClick={onClose}
            className="h-12 rounded-full px-6 text-sm font-semibold uppercase tracking-[0.3em]"
          >
            Close
          </Button>
        ) : (
          <>
            <Button
              type="button"
              data-cy="project-task-detail-submission-submit"
              onClick={onSubmit}
              disabled={submittingSubmission}
              className="inline-flex h-12 w-full max-w-xs items-center justify-center rounded-full px-8 text-sm font-semibold text-white shadow-[0_6px_0_rgba(63,52,120,0.2)] transition bg-[var(--task-cta-bg)] hover:bg-[var(--task-cta-hover)]"
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
              onClick={onClose}
              disabled={submittingSubmission}
              className="h-12 rounded-full px-6 text-sm font-semibold uppercase tracking-[0.3em]"
            >
              Cancel
            </Button>
          </>
        )}
      </DialogFooter>
    </>
  )
}

type TaskSubmissionPanelProps = {
  shouldShowWaitingHint: boolean
  hasSubmission: boolean
  effectiveHasSubmission: boolean
  canSubmitTask: boolean
  submissionDialogOpen: boolean
  setSubmissionDialogOpen: (open: boolean) => void
  submissionDialogProps: TaskSubmissionDialogContentProps
  feedbackMarker: string | null
  feedbackAcknowledgedMarker: string | null
  acknowledgingSubmission: boolean
  handleFeedbackAcknowledgement: (message: string) => void
  taskStatus: TaskStatus
  isAssignee: boolean
  interactionLocked: boolean
}

function TaskSubmissionPanel({
  shouldShowWaitingHint,
  hasSubmission,
  effectiveHasSubmission,
  canSubmitTask,
  submissionDialogOpen,
  setSubmissionDialogOpen,
  submissionDialogProps,
  feedbackMarker,
  feedbackAcknowledgedMarker,
  acknowledgingSubmission,
  handleFeedbackAcknowledgement,
  taskStatus,
  isAssignee,
  interactionLocked,
}: TaskSubmissionPanelProps) {
  const isSeeYourTaskMode =
    hasSubmission &&
    !canSubmitTask &&
    (taskStatus === "BLOCKED" || taskStatus === "SUBMITTED")
  const showSubmissionButton = isAssignee && (canSubmitTask || !hasSubmission || isSeeYourTaskMode)
  const descriptionText = isSeeYourTaskMode
    ? "Submission recorded. Please wait for the owner or assignee to review and approve it."
    : shouldShowWaitingHint
      ? "Edit your submission to send a new version for approval."
      : hasSubmission
        ? "Submission recorded. Please wait for the owner or assignee to review and approve it."
        : "Once you submit your work it will appear here for review."
  const shouldShowAckButton =
    shouldShowWaitingHint &&
    Boolean(feedbackMarker) &&
    !feedbackAcknowledgedMarker
  const waitingFeedbackLabel = feedbackMarker ?? "latest"
  return (
    <div className="rounded-[2rem] border border-primary/30 bg-white/95 px-6 py-5 shadow-inner">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-[var(--task-hero-text)]">
            {isSeeYourTaskMode ? "See your Task" : "Submission"}
          </p>
          <p className="text-xs text-[var(--task-subtle-text)]">{descriptionText}</p>
        </div>
        {showSubmissionButton && (
          <Dialog open={submissionDialogOpen} onOpenChange={setSubmissionDialogOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                data-cy="project-task-detail-submission-button"
                disabled={interactionLocked}
                className={`h-11 rounded-full px-6 text-xs font-semibold uppercase tracking-[0.3em] shadow-[0_6px_0_rgba(63,52,120,0.2)] transition ${
                  effectiveHasSubmission
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "bg-[var(--task-status-in-progress-bg)] text-[var(--task-status-in-progress-text)] border border-primary/30 hover:border-primary/60 hover:bg-white"
                }`}
              >
                {isSeeYourTaskMode ? "See Submission" : hasSubmission ? "Edit Submission" : "Submit Work"}
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] border border-primary/30 bg-white/95 px-6 py-6 shadow-[0_20px_60px_rgba(63,52,120,0.2)]">
              <TaskSubmissionDialogContent {...submissionDialogProps} />
            </DialogContent>
          </Dialog>
        )}
      </div>
      {shouldShowAckButton && (
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            data-cy="project-task-detail-submission-waiting-acknowledge"
            onClick={() =>
              handleFeedbackAcknowledgement(
                `You read the ${waitingFeedbackLabel} feedback.`,
              )
            }
            disabled={acknowledgingSubmission}
            className="inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white shadow-[0_4px_0_rgba(63,52,120,0.2)] transition hover:bg-primary/90 disabled:opacity-60 disabled:hover:bg-primary"
          >
            {acknowledgingSubmission ? "Marking..." : "Mark as seen"}
          </Button>
        </div>
      )}
    </div>
  )
}


type TaskFeedbackPanelProps = {
  feedbackMarker: string | null
  feedbackAcknowledgedMarker: string | null
  acknowledgingSubmission: boolean
  lastReviewerComment: string | null
  handleFeedbackAcknowledgement: (message: string) => void
}

function TaskFeedbackPanel({
  feedbackMarker,
  feedbackAcknowledgedMarker,
  acknowledgingSubmission,
  lastReviewerComment,
  handleFeedbackAcknowledgement,
}: TaskFeedbackPanelProps) {
  return (
    <div className="rounded-[2rem] border border-primary/30 bg-white/90 px-6 py-5 shadow-inner space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-semibold text-[var(--task-hero-text)]">Review feedback</p>
        <div className="flex items-center gap-3">
          {feedbackMarker && feedbackAcknowledgedMarker ? (
            <p className="text-xs uppercase tracking-[0.3em] text-primary/70">
              Seen at {feedbackAcknowledgedMarker}
            </p>
          ) : feedbackMarker ? (
            <Button
              type="button"
              data-cy="project-task-detail-feedback-acknowledge"
              onClick={() =>
                handleFeedbackAcknowledgement(
                  `You read the ${feedbackMarker ?? "latest"} feedback.`,
                )
              }
              disabled={acknowledgingSubmission}
              className="inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white shadow-[0_4px_0_rgba(63,52,120,0.2)] transition hover:bg-primary/90 disabled:opacity-60 disabled:hover:bg-primary"
            >
              {acknowledgingSubmission ? "Marking..." : "Mark as seen"}
            </Button>
          ) : (
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/60">
              Waiting for owner response
            </span>
          )}
        </div>
      </div>
      <div className="dialog-scroll asap-scroll rounded-[1.5rem] min-h-[6rem] max-h-[12rem] overflow-y-auto overflow-x-hidden border-2 border-primary/30 bg-primary/5 px-4 py-3 text-sm text-[var(--task-hero-text)] whitespace-pre-line break-words">
        <LinkifiedText value={lastReviewerComment ?? "No reviewer comment yet."} />
      </div>
    </div>
  )
}


type TaskSubmissionDetailsPanelProps = {
  submissionMarker: string | null
  hasPendingSubmissionAcknowledgement: boolean
  acknowledgingSubmission: boolean
  taskSubmission: TaskSubmission | null | undefined
  handleSubmissionAcknowledgement: (message: string) => void
}

function TaskSubmissionDetailsPanel({
  submissionMarker,
  hasPendingSubmissionAcknowledgement,
  acknowledgingSubmission,
  taskSubmission,
  handleSubmissionAcknowledgement,
}: TaskSubmissionDetailsPanelProps) {
  return (
    <div className="rounded-[2rem] border border-primary/30 bg-white/95 px-6 py-5 shadow-inner space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-base font-semibold text-[var(--task-hero-text)]">Submission Details</p>
          {submissionMarker && (
            <p className="text-xs uppercase tracking-[0.3em] text-primary/70">
              {hasPendingSubmissionAcknowledgement ? `New submission: ${submissionMarker}` : `Last submission: ${submissionMarker}`}
            </p>
          )}
        </div>
        {hasPendingSubmissionAcknowledgement && (
            <Button
              type="button"
              data-cy="project-task-detail-submission-acknowledge"
              onClick={() =>
                handleSubmissionAcknowledgement("You acknowledged the assignee's submission.")
              }
              disabled={acknowledgingSubmission}
              className="inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white shadow-[0_4px_0_rgba(63,52,120,0.2)] transition hover:bg-primary/90 disabled:opacity-60 disabled:hover:bg-primary"
            >
              {acknowledgingSubmission ? "Marking..." : "Mark as seen"}
            </Button>
        )}
      </div>
      <div className="asap-scroll rounded-[1.5rem] min-h-[6rem] max-h-[12rem] overflow-auto border-2 border-primary/30 bg-[var(--task-description-bg)] px-4 py-3 text-sm text-[var(--task-hero-text)] whitespace-pre-line">
        <LinkifiedText value={taskSubmission?.description ?? "No description provided."} />
      </div>
      {taskSubmission?.attachments && taskSubmission.attachments.length > 0 && (
        <div className="space-y-2 text-sm text-primary">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--task-subtle-text)]">Attachments</p>
          <div className="asap-scroll flex flex-wrap gap-3 max-h-[10rem] overflow-y-auto pr-1">
            {taskSubmission.attachments.map((attachment) => {
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
  )
}


type TaskReviewSectionProps = {
  status: TaskStatus
  setStatus: React.Dispatch<React.SetStateAction<TaskStatus>>
  statusColors: { background: string; text: string }
  selectedStatusLabel: string
  reviewComment: string
  onReviewCommentChange: (value: string) => void
  reviewError: string | null
  handleReviewSubmit: () => Promise<void>
  reviewing: boolean
  interactionLocked: boolean
}

function TaskReviewSection({
  status,
  setStatus,
  statusColors,
  selectedStatusLabel,
  reviewComment,
  onReviewCommentChange,
  reviewError,
  handleReviewSubmit,
  reviewing,
  interactionLocked,
}: TaskReviewSectionProps) {
  return (
    <div className="rounded-[2rem] border border-primary/30 bg-white/95 px-6 py-5 shadow-inner space-y-4">
      <div className="space-y-1">
        <p className="text-base font-semibold text-[var(--task-hero-text)]">Review submission</p>
        <p className="text-xs text-[var(--task-subtle-text)]">Provide feedback and set the task status before sending the response.</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
        <span className="text-base font-semibold text-[var(--task-hero-text)] sm:flex-shrink-0">Task Status :</span>
        <div className="w-full sm:flex-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={reviewing || interactionLocked}
                className="flex w-full items-center justify-between rounded-full border-2 border-primary/40 px-6 py-3 text-sm font-semibold shadow-[0_6px_0_rgba(144,122,214,0.2)] transition hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:border-primary/20 disabled:bg-muted"
                style={{
                  backgroundColor: statusColors.background,
                  color: statusColors.text,
                  borderColor: statusColors.background,
                }}
              >
                <span className="flex items-center gap-3 text-left">
                  <span className="h-3 w-3 rounded-full border border-primary/30" style={{ backgroundColor: statusColors.background }} />
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
                    onSelect={() => {
                      if (reviewing || interactionLocked) {
                        return
                      }
                      setStatus(value as TaskStatus)
                    }}
                    className={`rounded-2xl px-3 py-2 focus:bg-primary/10 focus:text-primary ${isActive ? "bg-primary/10 text-primary" : ""}`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full border border-primary/30" style={{ backgroundColor: itemColors.background }} />
                      {label}
                    </span>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="textarea-surface group/textarea overflow-hidden rounded-[1.25rem]">
        <Textarea
          value={reviewComment}
          onChange={(event) => onReviewCommentChange(event.target.value)}
          data-cy="project-task-detail-review-comment"
          className="project-detail-scroll min-h-[8rem] w-full border-none bg-transparent px-4 py-3 text-sm shadow-none focus-visible:outline-none focus-visible:ring-0"
          placeholder="Share feedback…"
          disabled={reviewing || interactionLocked}
        />
      </div>
      {reviewError && <p className="mt-2 text-xs font-semibold text-destructive">{reviewError}</p>}
      <Button
        type="button"
        data-cy="project-task-detail-review-submit"
        onClick={handleReviewSubmit}
        disabled={reviewing || interactionLocked}
        className="inline-flex h-12 w-full items-center justify-center rounded-full border border-primary/30 bg-[var(--task-description-bg)] px-8 text-sm font-semibold text-[var(--task-hero-text)] shadow-[0_6px_0_rgba(63,52,120,0.2)] transition hover:bg-[var(--task-description-bg-hover)]"
      >
        {reviewing ? "Sending…" : "Send review"}
      </Button>
    </div>
  )
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
  const navigateBackToTaskList = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
      return
    }
    if (projectId) {
      router.push(`/projects/${projectId}/task`)
      return
    }
    router.push("/projects")
  }, [projectId, router])
  const supabase = React.useMemo(
    () => (typeof window === "undefined" ? null : getSupabaseBrowserClient()),
    []
  )
  const [task, setTask] = useState<TaskRecord | null>(null)
  const [status, setStatus] = useState<TaskStatus>("IN_PROGRESS")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [membership, setMembership] = useState<ProjectMembershipSummary | null>(null)
  const [membershipLoading, setMembershipLoading] = useState(true)
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
  const feedbackNotifiedRef = React.useRef<string | null>(null)
  const formatTimestampLabel = useCallback((value: string | null) => {
    if (!value) {
      return null
    }
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return null
    }
    return date.toLocaleString()
  }, [])
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
  const [departmentHeadMap, setDepartmentHeadMap] = useState<Record<string, string | null>>({})
  const loadTask = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        cache: "no-store",
      })
      if (response.status === 404) {
        notify({
          title: "Task unavailable",
          description: "This task no longer exists or you no longer have access.",
          variant: "destructive",
        })
        navigateBackToTaskList()
        return
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
  }, [navigateBackToTaskList, notify, projectId, taskId])

  React.useEffect(() => {
    loadTask()
  }, [loadTask])

  React.useEffect(() => {
    let active = true
    const loadDepartments = async () => {
      if (!projectId) {
        return
      }
      try {
        const departments = await fetchProjectDepartments(projectId)
        if (!active) {
          return
        }
        const map = departments.reduce<Record<string, string | null>>((acc, dept) => {
          acc[dept.id] = dept.head ?? null
          return acc
        }, {})
        setDepartmentHeadMap(map)
      } catch (error) {
        console.error("Failed to load departments for role labels", error)
      }
    }
    void loadDepartments()
    return () => {
      active = false
    }
  }, [projectId])

  const resolveRoleLabel = useCallback(
    (
      rawRole: string | null | undefined,
      options?: { departmentId?: string | null; username?: string | null },
    ) => {
      const roleKey = rawRole ?? "MEMBER"
      const baseLabel = ROLE_LABEL_MAP[roleKey] ?? "Member"
      if (roleKey !== PROJECT_ROLE.OWNER) {
        return baseLabel
      }
      const departmentId = options?.departmentId ?? null
      const username = options?.username ?? null
      const headUsername =
        departmentId && departmentHeadMap[departmentId] !== undefined
          ? departmentHeadMap[departmentId]
          : null
      if (!departmentId || !username || !headUsername) {
        return "Member (Project Owner)"
      }
      const isDepartmentHead = headUsername === username
      return isDepartmentHead ? "Header (Project Owner)" : "Member (Project Owner)"
    },
    [departmentHeadMap],
  )

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

  const handleAssigneeDialogOpenChange = useCallback(
    (open: boolean) => {
      setAssigneeDialogOpen(open)
      if (open) {
        void loadAssigneeList()
      }
    },
    [loadAssigneeList]
  )

  const handleAssigneeDetailView = useCallback((member: ProjectMemberDetail) => {
    setAssigneeDetailTarget(member)
    setAssigneeDetailOpen(true)
  }, [])

  const handleAssigneeDetailClose = useCallback((open: boolean) => {
    setAssigneeDetailOpen(open)
  }, [])

  const resolvedAssigneeList = React.useMemo<ProjectMemberDetail[]>(() => {
    if (assigneeList && assigneeList.length > 0) {
      return assigneeList
    }
    if (!task?.assignees?.length) {
      return []
    }
    return task.assignees.map((assignee) => ({
      id: assignee.id,
      projectId,
      userId: assignee.id,
      role: PROJECT_ROLE.MEMBER,
      username: assignee.username,
      email: null,
      fullName: assignee.fullName,
      avatarUrl: assignee.avatarUrl,
      bio: null,
      department: task.department,
      lastSeenAt: null,
    } as ProjectMemberDetail))
  }, [assigneeList, projectId, task])

  const submissionUpdatedAtRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    const submission = task?.submission
    if (!submission) {
      submissionUpdatedAtRef.current = null
      setSubmissionMarker(null)
      setFeedbackMarker(null)
      setSubmissionAcknowledgedMarker(null)
      setFeedbackAcknowledgedMarker(null)
      return
    }
    const updatedAt = submission.updatedAt ?? null
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
    const markerLabel = formatTimestampLabel(updatedAt)
    const ownerAcknowledgedLabel = formatTimestampLabel(submission.ownerAcknowledgedAt ?? null)
    const reviewerAcknowledgedLabel = formatTimestampLabel(submission.acknowledgedAt ?? null)
    const reviewerCommentPresent = Boolean(submission.reviewerComment?.trim())
    const treatAsFeedback = reviewerCommentPresent && !ownerAcknowledgedLabel
    if (reviewerCommentPresent) {
      setFeedbackMarker(markerLabel)
      setFeedbackAcknowledgedMarker(ownerAcknowledgedLabel)
    } else {
      setFeedbackMarker(null)
      setFeedbackAcknowledgedMarker(null)
    }
    if (treatAsFeedback) {
      setSubmissionMarker(null)
      setSubmissionAcknowledgedMarker(null)
    } else {
      setSubmissionMarker(markerLabel)
      setSubmissionAcknowledgedMarker(reviewerAcknowledgedLabel)
    }
  }, [task?.submission, formatTimestampLabel])

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

  const { timezone: userTimezone } = usePreferences()

  const formatDateTime = useCallback(
    (
      value: string | Date | null,
      options?: {
        treatAsLocal?: boolean
      }
    ) => {
      if (!value) {
        return "—"
      }
      if (options?.treatAsLocal) {
        let date: Date | null = null
        if (value instanceof Date) {
          date = value
        } else {
          date = parseUtcDateAsLocal(value)
        }
        if (!date) {
          return "—"
        }
        return format(date, "dd/MM/yyyy HH:mm")
      }
      const date = value instanceof Date ? value : new Date(value)
      if (Number.isNaN(date.getTime())) {
        return "—"
      }
      const safeFormat = (zone?: string) => {
        if (typeof Intl === "undefined") {
          return null
        }
        try {
          return new Intl.DateTimeFormat("en-GB", {
            ...DATE_TIME_FORMAT_OPTIONS,
            timeZone: zone,
          }).format(date)
        } catch {
          return null
        }
      }
      const formatted =
        safeFormat(userTimezone ?? undefined) ?? safeFormat(undefined) ?? date.toISOString()
      return formatted.replace(/\s*,\s*/, " ")
    },
    [userTimezone],
  )

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
  const isAssignee = Boolean(membership) && isAssignedMember
  const taskBlocked = status === "BLOCKED"
  const taskComplete = status === "SUBMITTED"
  const canSubmitTask = isAssignee && !taskBlocked && !taskComplete
  const savedTaskStatus = task?.status
  const assigneeStatusNotice =
    savedTaskStatus === "BLOCKED"
      ? "This task is blocked by the owner; you cannot edit or resubmit the submission."
      : savedTaskStatus === "SUBMITTED"
        ? "The owner accepted this submission, so no more edits are allowed."
        : null
  const viewerHasReviewPrivileges =
    membership?.role === PROJECT_ROLE.OWNER || membership?.role === PROJECT_ROLE.HEADER
  const reviewerOrAssigner = viewerIsAssigner || viewerHasReviewPrivileges
  const canReviewSubmission = reviewerOrAssigner && Boolean(task?.submission)
  const ownerViewingSubmission = reviewerOrAssigner && Boolean(task?.submission)
  const assignedMemberWaitingReview = isAssignee

  const detailUrl = React.useMemo(() => `/projects/${projectId}/task/${taskId}`, [projectId, taskId])
  const pendingSubmissionNotifyRef = React.useRef<string | null>(null)
  const pendingFeedback = Boolean(feedbackMarker) && !feedbackAcknowledgedMarker
  /*React.useEffect(() => {
    if (!isAssignee) {
      feedbackNotifiedRef.current = null
      return
    }
    if (pendingFeedback && feedbackMarker) {
      if (feedbackNotifiedRef.current !== feedbackMarker) {
        notify({
          title: "New feedback",
          description: task?.submission?.reviewerComment ?? "Submission feedback is ready.",
          variant: "info",
          href: detailUrl,
        })
        feedbackNotifiedRef.current = feedbackMarker
      }
    } else {
      feedbackNotifiedRef.current = null
    }
  }, [detailUrl, feedbackMarker, isAssignee, notify, pendingFeedback, task?.submission?.reviewerComment])*/

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
      const isUpdatingSubmission = Boolean(task?.submission)
      const submissionPayload: Record<string, unknown> = {
        description: submissionDescription,
        attachments: filteredAttachments,
      }
      if (isUpdatingSubmission && task?.submission?.id) {
        submissionPayload.submissionId = task.submission.id
      }
      const response = await fetch(
        `/api/projects/${projectId}/tasks/${taskId}/submission`,
        {
          method: isUpdatingSubmission ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(submissionPayload),
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
      notify({
        title: isUpdatingSubmission ? "Submission updated" : "Submission submitted",
        description: isUpdatingSubmission
          ? "Your submission changes have been saved."
          : "Your submission has been delivered for review.",
        variant: "success",
      })
    } catch (submitError) {
      console.error(submitError)
      setSubmissionError(
        submitError instanceof Error ? submitError.message : "Unable to submit task"
      )
      notify({
        title: "Submission failed",
        description:
          submitError instanceof Error ? submitError.message : "Unable to submit task",
        variant: "destructive",
      })
    } finally {
      setSubmittingSubmission(false)
    }
  }

  const handleSubmissionAcknowledgement = useCallback(
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
        setSubmissionAcknowledgedMarker(
          formatTimestampLabel(result.submission.acknowledgedAt ?? null),
        )
        notify({
          title: notifyTitle,
          description: notifyDescription,
          variant: "success",
        })
        feedbackNotifiedRef.current = null
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
    },
    [projectId, taskId, task, notify, formatTimestampLabel],
  )

  const handleFeedbackAcknowledgement = useCallback(
    async (notifyDescription: string, notifyTitle = "Feedback seen") => {
      if (!task) {
        return
      }
      setAcknowledgingSubmission(true)
      try {
        const response = await fetch(
          `/api/projects/${projectId}/tasks/${taskId}/submission/owner-acknowledge`,
          {
            method: "POST",
          },
        )
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(
            typeof payload?.error === "string"
              ? payload.error
              : "Unable to mark feedback as seen"
          )
        }
        const result = (await response.json()) as { submission: TaskSubmission }
        setTask((prev) => (prev ? { ...prev, submission: result.submission } : prev))
        setFeedbackAcknowledgedMarker(
          formatTimestampLabel(result.submission.ownerAcknowledgedAt ?? null),
        )
        notify({
          title: notifyTitle,
          description: notifyDescription,
          variant: "success",
        })
        feedbackNotifiedRef.current = null
      } catch (ackError) {
        console.error(ackError)
        notify({
          title: "Acknowledgement failed",
          description:
            ackError instanceof Error
              ? ackError.message
              : "Unable to mark feedback as seen",
          variant: "destructive",
        })
      } finally {
        setAcknowledgingSubmission(false)
      }
    },
    [projectId, taskId, task, notify, formatTimestampLabel],
  )

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
    let latestSubmission: TaskSubmission | null = null
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
          typeof payload?.error === "string"
            ? payload.error
            : "Unable to update submission"
        throw new Error(message)
      }
      const submissionResult = (await response.json()) as { submission: TaskSubmission }
      latestSubmission = submissionResult.submission

      const taskResponse = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
        }),
      })
      if (!taskResponse.ok) {
        const payload = await taskResponse.json().catch(() => null)
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : "Unable to update task status"
        throw new Error(message)
      }
      const updatedTask = (await taskResponse.json()) as TaskRecord
      setTask(updatedTask)
      setStatus(status)
      const reviewerComment = updatedTask.submission?.reviewerComment ?? null
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
        description: "Submission feedback has been delivered to the assignee.",
        variant: "success",
      })
    } catch (reviewErr) {
      console.error(reviewErr)
      if (latestSubmission) {
        setTask((prev) => (prev ? { ...prev, submission: latestSubmission } : prev))
      }
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
    navigateBackToTaskList()
  }, [navigateBackToTaskList])

  const assignDateValue = useMemo(() => parseUtcDateAsLocal(task?.createdAt ?? null), [task?.createdAt])
  const startlineDateValue = useMemo(() => {
    if (!task?.startDate) return assignDateValue
    const parsed = parseUtcDateAsLocal(task.startDate)
    return parsed ?? assignDateValue
  }, [assignDateValue, task?.startDate])
  const deadlineDateValue = useMemo(() => {
    if (!task?.dueDate) return startlineDateValue
    const parsed = parseUtcDateAsLocal(task.dueDate)
    return parsed ?? startlineDateValue
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
  const assignDateLabel = formatDateTime(task?.createdAt ?? null)
  const startlineDateLabel = formatDateTime(startlineDateValue ?? null, { treatAsLocal: true })
  const deadlineDateLabel = formatDateTime(deadlineDateValue ?? null, { treatAsLocal: true })
  const heroBackground = task?.cardColor ?? "var(--task-hero-background)"
  const heroTextColor = task?.cardTextColor ?? "var(--task-hero-text)"
  const statusColors = TASK_STATUS_COLORS[status]
  const submissionRecord = task?.submission
  const hasSubmission = Boolean(submissionRecord)
  const waitingForOwnerResponse =
    Boolean(submissionRecord && submissionRecord.status === "SUBMITTED" && !submissionRecord.acknowledgedAt)
  const effectiveHasSubmission = hasSubmission && !waitingForOwnerResponse
  const shouldShowWaitingHint = hasSubmission && !effectiveHasSubmission
  const hasPendingSubmissionAcknowledgement = waitingForOwnerResponse
  const assignerAvatarUrl = task?.createdBy?.avatarUrl ?? assignerProfile?.avatarUrl
  const assignerDepartmentLabel =
    task?.department?.name ?? assignerProfile?.department?.name ?? null
  const roleValue = assignerProfile?.role ?? task?.createdBy?.role ?? "MEMBER"
  const assignerRoleLabel = resolveRoleLabel(roleValue, {
    departmentId: assignerProfile?.department?.id ?? null,
    username: assignerProfile?.username ?? task?.createdBy?.username ?? null,
  })
  const todayDateLabel = formatDateTime(new Date())
  const todayStart = React.useMemo(() => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
  }, [])

  React.useEffect(() => {
    if (!viewerIsAssigner) {
      pendingSubmissionNotifyRef.current = null
      return
    }
    if (hasPendingSubmissionAcknowledgement && submissionMarker) {
      if (pendingSubmissionNotifyRef.current !== submissionMarker) {
        /*notify({
          title: "Submission awaiting review",
          description: `Assignee submitted "${task?.title ?? "this task"}" and awaits your acknowledgement.`,
          variant: "info",
          href: detailUrl,
        })*/
        pendingSubmissionNotifyRef.current = submissionMarker
      }
    } else {
      pendingSubmissionNotifyRef.current = null
    }
  }, [detailUrl, hasPendingSubmissionAcknowledgement, notify, submissionMarker, task?.title, viewerIsAssigner])
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
        <CalendarDayButton
          {...props}
          className={cn(
            "pointer-events-none",
            dayClassName(props.day.date)
          )}
        />
      ),
    }),
    [dayClassName]
  )

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-full flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div className="flex min-h-[11rem] w-full max-w-xl flex-col items-center justify-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-6 text-sm text-primary shadow-[0_6px_0_rgba(144,122,214,0.15)]">
          <span className="text-base font-semibold">Loading task…</span>
          <div className="w-full max-w-sm">
            <ProgressBar />
          </div>
        </div>
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="mx-auto flex w-full max-w-full flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
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
    <div className="flex w-full max-w-full flex-col items-start gap-4 lg:flex-row lg:items-start lg:gap-6">
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

        <div className="mx-auto mt-20 flex w-full max-w-full flex-1 flex-col gap-10 px-[clamp(1.5rem,3.4vw,3.85rem)]">
          <div className="relative mt-3 w-full max-w-3xl self-center">
          <div
            className="absolute -top-11 left-0 z-0
                      flex min-h-[8rem] min-w-[16rem] items-center justify-center
                      rounded-[2.5rem] border-2
                      px-6 py-4 text-xl font-bold shadow-[0_6px_0_rgba(144,122,214,0.15)]"
            style={{
              backgroundColor: heroBackground,
              color: heroTextColor,
              borderColor: heroTextColor,
            }}
          >
            <span className="-translate-y-10 transform">{task.title}</span>
          </div>
          <section
            className="relative z-10 flex w-full flex-col gap-8
                      rounded-[3.5rem] border-2
                      px-[clamp(1.5rem,3.2vw,3rem)] pb-10 pt-8
                      shadow-[0_6px_0_rgba(144,122,214,0.15)]"
            style={{
              backgroundColor: "var(--task-detail-card-bg)",
              borderColor: "var(--task-detail-card-border)",
            }}
          >
            <div className="space-y-4 w-full max-w-2xl self-center">
              <AssignerDialog
                label={assignerLabel}
                avatarUrl={assignerAvatarUrl}
                departmentLabel={assignerDepartmentLabel}
                roleLabel={assignerRoleLabel}
                statusNotice={assigneeStatusNotice}
                showStatusNotice={isAssignee && !canSubmitTask && Boolean(assigneeStatusNotice)}
                dialogOpen={assignerDialogOpen}
                onTriggerClick={handleAssignerClick}
                onDialogOpenChange={handleAssignerDialogChange}
                profile={assignerProfile}
                loading={assignerProfileLoading}
                error={assignerProfileError}
              />
              <h2 className="text-lg font-semibold text-[var(--task-hero-text)] pl-8">Task Description</h2>
              <div className="rounded-[1.5rem] -mt-3 min-h-[10rem] max-h-[10rem] asap-scroll border-2 border-primary/30 bg-primary/5 px-4 py-2 text-sm text-[var(--task-hero-text)] whitespace-pre-line">
                <LinkifiedText value={description || "No details provided."} />
              </div>
            </div>

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
                              data-cy="task-assignee-detail-avatar"
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
                          {resolveRoleLabel(assigneeDetailTarget.role, {
                            departmentId: assigneeDetailTarget.department?.id ?? null,
                            username: assigneeDetailTarget.username,
                          })}
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
                    <AssigneeListDialog
                      assignees={resolvedAssigneeList}
                      open={assigneeDialogOpen}
                      onOpenChange={handleAssigneeDialogOpenChange}
                      loading={assigneeDialogLoading}
                      error={assigneeDialogError}
                      onMemberSelect={handleAssigneeDetailView}
                      resolveRoleLabel={resolveRoleLabel}
                    />
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
            <TaskDateInfoDialog
              open={dateInfoOpen}
              onOpenChange={setDateInfoOpen}
              dateItems={dateItems}
              dateRange={dateRange}
              startlineDateValue={startlineDateValue}
              todayStart={todayStart}
              calendarComponents={calendarComponents}
              remainingTimeLabel={remainingTimeLabel}
            />

            <div className="space-y-6 w-full max-w-2xl">

              {isAssignee && (
                <TaskSubmissionPanel
                  shouldShowWaitingHint={shouldShowWaitingHint}
                  hasSubmission={hasSubmission}
                  effectiveHasSubmission={effectiveHasSubmission}
                  canSubmitTask={canSubmitTask}
                  submissionDialogOpen={submissionDialogOpen}
                  setSubmissionDialogOpen={setSubmissionDialogOpen}
                  submissionDialogProps={{
                    submissionDescription,
                    onSubmissionDescriptionChange: setSubmissionDescription,
                    submissionFileEntries,
                    onSubmissionFilesChange: handleSubmissionFilesChange,
                    onRemoveSubmissionFile: handleRemoveSubmissionFile,
                    clearSubmissionFiles: () => setSubmissionFileEntries([]),
                    submissionError,
                    submittingSubmission,
                    effectiveHasSubmission,
                    hasSubmission,
                    hasPendingSubmissionAcknowledgement,
                    onSubmit: handleSubmissionSubmit,
                    onClose: () => setSubmissionDialogOpen(false),
                    readOnly: !canSubmitTask,
                  }}
                  feedbackMarker={feedbackMarker}
                  feedbackAcknowledgedMarker={feedbackAcknowledgedMarker}
                  acknowledgingSubmission={acknowledgingSubmission}
                  handleFeedbackAcknowledgement={handleFeedbackAcknowledgement}
                  taskStatus={status}
                  isAssignee={isAssignee}
                  interactionLocked={acknowledgingSubmission}
                />
              )}

              {reviewerOrAssigner && !canSubmitTask && !ownerViewingSubmission && (
                <div className="rounded-[2rem] border border-dashed border-primary/40 bg-white/70 px-6 py-5 text-sm font-medium text-[var(--task-hero-text)] shadow-inner">
                  <p className="text-base font-semibold text-primary">Awaiting Submission</p>
                  <p className="mt-1 text-sm text-[var(--task-subtle-text)]">
                    Waiting for the assignee to submit their work so you can review it and send feedback back.
                  </p>
                </div>
              )}

              {assignedMemberWaitingReview && (
                <TaskFeedbackPanel
                  feedbackMarker={feedbackMarker}
                  feedbackAcknowledgedMarker={feedbackAcknowledgedMarker}
                  acknowledgingSubmission={acknowledgingSubmission}
                  lastReviewerComment={lastReviewerComment}
                  handleFeedbackAcknowledgement={handleFeedbackAcknowledgement}
                />
              )}


              {viewerIsAssigner && ownerViewingSubmission && (
                <TaskSubmissionDetailsPanel
                  submissionMarker={submissionMarker}
                  hasPendingSubmissionAcknowledgement={hasPendingSubmissionAcknowledgement}
                  acknowledgingSubmission={acknowledgingSubmission}
                  taskSubmission={task.submission}
                  handleSubmissionAcknowledgement={handleSubmissionAcknowledgement}
                />
              )}


              {viewerIsAssigner && canReviewSubmission && (
                <TaskReviewSection
                  status={status}
                  setStatus={setStatus}
                  statusColors={statusColors}
                  selectedStatusLabel={selectedStatusLabel}
                  reviewComment={reviewComment}
                  onReviewCommentChange={setReviewComment}
                  reviewError={reviewError}
                  handleReviewSubmit={handleReviewSubmit}
                  reviewing={reviewing}
                  interactionLocked={acknowledgingSubmission}
                />
              )}

            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
)
}
