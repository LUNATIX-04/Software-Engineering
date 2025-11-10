export type TaskStatus = "SUBMITTED" | "IN_PROGRESS" | "BLOCKED"

export type TaskAssignee = {
  id: string
  username: string
  fullName: string | null
  departmentId: string | null
}

export type TaskDepartment = {
  id: string
  name: string
  color: string
  textColor: string
}

export type TaskRecord = {
  id: string
  title: string
  detail: string | null
  status: TaskStatus
  startDate: string | null
  dueDate: string | null
  department: TaskDepartment | null
  assignees: TaskAssignee[]
  createdBy: {
    id: string
    username: string
    fullName: string | null
    role: string
  }
  createdAt: string
  updatedAt: string
  cardColor: string
  cardTextColor: string
  submission: TaskSubmission | null
}

export type TaskSubmission = {
  id: string
  status: "SUBMITTED" | "REVISION_REQUESTED" | "APPROVED"
  description: string | null
  reviewerComment: string | null
  attachments: Array<{ name: string; url: string }> | null
  submittedBy: {
    id: string
    username: string
    role: string
  }
  reviewer: {
    id: string
    username: string
    role: string
  } | null
  createdAt: string
  updatedAt: string
  acknowledgedAt: string | null
  ownerAcknowledgedAt: string | null
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  SUBMITTED: "Submitted",
  IN_PROGRESS: "In Progress",
  BLOCKED: "Blocked",
}

export const TASK_STATUS_STYLE: Record<TaskStatus, string> = {
  SUBMITTED:
    "bg-[var(--task-status-submitted-bg)] text-[var(--task-status-submitted-text)]",
  IN_PROGRESS:
    "bg-[var(--task-status-in-progress-bg)] text-[var(--task-status-in-progress-text)]",
  BLOCKED:
    "bg-[var(--task-status-blocked-bg)] text-[var(--task-status-blocked-text)]",
}

export const DEFAULT_TASKS: TaskRecord[] = []
