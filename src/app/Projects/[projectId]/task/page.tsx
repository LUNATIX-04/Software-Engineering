"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronDown, MoreHorizontal, PlusCircle, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DEFAULT_TASKS,
  DEPARTMENTS,
  TASK_STATUS_LABEL,
  TASK_STATUS_STYLE,
  type TaskRecord,
} from "./data"

type ProjectTaskPageProps = {
  params: Promise<{
    projectId: string
  }>
}

export default function ProjectTaskPage({ params }: ProjectTaskPageProps) {
  const { projectId } = React.use(params)
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskRecord[]>(() => [...DEFAULT_TASKS])
  const [search, setSearch] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState<string>("Registration")
  const [currentPage, setCurrentPage] = useState(1)
  const [menuTaskId, setMenuTaskId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pendingDeleteTask, setPendingDeleteTask] = useState<TaskRecord | null>(null)
  const pageSize = 6

  const filteredTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return tasks.filter((task) => {
      const matchesDepartment =
        departmentFilter === "All Departments" || task.department === departmentFilter
      if (!matchesDepartment) return false
      if (!normalizedSearch) return true
      const haystack = [task.title, task.assignee, task.department].join(" ").toLowerCase()
      return haystack.includes(normalizedSearch)
    })
  }, [departmentFilter, search, tasks])

  const totalPages = useMemo(() => {
    if (filteredTasks.length === 0) return 1
    return Math.max(1, Math.ceil(filteredTasks.length / pageSize))
  }, [filteredTasks.length, pageSize])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [departmentFilter, search, pageSize])

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredTasks.slice(start, start + pageSize)
  }, [filteredTasks, currentPage, pageSize])

  const handleEditTask = (taskId: string) => {
    setMenuTaskId(null)
    handleOpenTask(taskId)
  }

  const handleDeleteTaskRequest = (task: TaskRecord) => {
    setMenuTaskId(null)
    setPendingDeleteTask(task)
    setDeleteDialogOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setDeleteDialogOpen(open)
    if (!open) {
      setPendingDeleteTask(null)
    }
  }

  const handleConfirmDelete = () => {
    if (!pendingDeleteTask) {
      return
    }
    setTasks((prev) => prev.filter((task) => task.id !== pendingDeleteTask.id))
    setPendingDeleteTask(null)
    setDeleteDialogOpen(false)
  }

  const handleOpenTask = (taskId: string) => {
    router.push(`/projects/${projectId}/task/${taskId}`)
  }

  const handleTaskCardClick = (
    event: React.MouseEvent<HTMLElement>,
    taskId: string
  ) => {
    const element = event.target
    if (element instanceof Element && element.closest("[data-task-menu='true']")) {
      return
    }
    handleOpenTask(taskId)
  }

  const handleTaskCardKeyDown = (
    event: React.KeyboardEvent<HTMLElement>,
    taskId: string
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleOpenTask(taskId)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-[clamp(1.5rem,3vw,3.5rem)] pb-16 pt-4">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
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
        </div>
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary/60" />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-full border-2 border-primary/40 bg-background py-3 pl-12 pr-4 text-sm text-foreground placeholder:text-primary/60 shadow-[0_6px_0_rgba(144,122,214,0.2)] focus:border-primary focus:outline-none"
            />
          </div>
          <div className="relative inline-flex min-w-[12rem] items-center">
            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="w-full appearance-none rounded-full border-2 border-primary/40 bg-[#E9E0FF] px-5 py-3 pr-10 text-sm font-semibold text-[#392069] shadow-[0_6px_0_rgba(144,122,214,0.2)] focus:border-primary focus:outline-none"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#392069]" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              // placeholder navigation
            }}
            className="inline-flex h-12 items-center gap-2 rounded-full border-primary/40 px-6 text-base font-semibold text-primary transition hover:border-primary hover:bg-primary hover:text-primary-foreground"
          >
            <PlusCircle className="size-5" />
            Create Task
          </Button>
        </div>
      </header>

      <section
        className="flex flex-1 flex-col rounded-[3rem] border-2 border-primary/40 bg-white/80 px-6 py-6 shadow-[0_14px_0_rgba(144,122,214,0.15)]"
        data-project-id={projectId}
      >
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {paginatedTasks.map((task) => (
            <article
              key={task.id}
              className="flex flex-col gap-4 rounded-[2.5rem] border-2 border-primary/30 bg-[#F2EFFF] px-6 py-5 shadow-[0_8px_0_rgba(144,122,214,0.12)] sm:flex-row sm:items-center sm:gap-6"
              role="button"
              tabIndex={0}
              onClick={(event) => handleTaskCardClick(event, task.id)}
              onKeyDown={(event) => handleTaskCardKeyDown(event, task.id)}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-3 text-[#2F2766]">
                  <h3 className="text-xl font-black">{task.title}</h3>
                  <span className="text-sm font-medium">
                    Deadline : {task.deadline}
                  </span>
                </div>
                <p className="text-sm font-medium text-[#2F2766]">
                  Assigned to : {task.assignee}
                </p>
              </div>
              <div className="flex items-center gap-4 self-start sm:self-auto">
                <span
                  className={`inline-flex items-center justify-center rounded-full border-2 border-primary/40 px-5 py-2 text-sm font-semibold shadow-[0_4px_0_rgba(144,122,214,0.2)] ${TASK_STATUS_STYLE[task.status]}`}
                >
                  {TASK_STATUS_LABEL[task.status]}
                </span>
                <div className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-10 rounded-full border border-transparent text-[#2F2766] hover:border-primary/40"
                    onClick={() =>
                      setMenuTaskId((prev) => (prev === task.id ? null : task.id))
                    }
                    aria-haspopup="menu"
                    aria-expanded={menuTaskId === task.id}
                    aria-label={`Task ${task.title} actions`}
                    data-task-menu="true"
                  >
                    <MoreHorizontal className="size-5" />
                  </Button>
                  {menuTaskId === task.id ? (
                    <div
                      className="absolute right-0 top-12 z-10 flex w-40 flex-col gap-1 rounded-3xl border border-primary/40 bg-[#4A3F86] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_0_rgba(74,63,134,0.3)]"
                      data-task-menu="true"
                    >
                      <button
                        type="button"
                        onClick={() => handleEditTask(task.id)}
                        className="rounded-2xl px-3 py-2 text-left transition hover:bg-white/10"
                        data-task-menu="true"
                      >
                        Edit Task
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTaskRequest(task)}
                        className="rounded-2xl px-3 py-2 text-left transition hover:bg-white/10"
                        data-task-menu="true"
                      >
                        Delete Task
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          ))}

          {paginatedTasks.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center rounded-[2.5rem] border border-dashed border-primary/30 bg-white/60 p-10 text-center text-primary">
              <p className="text-lg font-semibold">No tasks found</p>
              <p className="mt-2 text-sm text-primary/70">
                Try adjusting the search or department filter.
              </p>
            </div>
          ) : null}
        </div>

        <footer className="mt-6 flex items-center justify-center gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="size-10 rounded-full border border-transparent text-lg text-primary hover:border-primary/40 hover:text-primary"
          >
            &#9664;
          </Button>
          <span className="flex min-w-[3rem] items-center justify-center rounded-full border-2 border-primary/40 bg-white px-4 py-2 text-base font-semibold text-primary shadow-sm">
            {currentPage}
          </span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="size-10 rounded-full border border-transparent text-lg text-primary hover:border-primary/40 hover:text-primary"
          >
            &#9654;
          </Button>
        </footer>
      </section>

      <AlertDialog open={deleteDialogOpen} onOpenChange={handleDialogOpenChange}>
        <AlertDialogContent className="max-w-md rounded-[2.5rem] border-2 border-primary/40 bg-white/95 px-10 py-8 text-center shadow-[0_18px_0_rgba(74,63,134,0.2)]">
          <AlertDialogHeader className="gap-3">
            <AlertDialogTitle className="text-xl font-semibold text-[#2F2766]">
              Are you sure you want to delete this task?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#2F2766]/80">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col gap-3 sm:flex-row sm:justify-center">
            <AlertDialogCancel className="h-11 min-w-[6rem] rounded-full border-2 border-primary/40 bg-[#E6D7FF] px-6 text-base font-semibold text-primary shadow-[0_6px_0_rgba(144,122,214,0.2)] transition hover:border-primary hover:text-primary">
              No
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="h-11 min-w-[6rem] rounded-full border-2 border-[#3F3478] bg-[#3F3478] px-6 text-base font-semibold text-white shadow-[0_6px_0_rgba(74,63,134,0.35)] transition hover:bg-[#2F2766]"
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
