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
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  SUBMITTED: "Submitted",
  IN_PROGRESS: "In Progress",
  BLOCKED: "Blocked",
}

export const TASK_STATUS_STYLE: Record<TaskStatus, string> = {
  SUBMITTED: "bg-[#D7C7FF] text-[#392069]",
  IN_PROGRESS: "bg-white text-[#392069]",
  BLOCKED: "bg-[#FFE2E2] text-[#392069]",
}

export const DEFAULT_TASKS: TaskRecord[] = []
