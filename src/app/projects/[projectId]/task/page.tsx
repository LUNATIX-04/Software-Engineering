"use client"

import * as React from "react"
import { useRef, useEffect, useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, PlusCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SearchField } from "@/components/ui/search-field"
import {
  TASK_STATUS_LABEL,
  TASK_STATUS_STYLE,
  type TaskRecord,
} from "./data"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { TaskCard } from "@/components/tasks/TaskCard"
import { getContrastingTextColor, sanitizeHexColor } from "@/utils/colors"
import { PROJECT_REFRESH_EVENT } from "@/constants/events"
import type { ProjectDepartmentRecord } from "@/utils/projects/departments"
import type { ProjectMembershipSummary } from "@/utils/projects/api"
import {
  loadProjectDepartments,
  loadProjectMembership,
  loadProjectTasks,
} from "@/utils/projects/prefetch"
import { PROJECT_ROLE } from "@/types/projects"

import TaskDeleteDialog from "./components/TaskDeleteDialog"
import TaskFilterMenu from "./components/TaskFilterMenu"
import { TaskScope } from "./types"
import TaskPageSizeSelector from "./components/TaskPageSizeSelector"
import TaskPaginationControls from "./components/TaskPaginationControls"

type ProjectTaskPageProps = {
  params: Promise<{
    projectId: string
  }>
}

const BASE_PAGE_SIZE_OPTIONS = [3, 9, 18, 36, 64, 96, 136, 172]

type RemoteDepartment = {
  id: string
  name: string
  color: string
  textColor: string
  order: number
  head: string | null
}

const normalizeDepartments = (departments: ProjectDepartmentRecord[]): RemoteDepartment[] =>
  departments.map((dept) => ({
    id: dept.id,
    name: dept.name,
    color: dept.color,
    textColor: dept.textColor,
    order: dept.order,
    head: dept.head ?? null,
  }))

const ALL_DEPARTMENTS_LABEL = "All Departments"

