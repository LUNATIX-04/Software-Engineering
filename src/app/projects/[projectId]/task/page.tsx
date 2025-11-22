"use client"

import * as React from "react"
import { useRef, useEffect, useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { PlusCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ProgressBar } from "@/components/ui/progress-bar"
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
import { fetchProjectDepartments } from "@/utils/projects/departments"
import {
  fetchProjectMembership,
  fetchProjectTasks,
  type ProjectMembershipSummary,
  type TaskScopeFilter,
} from "@/utils/projects/api"
import { PROJECT_ROLE } from "@/types/projects"
import BackButton from "@/components/navigation/BackButton"
import { isRemovalError } from "@/utils/projects/removal"
import { Skeleton } from "@/components/ui/skeleton"
import { dispatchNavigationAbortEvent, useNavigationAbort } from "@/hooks/useNavigationAbort"
import { BASE_PAGE_SIZE_OPTIONS } from "@/constants/pagination"
import { getCachedProjectMembership } from "@/utils/projects/prefetch"

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

const TASK_PAGE_SIZE_KEY = "asap:tasks-page-size"

const readStoredPageSize = (key: string): number | null => {
  if (typeof window === "undefined") {
    return null
  }
  const raw = window.localStorage.getItem(key)
  const parsedLocal = raw ? Number.parseInt(raw, 10) : NaN
  if (Number.isFinite(parsedLocal) && BASE_PAGE_SIZE_OPTIONS.includes(parsedLocal)) {
    return parsedLocal
  }
  const cookieMatch = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${key}=`))
  const cookieValue = cookieMatch ? Number.parseInt(cookieMatch.split("=")[1] ?? "", 10) : NaN
  if (Number.isFinite(cookieValue) && BASE_PAGE_SIZE_OPTIONS.includes(cookieValue)) {
    return cookieValue
  }
  return null
}

const persistPageSize = (key: string, value: number) => {
  if (typeof window === "undefined") {
    return
  }
  try {
    window.localStorage.setItem(key, String(value))
    document.cookie = `${key}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to persist task page size", error)
    }
  }
}

type StoredTaskFilters = {
  departments: string[]
  exactMatch: boolean
  taskScope: TaskScope
  search: string
}

const TASK_FILTERS_KEY_PREFIX = "asap:tasks-filters"

const buildTaskFilterStorageKey = (projectId?: string | null) =>
  `${TASK_FILTERS_KEY_PREFIX}:${projectId ?? "global"}`

const readStoredTaskFilters = (key: string): StoredTaskFilters | null => {
  if (typeof window === "undefined") {
    return null
  }
  const raw = window.localStorage.getItem(key)
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw)
    const departments = Array.isArray(parsed?.departments)
      ? parsed.departments.map((name: unknown) => (typeof name === "string" ? name : "")).filter(Boolean)
      : []
    const exactMatch = typeof parsed?.exactMatch === "boolean" ? parsed.exactMatch : true
    const taskScope: TaskScope =
      parsed?.taskScope === "assignee" || parsed?.taskScope === "assigner" ? parsed.taskScope : "all"
    const search = typeof parsed?.search === "string" ? parsed.search : ""
    return { departments, exactMatch, taskScope, search }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to read stored task filters", error)
    }
    return null
  }
}

