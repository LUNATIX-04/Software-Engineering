export type TaskStatus = "submitted" | "in-progress" | "blocked"

export type TaskRecord = {
  id: string
  title: string
  deadline: string
  assignees: string[]
  department: string
  status: TaskStatus
  description: string
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  submitted: "Submitted",
  "in-progress": "In Progress",
  blocked: "Blocked",
}

export const TASK_STATUS_STYLE: Record<TaskStatus, string> = {
  submitted: "bg-[#D7C7FF] text-[#392069]",
  "in-progress": "bg-white text-[#392069]",
  blocked: "bg-[#FFE2E2] text-[#392069]",
}

export const DEPARTMENTS = ["All Departments", "Registration", "Account", "Finance"]

export const DEFAULT_TASKS: TaskRecord[] = [
  {
    id: "task-1",
    title: "Task 1",
    deadline: "07/10/2025",
    assignees: ["Username 1"],
    department: "Registration",
    status: "submitted",
    description: "Task Detail for Task 1",
  },
  {
    id: "task-2",
    title: "Task 2",
    deadline: "15/12/2025",
    assignees: ["Username 2"],
    department: "Registration",
    status: "in-progress",
    description: "Task Detail for Task 2",
  },
  {
    id: "task-3",
    title: "Task 3",
    deadline: "04/04/2024",
    assignees: ["Username 3"],
    department: "Account",
    status: "blocked",
    description: "Task Detail for Task 3",
  },
]