export default function ProjectTaskPage({ params }: ProjectTaskPageProps) {
  const { projectId } = React.use(params)
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [search, setSearch] = useState("")
  const [activeDepartmentFilters, setActiveDepartmentFilters] = useState<string[]>([])
  const [taskScope, setTaskScope] = useState<TaskScope>("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pendingDeleteTask, setPendingDeleteTask] = useState<TaskRecord | null>(null)
  const [deletingTask, setDeletingTask] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(
    BASE_PAGE_SIZE_OPTIONS[1] ?? BASE_PAGE_SIZE_OPTIONS[0]
  )
  const colorRollbackRef = useRef<Record<string, { cardColor: string; cardTextColor: string }>>({})
  const latestColorRequestRef = useRef<Record<string, string>>({})
  const pendingColorOverridesRef = useRef<Record<string, { cardColor: string; cardTextColor: string }>>({})

  const applyPendingCardColorOverrides = useCallback((taskList: TaskRecord[]) => {
    const overrides = pendingColorOverridesRef.current
    if (taskList.length === 0 || Object.keys(overrides).length === 0) {
      return taskList
    }
    return taskList.map((task) => {
      const override = overrides[task.id]
      if (!override) {
        return task
      }
      if (
        task.cardColor === override.cardColor &&
        task.cardTextColor === override.cardTextColor
      ) {
        delete overrides[task.id]
        return task
      }
      return {
        ...task,
        cardColor: override.cardColor,
        cardTextColor: override.cardTextColor,
      }
    })
  }, [])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasksError, setTasksError] = useState<string | null>(null)
  const [remoteDepartments, setRemoteDepartments] = useState<RemoteDepartment[]>([])
  const [departmentsLoading, setDepartmentsLoading] = useState(true)
  const [departmentsError, setDepartmentsError] = useState<string | null>(null)
  const [membership, setMembership] = useState<ProjectMembershipSummary | null>(null)
  const [membershipLoading, setMembershipLoading] = useState(true)
  const [departmentFilterMenuOpen, setDepartmentFilterMenuOpen] = useState(false)
  const membershipId = membership?.id ?? null
  const canManageTasks = Boolean(membership && membership.role !== PROJECT_ROLE.MEMBER)

  const departmentOptions = useMemo(() => {
    const sorted = [...remoteDepartments].sort(
      (a, b) => a.order - b.order || a.name.localeCompare(b.name)
    )
    const names = sorted.map((dept) => dept.name)
    return Array.from(new Set(names))
  }, [remoteDepartments])

  const departmentById = useMemo(() => {
    return remoteDepartments.reduce<Record<string, RemoteDepartment>>((acc, dept) => {
      acc[dept.id] = dept
      return acc
    }, {})
  }, [remoteDepartments])

  const departmentByName = useMemo(() => {
    return remoteDepartments.reduce<Record<string, RemoteDepartment>>((acc, dept) => {
      acc[dept.name] = dept
      return acc
    }, {})
  }, [remoteDepartments])

  const departmentColorMap = useMemo(() => {
    return remoteDepartments.reduce<Record<string, string>>((acc, dept) => {
      acc[dept.name] = dept.color
      return acc
    }, {})
  }, [remoteDepartments])

  type TaskDepartmentDetail = {
    id: string
    name: string
    color: string
    textColor: string
  }

  const taskDepartmentMeta = useMemo(() => {
    return tasks.reduce<
      Record<
        string,
        {
          departments: TaskDepartmentDetail[]
          assigneeCounts: Record<string, number>
        }
      >
    >((acc, task) => {
      const departmentMap = new Map<string, TaskDepartmentDetail>()
      const assigneeCounts: Record<string, number> = {}

      if (task.department) {
        const fromRemote = departmentById[task.department.id]
        const detail: TaskDepartmentDetail = {
          id: task.department.id,
          name: fromRemote?.name ?? task.department.name,
          color: fromRemote?.color ?? task.department.color,
          textColor: fromRemote?.textColor ?? task.department.textColor,
        }
        departmentMap.set(detail.id, detail)
      }

      task.assignees.forEach((assignee) => {
        if (!assignee.departmentId) {
          return
        }
        assigneeCounts[assignee.departmentId] = (assigneeCounts[assignee.departmentId] ?? 0) + 1
        if (!departmentMap.has(assignee.departmentId)) {
          const meta = departmentById[assignee.departmentId]
          if (meta) {
            departmentMap.set(assignee.departmentId, {
              id: meta.id,
              name: meta.name,
              color: meta.color,
              textColor: meta.textColor,
            })
          }
        }
      })

      const departments = Array.from(departmentMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      )

      acc[task.id] = {
        departments,
        assigneeCounts,
      }
      return acc
    }, {})
  }, [departmentById, tasks])

  const filteredTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const hasDepartmentFilters = activeDepartmentFilters.length > 0
    const now = Date.now()

    const getSortKey = (task: TaskRecord) => {
      if (!task.dueDate) {
        return { bucket: 1, value: Number.POSITIVE_INFINITY }
      }
      const dueDate = new Date(task.dueDate).getTime()
      const diff = dueDate - now
      if (Number.isNaN(diff)) {
        return { bucket: 1, value: Number.POSITIVE_INFINITY }
      }
      if (diff >= 0) {
        return { bucket: 0, value: diff }
      }
      return { bucket: 2, value: Math.abs(diff) }
    }

    const matchesRoleScope = (task: TaskRecord) => {
      if (!membership) {
        return true
      }
      if (membership.role === PROJECT_ROLE.OWNER) {
        return true
      }
      const isAssignee = membershipId
        ? task.assignees.some((assignee) => assignee.id === membershipId)
        : false
      if (membership.role === PROJECT_ROLE.HEADER) {
        return isAssignee || task.createdBy.id === membershipId
      }
      if (membership.role === PROJECT_ROLE.MEMBER) {
        if (!isAssignee) {
          return false
        }
        return (
          task.createdBy.role === PROJECT_ROLE.OWNER ||
          task.createdBy.role === PROJECT_ROLE.HEADER
        )
      }
      return true
    }

    const matchesTaskScope = (task: TaskRecord) => {
      if (taskScope === "all" || !membershipId) {
        return true
      }
      const isAssignee = task.assignees.some((assignee) => assignee.id === membershipId)
      const isAssigner = task.createdBy.id === membershipId
      return taskScope === "assignee" ? isAssignee : isAssigner
    }

    return tasks
      .filter((task) => {
        const meta = taskDepartmentMeta[task.id]
        const assigneeCounts = meta?.assigneeCounts ?? {}
        if (!matchesRoleScope(task)) {
          return false
        }
        if (!matchesTaskScope(task)) {
          return false
        }
        const matchesDepartment =
          !hasDepartmentFilters ||
          activeDepartmentFilters.every((deptName) => {
            const deptMeta = departmentByName[deptName]
            if (!deptMeta) {
              return false
            }
            return (assigneeCounts[deptMeta.id] ?? 0) > 0
          })
        if (!matchesDepartment) return false
        if (!normalizedSearch) return true
        const haystack = [
          task.title,
          task.detail ?? "",
          task.department?.name ?? "",
          ...task.assignees.map((assignee) => assignee.username ?? assignee.fullName ?? ""),
        ]
          .join(" ")
          .toLowerCase()
        return haystack.includes(normalizedSearch)
      })
      .sort((a, b) => {
        const keyA = getSortKey(a)
        const keyB = getSortKey(b)
        if (keyA.bucket !== keyB.bucket) {
          return keyA.bucket - keyB.bucket
        }
        if (keyA.value !== keyB.value) {
          return keyA.value - keyB.value
        }
        return a.title.localeCompare(b.title)
      })
  }, [
    activeDepartmentFilters,
    departmentByName,
    membership,
    membershipId,
    search,
    taskDepartmentMeta,
    tasks,
    taskScope,
  ])

  const totalPages = useMemo(() => {
    if (filteredTasks.length === 0) {
      return 1
    }
    return Math.max(1, Math.ceil(filteredTasks.length / pageSize))
  }, [filteredTasks.length, pageSize])

  const pageSizeOptions = useMemo(() => {
    const totalTasks = filteredTasks.length || tasks.length
    const options = new Set(BASE_PAGE_SIZE_OPTIONS)
    if (totalTasks > 0) {
      options.add(totalTasks)
    }
    return [...options].sort((a, b) => a - b)
  }, [filteredTasks.length, tasks.length])

  useEffect(() => {
    if (pageSizeOptions.length === 0) {
      return
    }
    if (!pageSizeOptions.includes(pageSize)) {
      const fallbackSize = pageSizeOptions[pageSizeOptions.length - 1]
      setPageSize(fallbackSize)
      setPage(1)
    }
  }, [pageSizeOptions, pageSize])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  useEffect(() => {
    setActiveDepartmentFilters((prev) => {
      if (prev.length === 0) {
        return prev
      }
      const next = prev.filter((name) => departmentOptions.includes(name))
      return next.length === prev.length ? prev : next
    })
  }, [departmentOptions])

  const fetchDepartments = useCallback(async () => {
    if (!projectId) {
      return
    }
    setDepartmentsLoading(true)
    try {
      setDepartmentsError(null)
      const data = await loadProjectDepartments(projectId)
      setRemoteDepartments(normalizeDepartments(data))
    } catch (error) {
      console.error(error)
      setDepartmentsError("Unable to load departments")
    } finally {
      setDepartmentsLoading(false)
    }
  }, [projectId])

  const fetchTasks = useCallback(async () => {
    if (!projectId) {
      return
    }
    setTasksLoading(true)
    try {
      setTasksError(null)
      const data = await loadProjectTasks(projectId)
      setTasks(applyPendingCardColorOverrides(data))
    } catch (error) {
      console.error(error)
      setTasksError(error instanceof Error ? error.message : "Unable to load tasks")
    } finally {
      setTasksLoading(false)
    }
  }, [projectId, applyPendingCardColorOverrides])

  const fetchMembership = useCallback(async () => {
    if (!projectId) {
      return
    }
    setMembershipLoading(true)
    try {
      const data = await loadProjectMembership(projectId)
      setMembership(data ?? null)
    } catch (error) {
      console.error(error)
      setMembership(null)
    } finally {
      setMembershipLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchDepartments()
  }, [projectId, fetchDepartments])

  useEffect(() => {
    fetchTasks()
  }, [projectId, fetchTasks])

  useEffect(() => {
    fetchMembership()
  }, [projectId, fetchMembership])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    const handleProjectRefresh = (event: Event) => {
      const detail = (
        event as CustomEvent<{ projectId?: string | null; origin?: string }>
      ).detail
      if (detail?.projectId && detail.projectId !== projectId) {
        return
      }
      if (detail?.origin === "tasks-page") {
        return
      }
      fetchDepartments()
      fetchTasks()
      fetchMembership()
    }
    window.addEventListener(PROJECT_REFRESH_EVENT, handleProjectRefresh)
    return () => window.removeEventListener(PROJECT_REFRESH_EVENT, handleProjectRefresh)
  }, [fetchDepartments, fetchMembership, fetchTasks, projectId])

  useEffect(() => {
    if (!membershipId && taskScope !== "all") {
      setTaskScope("all")
    }
  }, [membershipId, taskScope])

  const handleTaskColorChange = useCallback(
    async (taskId: string, color: string) => {
      const normalizedColor = sanitizeHexColor(color)
      const derivedTextColor = getContrastingTextColor(normalizedColor)
      latestColorRequestRef.current[taskId] = normalizedColor

      setTasks((prev) => {
        const previousTask = prev.find((task) => task.id === taskId)
        if (previousTask) {
          colorRollbackRef.current[taskId] = {
            cardColor: previousTask.cardColor,
            cardTextColor: previousTask.cardTextColor,
          }
        }
        return prev.map((task) =>
          task.id === taskId
            ? { ...task, cardColor: normalizedColor, cardTextColor: derivedTextColor }
            : task
        )
      })

      try {
        const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ cardColor: normalizedColor }),
        })
        if (!response.ok) {
          const message = await response.text()
          throw new Error(message || "Failed to update task color")
        }
        const updatedTask = (await response.json()) as TaskRecord
        if (latestColorRequestRef.current[taskId] !== normalizedColor) {
          return
        }
        setTasks((prev) => prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)))
        pendingColorOverridesRef.current[taskId] = {
          cardColor: normalizedColor,
          cardTextColor: derivedTextColor,
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(PROJECT_REFRESH_EVENT, {
              detail: { projectId, origin: "tasks-page" },
            })
          )
        }
        delete colorRollbackRef.current[taskId]
        delete latestColorRequestRef.current[taskId]
      } catch (error) {
        console.error(error)
        if (latestColorRequestRef.current[taskId] !== normalizedColor) {
          return
        }
        delete pendingColorOverridesRef.current[taskId]
        setTasks((prev) => {
          const rollback = colorRollbackRef.current[taskId]
          if (!rollback) {
            return prev
          }
          return prev.map((task) =>
            task.id === taskId
              ? { ...task, cardColor: rollback.cardColor, cardTextColor: rollback.cardTextColor }
              : task
          )
        })
        delete colorRollbackRef.current[taskId]
        delete latestColorRequestRef.current[taskId]
        return
      }

      try {
        await fetchTasks()
      } catch (refreshError) {
        console.error("Unable to refresh tasks after color update", refreshError)
      }
    },
    [projectId, fetchTasks]
  )

  const paginatedTasks = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    return filteredTasks.slice(startIndex, startIndex + pageSize)
  }, [filteredTasks, page, pageSize])

  React.useEffect(() => {
    setPage(1)
  }, [activeDepartmentFilters, taskScope, search])

  const handleToggleDepartmentFilter = useCallback((departmentName: string, enabled: boolean) => {
    setActiveDepartmentFilters((prev) => {
      if (enabled) {
        if (prev.includes(departmentName)) {
          return prev
        }
        return [...prev, departmentName]
      }
      return prev.filter((name) => name !== departmentName)
    })
  }, [])

  const handleResetFilters = useCallback(() => {
    setActiveDepartmentFilters([])
    setTaskScope("all")
  }, [])

  const isTaskScopeSelectionDisabled = membershipLoading || !membershipId
  const handleTaskScopeChange = useCallback(
    (nextScope: TaskScope) => {
      if (nextScope !== "all" && !membershipId) {
        return
      }
      setTaskScope(nextScope)
    },
    [membershipId]
  )

  const handleEditTask = (taskId: string) => {
    router.push(`/projects/${projectId}/task/${taskId}/edit`)
  }

  const handleDeleteTaskRequest = (task: TaskRecord) => {
    setPendingDeleteTask(task)
    setDeletingTask(false)
    setDeleteDialogOpen(true)
  }

  const closeDeleteDialog = React.useCallback(() => {
    setDeleteDialogOpen(false)
    setPendingDeleteTask(null)
  }, [])

  const handleDialogOpenChange = (open: boolean) => {
    if (deletingTask) {
      return
    }
    if (open) {
      setDeleteDialogOpen(true)
    } else {
      closeDeleteDialog()
    }
  }

  const handleConfirmDelete = async () => {
    if (!pendingDeleteTask) {
      return
    }
    try {
      setDeletingTask(true)
      setTasksError(null)
      const response = await fetch(
        `/api/projects/${projectId}/tasks/${pendingDeleteTask.id}`,
        {
          method: "DELETE",
        }
      )
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message =
          typeof payload?.error === "string" ? payload.error : "Failed to delete task"
        throw new Error(message)
      }
      setTasks((prev) => prev.filter((task) => task.id !== pendingDeleteTask.id))
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(PROJECT_REFRESH_EVENT, {
              detail: { projectId, origin: "tasks-page" },
            })
          )
        }
      closeDeleteDialog()
    } catch (error) {
      console.error("Failed to delete task", error)
      setTasksError(
        error instanceof Error ? error.message : "Unable to remove this task right now."
      )
    } finally {
      setDeletingTask(false)
    }
  }

  const handleCancelDelete = () => {
    if (deletingTask) {
      return
    }
    closeDeleteDialog()
  }

  const handleOpenTask = (taskId: string) => {
    router.push(`/projects/${projectId}/task/${taskId}`)
  }

  const handleBackClick = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
      return
    }
    router.push("/projects")
  }, [router])

  const containerMinHeight = "calc(100dvh - 8rem)"
  const cardListMaxHeight = "calc(100dvh - 22rem)"

  const scopeLabel =
    taskScope === "assignee"
      ? "My Tasks"
      : taskScope === "assigner"
        ? "Assigned Tasks"
        : null
  const departmentSummary =
    activeDepartmentFilters.length === 0
      ? ALL_DEPARTMENTS_LABEL
      : activeDepartmentFilters.length <= 2
        ? activeDepartmentFilters.join(", ")
        : `${activeDepartmentFilters.length} selected`
  const filterActive = scopeLabel !== null || activeDepartmentFilters.length > 0
  const filterSummaryText = scopeLabel ?? departmentSummary
  const filterSummaryTitle = scopeLabel
    ? `${scopeLabel}${activeDepartmentFilters.length > 0 ? ` • ${departmentSummary}` : ""}`
    : departmentSummary
  const filterBadgeCount =
    activeDepartmentFilters.length > 0 ? activeDepartmentFilters.length : null

  return (
    <div className="asap-scroll w-full min-h-[calc(100vh-6.5rem)] px-[clamp(3.25rem,4vw,3.25rem)] pt-3">
      <div className="flex w-full flex-col items-start gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="sticky top-1 z-10 -ml-3 flex flex-shrink-0 items-start justify-start lg:-mt-0">
          <Button
            type="button"
            data-cy="project-task-back-button"
            variant="ghost"
            onClick={handleBackClick}
            className="inline-flex size-12 items-center justify-center rounded-full border border-primary/20 bg-white text-primary shadow-sm transition hover:border-primary/40 hover:bg-primary/10 focus-visible:border-primary focus-visible:ring-0"
          >
            <ArrowLeft className="size-6" aria-hidden="true" />
          </Button>
        </div>
        <div
          className="mx-auto mt-10 flex w-full max-w-full flex-1 flex-col gap-8 px-[clamp(1.5rem,3vw,3.5rem)] pb-10"
          style={{ minHeight: containerMinHeight }}
        >
          <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full flex-col gap-4 lg:flex-1 lg:flex-row lg:flex-nowrap lg:items-center lg:gap-4">
              <SearchField
                wrapperClassName="w-full lg:flex-1 lg:min-w-[16rem]"
                placeholder="Search"
                value={search}
                data-cy="project-task-search-input"
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="sm:flex-shrink-0">
                <TaskFilterMenu
                  open={departmentFilterMenuOpen}
                  onOpenChange={setDepartmentFilterMenuOpen}
                  onClose={() => setDepartmentFilterMenuOpen(false)}
                  filterActive={filterActive}
                  filterSummaryText={filterSummaryText}
                  filterSummaryTitle={filterSummaryTitle}
                  filterBadgeCount={filterBadgeCount}
                  departmentOptions={departmentOptions}
                  departmentColorMap={departmentColorMap}
                  activeDepartmentFilters={activeDepartmentFilters}
                  onToggleDepartmentFilter={handleToggleDepartmentFilter}
                  taskScope={taskScope}
                  onTaskScopeChange={handleTaskScopeChange}
                  isScopeSelectionDisabled={isTaskScopeSelectionDisabled}
                  onResetFilters={handleResetFilters}
                />
              </div>
              <div className="sm:flex-shrink-0">
                <TaskPageSizeSelector
                  pageSize={pageSize}
                  pageSizeOptions={pageSizeOptions}
                  totalCount={filteredTasks.length}
                  onPageSizeChange={(sizeOption) => {
                    if (sizeOption === pageSize) {
                      return
                    }
                    setPageSize(sizeOption)
                    setPage(1)
                  }}
                />
              </div>
            </div>
            {canManageTasks ? (
              <div className="flex w-full justify-start lg:w-auto lg:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/projects/${projectId}/task/create`)}
                  className="inline-flex h-12 w-full select-none items-center justify-center gap-2 rounded-full border-primary/40 bg-white px-6 text-base font-semibold text-primary transition hover:border-primary hover:bg-primary hover:text-primary-foreground sm:w-auto"
                >
                  <PlusCircle className="size-5" aria-hidden="true" />
                  Create Task
                </Button>
              </div>
            ) : null}
          </header>

        <div className="flex flex-1 min-h-0 flex-col">
          <div
            className={cn(
              "-mr-3 -mt-5 rounded-[3rem] border-2 border-primary/40 bg-white/80 px-6 py-6 shadow-[0_6px_0_rgba(144,122,214,0.15)]",
              paginatedTasks.length > 0 ? "flex-1" : "flex-none"
            )}
          >
            <div
              className={cn(
                "projects-scroll [scrollbar-gutter:stable] flex flex-col space-y-3 px-0.5 py-2 pb-2"
              )}
              style={{
                maxHeight: cardListMaxHeight,
                minHeight: cardListMaxHeight,
              }}
            >
            {tasksError ? (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {tasksError}
              </div>
            ) : null}
            {tasksLoading ? (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
                Loading tasks…
              </div>
            ) : null}
            {paginatedTasks.map((task, index) => (
            <TaskCard
              key={task.id}
              title={task.title}
              deadline={task.dueDate ? format(new Date(task.dueDate), "dd/MM/yyyy") : "—"}
              taskId={task.id}
              assignees={
                task.assignees.length > 0
                  ? task.assignees.map(
                      (assignee) => assignee.username || assignee.fullName || "Member"
                    )
                  : []
              }
              statusLabel={TASK_STATUS_LABEL[task.status]}
              statusClassName={TASK_STATUS_STYLE[task.status]}
              departments={
                taskDepartmentMeta[task.id]?.departments ??
                (task.department
                  ? [
                      {
                        id: task.department.id,
                        name: task.department.name,
                        color: task.department.color,
                        textColor: task.department.textColor,
                      },
                    ]
                  : [])
              }
              cardColor={task.cardColor}
              cardTextColor={task.cardTextColor}
              onColorChange={(color) => handleTaskColorChange(task.id, color)}
              onOpen={() => handleOpenTask(task.id)}
              onEdit={() => handleEditTask(task.id)}
              onDelete={() => handleDeleteTaskRequest(task)}
              showActions={canManageTasks}
              dataCyIndex={index}
            />
            ))}

            {paginatedTasks.length === 0 ? (
              <div className="flex min-h-[11rem] flex-col items-center justify-center rounded-[2.5rem] border border-dashed border-primary/30 bg-white/60 p-10 text-center text-primary">
                <p className="text-lg font-semibold" data-cy="project-task-empty-title">
                  No tasks found
                </p>
                <p
                  className="mt-2 text-sm text-primary/70"
                  data-cy="project-task-empty-help"
                >
                  Try adjusting the search or department filter.
                </p>
              </div>
            ) : null}
            </div>
          </div>

          {!tasksLoading && filteredTasks.length > 0 ? (
            <TaskPaginationControls
              page={page}
              totalPages={totalPages}
              onPageChange={(nextPage) => setPage(nextPage)}
            />
          ) : null}
        </div>
        </div>

        <TaskDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={handleDialogOpenChange}
          taskTitle={pendingDeleteTask?.title}
          deleting={deletingTask}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      </div>
    </div>
  )
}