const persistTaskFilters = (key: string, filters: StoredTaskFilters) => {
  if (typeof window === "undefined") {
    return
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(filters))
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to persist task filters", error)
    }
  }
}

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
  const cachedMembership = useMemo(
    () => (projectId ? getCachedProjectMembership(projectId) : undefined),
    [projectId]
  )
  const redirectToProjects = useCallback(() => {
    dispatchNavigationAbortEvent()
    router.replace("/projects")
  }, [router])
  const taskPageSizeStorageKey = useMemo(
    () => `${TASK_PAGE_SIZE_KEY}:${projectId ?? "global"}`,
    [projectId]
  )
  const taskFilterStorageKey = useMemo(
    () => buildTaskFilterStorageKey(projectId),
    [projectId]
  )
  const storedTaskFilters = useMemo(
    () => readStoredTaskFilters(taskFilterStorageKey),
    [taskFilterStorageKey]
  )
  const initialPageSize = BASE_PAGE_SIZE_OPTIONS[0]
  const [allTasks, setAllTasks] = useState<TaskRecord[]>([])
  const [hasLoadedTasks, setHasLoadedTasks] = useState(false)
  const [search, setSearch] = useState(storedTaskFilters?.search ?? "")
  const [activeDepartmentFilters, setActiveDepartmentFilters] = useState<string[]>(
    () => storedTaskFilters?.departments ?? []
  )
  const [exactDepartmentMatch, setExactDepartmentMatch] = useState(
    storedTaskFilters?.exactMatch ?? true
  )
  const [taskScope, setTaskScope] = useState<TaskScope>(
    storedTaskFilters?.taskScope ?? "all"
  )
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pendingDeleteTask, setPendingDeleteTask] = useState<TaskRecord | null>(null)
  const [deletingTask, setDeletingTask] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window === "undefined") {
      return initialPageSize
    }
    const stored = readStoredPageSize(taskPageSizeStorageKey)
    return stored ?? initialPageSize
  })
  const [pageSizeHydrated, setPageSizeHydrated] = useState(() => typeof window !== "undefined")
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [membership, setMembership] = useState<ProjectMembershipSummary | null>(
    cachedMembership ?? null
  )
  const [membershipLoading, setMembershipLoading] = useState(cachedMembership === undefined)
  const membershipId = membership?.id ?? null
  const canManageTasks = Boolean(membership && membership.role !== PROJECT_ROLE.MEMBER)
  const showCreateTaskButton = canManageTasks
  const colorRollbackRef = useRef<Record<string, { cardColor: string; cardTextColor: string }>>({})
  const latestColorRequestRef = useRef<Record<string, string>>({})
  const pendingColorOverridesRef = useRef<Record<string, { cardColor: string; cardTextColor: string }>>({})
  const taskFetchControllerRef = useRef<AbortController | null>(null)
  const refreshTimerRef = useRef<number | null>(null)
  const refreshInFlightRef = useRef(false)
  const navigationAbortRef = useNavigationAbort(() => {
    if (taskFetchControllerRef.current) {
      taskFetchControllerRef.current.abort()
      taskFetchControllerRef.current = null
    }
  })
  useEffect(() => {
    setPageSizeHydrated(true)
  }, [])

  useEffect(() => {
    if (!pageSizeHydrated) {
      return
    }
    persistPageSize(taskPageSizeStorageKey, pageSize)
  }, [pageSize, pageSizeHydrated, taskPageSizeStorageKey])

  useEffect(() => {
    setActiveDepartmentFilters(storedTaskFilters?.departments ?? [])
    setExactDepartmentMatch(storedTaskFilters?.exactMatch ?? true)
    setTaskScope(storedTaskFilters?.taskScope ?? "all")
    setSearch(storedTaskFilters?.search ?? "")
  }, [storedTaskFilters])

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

  const sortTasksForDisplay = useCallback((list: TaskRecord[]) => {
    const now = Date.now()
    const parseDueDate = (task: TaskRecord) => {
      if (!task.dueDate) {
        return null
      }
      const parsed = Date.parse(task.dueDate)
      return Number.isFinite(parsed) ? parsed : null
    }
    const upcoming: Array<{ task: TaskRecord; due: number }> = []
    const past: TaskRecord[] = []

    for (const task of list) {
      const due = parseDueDate(task)
      if (due !== null && due >= now) {
        upcoming.push({ task, due })
      } else {
        past.push(task)
      }
    }

    upcoming.sort((a, b) => {
      if (a.due !== b.due) {
        return a.due - b.due
      }
      return a.task.title.localeCompare(b.task.title, undefined, { sensitivity: "base" })
    })

    past.sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
    )

    return [...upcoming.map((entry) => entry.task), ...past]
  }, [])

  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasksError, setTasksError] = useState<string | null>(null)
  const [remoteDepartments, setRemoteDepartments] = useState<RemoteDepartment[]>([])
  const [departmentsLoading, setDepartmentsLoading] = useState(true)
  const [departmentsError, setDepartmentsError] = useState<string | null>(null)
  const [departmentFilterMenuOpen, setDepartmentFilterMenuOpen] = useState(false)

  const departmentFilterSet = useMemo(() => {
    const names = new Set(
      activeDepartmentFilters
        .map((name) => name.trim().toLowerCase())
        .filter(Boolean)
    )
    const ids = new Set(
      remoteDepartments
        .filter((dept) => names.has(dept.name.trim().toLowerCase()))
        .map((dept) => dept.id)
    )
    return { names, ids }
  }, [activeDepartmentFilters, remoteDepartments])

  const departmentById = useMemo(() => {
    return remoteDepartments.reduce<Record<string, RemoteDepartment>>((acc, dept) => {
      acc[dept.id] = dept
      return acc
    }, {})
  }, [remoteDepartments])

  const filteredTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return sortTasksForDisplay(
      allTasks.filter((task) => {
        const hasDepartmentFilters =
          departmentFilterSet.names.size > 0 || departmentFilterSet.ids.size > 0
        if (hasDepartmentFilters) {
            const candidateIds = new Set<string>()
            const candidateNames = new Set<string>()

            if (task.department) {
              candidateIds.add(task.department.id)
              candidateNames.add(task.department.name.trim().toLowerCase())
            }

            task.assignees.forEach((assignee) => {
              if (!assignee.departmentId) {
                return
              }
              candidateIds.add(assignee.departmentId)
              const assigneeDeptName = departmentById[assignee.departmentId]?.name
              if (assigneeDeptName) {
                candidateNames.add(assigneeDeptName.trim().toLowerCase())
              }
            })

            if (exactDepartmentMatch) {
              const idsMatchExactly =
                departmentFilterSet.ids.size === 0 ||
                (candidateIds.size === departmentFilterSet.ids.size &&
                  Array.from(departmentFilterSet.ids).every((id) => candidateIds.has(id)))
              const namesMatchExactly =
                departmentFilterSet.names.size === 0 ||
                (candidateNames.size === departmentFilterSet.names.size &&
                  Array.from(departmentFilterSet.names).every((name) => candidateNames.has(name)))
              if (!idsMatchExactly && !namesMatchExactly) {
                return false
              }
            } else {
              const matchesSelectedId = Array.from(candidateIds).some((id) =>
                departmentFilterSet.ids.has(id)
              )
              const matchesSelectedName = Array.from(candidateNames).some((name) =>
                departmentFilterSet.names.has(name)
              )

              if (!matchesSelectedId && !matchesSelectedName) {
                return false
              }
            }
        }
        if (taskScope === "assignee") {
          if (!membershipId) return false
          const isAssignee = task.assignees.some((assignee) => assignee.id === membershipId)
          if (!isAssignee) return false
        } else if (taskScope === "assigner") {
          if (!membershipId) return false
          if (task.createdBy.id !== membershipId) return false
        }
        if (!normalizedSearch) return true
        const haystack = [
          task.title,
          task.detail ?? "",
          task.department?.name ?? "",
          task.assignees.map((a) => a.username ?? a.fullName ?? "").join(" "),
          task.createdBy.username ?? "",
          task.createdBy.fullName ?? "",
        ]
          .join(" ")
          .toLowerCase()
        return haystack.includes(normalizedSearch)
      })
    )
  }, [
    allTasks,
    departmentById,
    departmentFilterSet,
    exactDepartmentMatch,
    membershipId,
    search,
    sortTasksForDisplay,
    taskScope,
  ])

  const departmentOptions = useMemo(() => {
    const sorted = [...remoteDepartments].sort(
      (a, b) => a.order - b.order || a.name.localeCompare(b.name)
    )
    const names = sorted.map((dept) => dept.name)
    return Array.from(new Set(names))
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
    return filteredTasks.reduce<
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
  }, [departmentById, filteredTasks])

  const pageSizeOptions = useMemo(() => [...BASE_PAGE_SIZE_OPTIONS], [])

  useEffect(() => {
    if (!pageSizeOptions.includes(pageSize)) {
      const fallbackSize = BASE_PAGE_SIZE_OPTIONS[0]
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

  useEffect(() => {
    persistTaskFilters(taskFilterStorageKey, {
      departments: activeDepartmentFilters,
      exactMatch: exactDepartmentMatch,
      taskScope,
      search,
    })
  }, [activeDepartmentFilters, exactDepartmentMatch, search, taskFilterStorageKey, taskScope])

  useEffect(() => {
    const totalTasks = filteredTasks.length
    setTotalPages(Math.max(1, Math.ceil(totalTasks / pageSize)))
    setTotalCount(totalTasks)
  }, [filteredTasks.length, pageSize])

  const fetchDepartments = useCallback(async () => {
    if (!projectId || navigationAbortRef.current) {
      return
    }
    setDepartmentsLoading(true)
    try {
      setDepartmentsError(null)
      const data = await fetchProjectDepartments(projectId)
      if (navigationAbortRef.current) {
        return
      }
      setRemoteDepartments(normalizeDepartments(data))
    } catch (error) {
      console.error(error)
      if (!navigationAbortRef.current) {
        setDepartmentsError("Unable to load departments")
      }
      if (isRemovalError(error)) {
        redirectToProjects()
      }
    } finally {
      if (!navigationAbortRef.current) {
        setDepartmentsLoading(false)
      }
    }
  }, [navigationAbortRef, projectId, redirectToProjects])

  const fetchTasks = useCallback(
    async () => {
      if (!projectId || navigationAbortRef.current) {
        return
      }
      if (taskFetchControllerRef.current) {
        taskFetchControllerRef.current.abort()
      }
      const controller = new AbortController()
      taskFetchControllerRef.current = controller
      setHasLoadedTasks(false)
      setTasksLoading(true)
      try {
        setTasksError(null)
        const aggregated: TaskRecord[] = []
        let totalCountLocal: number | null = null
        let currentPage = 1
        const pageSize = 200
        while (!navigationAbortRef.current) {
          const result = await fetchProjectTasks(projectId, {
            page: currentPage,
            pageSize,
            signal: controller.signal,
          })
          if (controller.signal.aborted || navigationAbortRef.current) {
            return
          }
          aggregated.push(...result.tasks)
          totalCountLocal = result.totalCount ?? totalCountLocal ?? aggregated.length
          const totalPagesLocal =
            result.totalPages ??
            (result.totalCount && result.pageSize
              ? Math.max(1, Math.ceil(result.totalCount / result.pageSize))
              : null)
          const reachedEnd =
            (totalPagesLocal !== null && currentPage >= totalPagesLocal) ||
            result.tasks.length < pageSize
          if (reachedEnd) {
            break
          }
          currentPage += 1
        }
        setAllTasks(applyPendingCardColorOverrides(aggregated))
        setTotalCount(totalCountLocal ?? aggregated.length)
      } catch (error) {
        if ((error as Error)?.name === "AbortError") {
          return
        }
        console.error(error)
        if (isRemovalError(error)) {
          redirectToProjects()
          return
        }
        if (!navigationAbortRef.current) {
          setTasksError(error instanceof Error ? error.message : "Unable to load tasks")
        }
      } finally {
        if (taskFetchControllerRef.current === controller) {
          taskFetchControllerRef.current = null
          if (!navigationAbortRef.current) {
            setHasLoadedTasks(true)
            setTasksLoading(false)
          }
        }
      }
    },
    [
      projectId,
      applyPendingCardColorOverrides,
      navigationAbortRef,
      redirectToProjects,
    ]
  )

  const reloadMembership = useCallback(async () => {
    if (!projectId || navigationAbortRef.current) {
      setMembership(null)
      setMembershipLoading(false)
      return
    }
    setMembershipLoading(true)
    try {
      const membershipRecord = await fetchProjectMembership(projectId)
      if (navigationAbortRef.current) {
        return
      }
      setMembership(membershipRecord ?? null)
    } catch (error) {
      console.error("Failed to load membership", error)
      if (!navigationAbortRef.current) {
        setMembership(null)
      }
      if (isRemovalError(error)) {
        redirectToProjects()
      }
    } finally {
      if (!navigationAbortRef.current) {
        setMembershipLoading(false)
      }
    }
  }, [navigationAbortRef, projectId, redirectToProjects])

  useEffect(() => {
    fetchDepartments()
  }, [projectId, fetchDepartments])

  useEffect(() => {
    fetchTasks()
  }, [projectId, fetchTasks])

  useEffect(() => {
    reloadMembership()
  }, [projectId, reloadMembership])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    const handleProjectRefresh = (event: Event) => {
      if (navigationAbortRef.current) {
        return
      }
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
      reloadMembership()
    }
    window.addEventListener(PROJECT_REFRESH_EVENT, handleProjectRefresh)
    return () => window.removeEventListener(PROJECT_REFRESH_EVENT, handleProjectRefresh)
  }, [fetchDepartments, fetchTasks, navigationAbortRef, projectId, reloadMembership])

  useEffect(() => {
    if (!membershipId && taskScope !== "all") {
      setTaskScope("all")
    }
  }, [membershipId, taskScope])

  useEffect(() => {
    return () => {
      if (taskFetchControllerRef.current) {
        taskFetchControllerRef.current.abort()
      }
    }
  }, [])

  useEffect(() => {
    if (!projectId) {
      return
    }
    const runRefresh = async () => {
      if (refreshInFlightRef.current) return
      refreshInFlightRef.current = true
      try {
        await Promise.all([fetchDepartments(), fetchTasks(), reloadMembership()])
      } catch (error) {
        console.error("Task page refresh failed", error)
      } finally {
        refreshInFlightRef.current = false
      }
    }
    //refreshTimerRef.current = window.setInterval(runRefresh, 15000)
    return () => {
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
    }
  }, [fetchDepartments, fetchTasks, projectId, reloadMembership])

  const handleTaskColorChange = useCallback(
    async (taskId: string, color: string) => {
      const normalizedColor = sanitizeHexColor(color)
      const derivedTextColor = getContrastingTextColor(normalizedColor)
      latestColorRequestRef.current[taskId] = normalizedColor

      setAllTasks((prev) => {
        const previousTask = prev.find((task) => task.id === taskId)
        if (previousTask) {
          colorRollbackRef.current[taskId] = {
            cardColor: previousTask.cardColor,
            cardTextColor: previousTask.cardTextColor,
          }
        }
        const nextList = prev.map((task) =>
          task.id === taskId
            ? { ...task, cardColor: normalizedColor, cardTextColor: derivedTextColor }
            : task
        )
        return sortTasksForDisplay(nextList)
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
        setAllTasks((prev) =>
          sortTasksForDisplay(prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)))
        )
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
        setAllTasks((prev) => {
          const rollback = colorRollbackRef.current[taskId]
          if (!rollback) {
            return prev
          }
          const nextList = prev.map((task) =>
            task.id === taskId
              ? { ...task, cardColor: rollback.cardColor, cardTextColor: rollback.cardTextColor }
              : task
          )
          return sortTasksForDisplay(nextList)
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
      const normalized = departmentName.trim()
      if (enabled) {
        if (prev.some((item) => item.trim().toLowerCase() === normalized.toLowerCase())) {
          return prev
        }
        return [...prev, normalized]
      }
      return prev.filter((name) => name.trim().toLowerCase() !== normalized.toLowerCase())
    })
  }, [])

  const handleResetFilters = useCallback(() => {
    setActiveDepartmentFilters([])
    setExactDepartmentMatch(true)
    setTaskScope("all")
  }, [])

  const isScopeSelectionDisabled = membershipLoading || !membershipId
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
      setAllTasks((prev) => prev.filter((task) => task.id !== pendingDeleteTask.id))
      setTotalCount((prev) => (prev === null ? prev : Math.max(0, prev - 1)))
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(PROJECT_REFRESH_EVENT, {
            detail: { projectId, origin: "tasks-page" },
          })
        )
      }
      try {
        await fetchTasks()
      } catch (refreshError) {
        console.error("Unable to refresh tasks after delete", refreshError)
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

  const containerMinHeight = "calc(100dvh - 7rem)"
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

  const TaskCardSkeleton = () => (
    <div className="task-card relative flex flex-col gap-4 rounded-[3rem] border-2 border-primary/30 bg-white px-8 py-6 shadow-[0_4px_0_rgba(144,122,214,0.15)] sm:flex-row sm:items-center sm:gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-3 pr-16">
        <Skeleton className="h-6 w-1/3 bg-primary/20" />
        <Skeleton className="h-4 w-1/4 bg-primary/10" />
        <Skeleton className="h-4 w-3/4 bg-primary/10" />
      </div>
      <div className="flex items-center gap-3 self-start sm:self-auto">
        <Skeleton className="h-10 w-32 rounded-full bg-primary/10" />
        <Skeleton className="h-9 w-9 rounded-full bg-primary/10" />
      </div>
    </div>
  )

  return (
    <div className="asap-scroll overflow-hidden page-fade w-full min-h-[calc(100vh-6.5rem)] px-[clamp(3.25rem,4vw,3.25rem)] pt-3">
      <div className="flex w-full flex-col items-start gap-4 lg:flex-row lg:items-start lg:gap-6">
        <BackButton dataCy="project-task-back-button" ariaLabel="Back to projects" />
        <div
          className="mx-auto mt-10 flex w-full max-w-full flex-1 flex-col gap-8 px-[clamp(1.5rem,3vw,3.5rem)] pb-10 page-slide"
          style={{ minHeight: containerMinHeight }}
        >
          <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full flex-col gap-4 lg:flex-1 lg:flex-row lg:flex-nowrap lg:items-center lg:gap-4">
              <SearchField
                wrapperClassName="w-full sm:max-w-md lg:flex-1"
                placeholder="Search"
                value={search}
                data-cy="project-task-search-input"
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="flex w-full flex-row flex-wrap items-center gap-3 lg:w-auto lg:flex-nowrap">
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
                  exactDepartmentMatch={exactDepartmentMatch}
                  onExactDepartmentMatchChange={setExactDepartmentMatch}
                  taskScope={taskScope}
                  onTaskScopeChange={handleTaskScopeChange}
                  isScopeSelectionDisabled={isScopeSelectionDisabled}
                  onResetFilters={handleResetFilters}
                />
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
              <div className="flex items-center gap-3">
                <TaskPageSizeSelector
                  pageSize={pageSize}
                  pageSizeOptions={pageSizeOptions}
                  totalCount={totalCount ?? filteredTasks.length}
                  onPageSizeChange={(sizeOption) => {
                    if (sizeOption === pageSize) {
                      return
                    }
                    setPageSize(sizeOption)
                    setPage(1)
                  }}
                />
                {showCreateTaskButton ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/projects/${projectId}/task/create`)}
                    disabled={membershipLoading || !canManageTasks}
                    className="inline-flex h-12 items-center justify-center rounded-full border-primary/40 bg-white px-5 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/10 disabled:opacity-60"
                  >
                    <PlusCircle className="size-5" aria-hidden="true" />
                    Create Task
                  </Button>
                ) : null}
              </div>
            </div>
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
                  "projects-scroll relative [scrollbar-gutter:stable] flex flex-col space-y-3 px-0.5 py-2 pb-2"
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
                {(!hasLoadedTasks || tasksLoading) && paginatedTasks.length === 0 ? (
                  <div className="flex min-h-[11rem] flex-col items-center justify-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-6 text-center text-sm text-primary">
                    <span className="text-base font-semibold">Loading task...</span>
                    <div className="w-full max-w-sm">
                      <ProgressBar />
                    </div>
                  </div>
                ) : null}
                {paginatedTasks.map((task, index) => (
                  <div key={task.id} className="page-slide">
                    <TaskCard
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
                  </div>
                ))}
                {tasksLoading && paginatedTasks.length > 0 ? (
                  <div className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center rounded-[2.25rem] bg-white/70 backdrop-blur-sm">
                    <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl border border-primary/20 bg-white/80 px-6 py-5 text-sm text-primary shadow-[0_8px_20px_rgba(72,68,110,0.15)]">
                      <span className="text-base font-semibold">Updating tasks…</span>
                      <ProgressBar />
                    </div>
                  </div>
                ) : null}
                {paginatedTasks.length === 0 &&
                hasLoadedTasks &&
                !tasksLoading &&
                !tasksError ? (
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

            {(totalCount ?? filteredTasks.length) > 0 ? (
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
