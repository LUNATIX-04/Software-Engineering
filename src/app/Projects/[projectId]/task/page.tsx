"use client"

import * as React from "react"
import { useRef, useEffect, useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronDown, PlusCircle, Search, Check, Filter, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  TASK_STATUS_LABEL,
  TASK_STATUS_STYLE,
  type TaskRecord,
} from "./data"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { TaskCard } from "@/components/tasks/TaskCard"

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
}

const ALL_DEPARTMENTS_LABEL = "All Departments"

export default function ProjectTaskPage({ params }: ProjectTaskPageProps) {
  const { projectId } = React.use(params)
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [search, setSearch] = useState("")
  const [activeDepartmentFilters, setActiveDepartmentFilters] = useState<string[]>([])
  const [myTaskOnly, setMyTaskOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pendingDeleteTask, setPendingDeleteTask] = useState<TaskRecord | null>(null)
  const [deletingTask, setDeletingTask] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(
    BASE_PAGE_SIZE_OPTIONS[1] ?? BASE_PAGE_SIZE_OPTIONS[0]
  )
  const [pageInput, setPageInput] = useState("1")
  const [pageHintVisible, setPageHintVisible] = useState(false)
  const paginationControlsRef = useRef<HTMLDivElement | null>(null)
  const pageHintTimeoutRef = useRef<number | null>(null)
  const [pageSizeMenuOpen, setPageSizeMenuOpen] = useState(false)
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasksError, setTasksError] = useState<string | null>(null)
  const [remoteDepartments, setRemoteDepartments] = useState<RemoteDepartment[]>([])
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [departmentsError, setDepartmentsError] = useState<string | null>(null)
  const [membershipId, setMembershipId] = useState<string | null>(null)
  const [membershipLoading, setMembershipLoading] = useState(true)
  const [departmentFilterMenuOpen, setDepartmentFilterMenuOpen] = useState(false)

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

    return tasks
      .filter((task) => {
        const meta = taskDepartmentMeta[task.id]
        const assigneeCounts = meta?.assigneeCounts ?? {}
        const matchesMyTask =
          !myTaskOnly ||
          (membershipId
            ? task.assignees.some((assignee) => assignee.id === membershipId) ||
              task.createdBy.id === membershipId
            : false)
        if (!matchesMyTask) {
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
    membershipId,
    myTaskOnly,
    search,
    taskDepartmentMeta,
    tasks,
  ])

  const totalPages = useMemo(() => {
    if (filteredTasks.length === 0) {
      return 1
    }
    return Math.max(1, Math.ceil(filteredTasks.length / pageSize))
  }, [filteredTasks.length, pageSize])

  const pageSizeOptions = useMemo(() => {
    const totalTasks = filteredTasks.length || tasks.length
    if (totalTasks === 0) {
      return BASE_PAGE_SIZE_OPTIONS.slice(0, 1)
    }
    const maxAllowed =
      BASE_PAGE_SIZE_OPTIONS.find((option) => option >= totalTasks) ??
      BASE_PAGE_SIZE_OPTIONS[BASE_PAGE_SIZE_OPTIONS.length - 1]
    return BASE_PAGE_SIZE_OPTIONS.filter((option) => option <= maxAllowed)
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
    setPageInput(String(page))
    setCurrentPage(page)
  }, [page])

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
    try {
      setDepartmentsError(null)
      setDepartmentsLoading(true)
      const response = await fetch(`/api/projects/${projectId}/departments`, { cache: "no-store" })
      if (!response.ok) {
        throw new Error(response.status === 404 ? "Not found" : "Failed to load departments")
      }
      const data = (await response.json()) as RemoteDepartment[]
      setRemoteDepartments(
        data.map((dept) => ({
          id: dept.id,
          name: dept.name,
          color: dept.color,
          textColor: dept.textColor,
          order: dept.order,
        }))
      )
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
    try {
      setTasksError(null)
      setTasksLoading(true)
      const response = await fetch(`/api/projects/${projectId}/tasks`, { cache: "no-store" })
      if (!response.ok) {
        throw new Error(response.status === 404 ? "Not found" : "Failed to load tasks")
      }
      const data = (await response.json()) as TaskRecord[]
      setTasks(data)
    } catch (error) {
      console.error(error)
      setTasksError(error instanceof Error ? error.message : "Unable to load tasks")
    } finally {
      setTasksLoading(false)
    }
  }, [projectId])

  const fetchMembership = useCallback(async () => {
    if (!projectId) {
      return
    }
    try {
      setMembershipLoading(true)
      const response = await fetch(`/api/projects/${projectId}/membership`, { cache: "no-store" })
      if (!response.ok) {
        setMembershipId(null)
        return
      }
      const data = (await response.json()) as { id?: string | null }
      setMembershipId(data?.id ?? null)
    } catch (error) {
      console.error(error)
      setMembershipId(null)
    } finally {
      setMembershipLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchDepartments()
  }, [fetchDepartments])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  useEffect(() => {
    fetchMembership()
  }, [fetchMembership])

  useEffect(() => {
    if (!membershipId && myTaskOnly) {
      setMyTaskOnly(false)
    }
  }, [membershipId, myTaskOnly])

  const paginatedTasks = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    return filteredTasks.slice(startIndex, startIndex + pageSize)
  }, [filteredTasks, page, pageSize])

  const clearPageHintTimeout = useCallback(() => {
    if (pageHintTimeoutRef.current) {
      window.clearTimeout(pageHintTimeoutRef.current)
      pageHintTimeoutRef.current = null
    }
  }, [])

  const hidePageHint = useCallback(() => {
    clearPageHintTimeout()
    setPageHintVisible(false)
  }, [clearPageHintTimeout])

  const triggerPageHint = useCallback(() => {
    if (typeof window === "undefined") {
      return
    }
    setPageHintVisible(true)
    clearPageHintTimeout()
    pageHintTimeoutRef.current = window.setTimeout(() => {
      setPageHintVisible(false)
      pageHintTimeoutRef.current = null
    }, 2000)
  }, [clearPageHintTimeout])

  const commitPageInput = useCallback(() => {
    if (pageInput.trim().length === 0) {
      setPageInput(String(page))
      return
    }
    const parsed = Number(pageInput)
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > totalPages) {
      setPageInput(String(page))
      return
    }
    setPage(parsed)
  }, [page, pageInput, totalPages])
  
    useEffect(() => {
      if (!pageHintVisible) {
        return
      }
  
      const handlePointerDown = (event: Event) => {
        if (!paginationControlsRef.current?.contains(event.target as Node)) {
          hidePageHint()
        } else {
          triggerPageHint()
        }
      }
  
      const handleFocusIn = (event: FocusEvent) => {
        if (!paginationControlsRef.current?.contains(event.target as Node)) {
          hidePageHint()
        } else {
          triggerPageHint()
        }
      }
  
      const pointerEventName =
        typeof window !== "undefined" && "PointerEvent" in window ? "pointerdown" : "mousedown"
  
      document.addEventListener(pointerEventName, handlePointerDown as EventListener)
      document.addEventListener("focusin", handleFocusIn)
  
      return () => {
        document.removeEventListener(pointerEventName, handlePointerDown as EventListener)
        document.removeEventListener("focusin", handleFocusIn)
      }
    }, [hidePageHint, pageHintVisible, triggerPageHint])
  
    useEffect(() => {
      return () => {
        clearPageHintTimeout()
      }
    }, [clearPageHintTimeout])


  React.useEffect(() => {
    setPage(1)
    setPageInput("1")
  }, [activeDepartmentFilters, myTaskOnly, search])

  const handleToggleDepartmentFilter = useCallback(
    (departmentName: string, enabled: boolean) => {
      if (myTaskOnly) {
        return
      }
      setActiveDepartmentFilters((prev) => {
        if (enabled) {
          if (prev.includes(departmentName)) {
            return prev
          }
          return [...prev, departmentName]
        }
        return prev.filter((name) => name !== departmentName)
      })
    },
    [myTaskOnly]
  )

  const handleResetDepartmentFilters = useCallback(() => {
    if (myTaskOnly) {
      return
    }
    setActiveDepartmentFilters([])
  }, [myTaskOnly])

  const handleToggleMyTaskFilter = useCallback(
    (next: boolean) => {
      if (!membershipId) {
        return
      }
      setMyTaskOnly(next)
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

  const pageHint = totalPages <= 1 ? "Only page 1" : `Pages 1–${totalPages}`

  const containerMinHeight = "calc(100dvh - 8rem)"
  const cardListMaxHeight = "calc(100dvh - 22rem)"

  const filterActive = myTaskOnly || activeDepartmentFilters.length > 0
  const filterSummaryText = myTaskOnly
    ? "My Tasks"
    : activeDepartmentFilters.length === 0
      ? ALL_DEPARTMENTS_LABEL
      : activeDepartmentFilters.length <= 2
        ? activeDepartmentFilters.join(", ")
        : `${activeDepartmentFilters.length} selected`
  const filterBadgeCount = !myTaskOnly && activeDepartmentFilters.length > 0 ? activeDepartmentFilters.length : null
  const isMyTaskToggleDisabled = membershipLoading || !membershipId

  return (
    <div className="mx-auto overflow-hidden w-full px-[clamp(3.25rem,4vw,3.25rem)] pt-3">
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

        <div className="mx-auto mt-10 flex w-full max-w-6xl flex-1 flex-col gap-10 px-[clamp(1.5rem,3vw,3.5rem)]"
            style={{ minHeight: containerMinHeight }} >
          <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary/60" />
                <input
                  type="text"
                  placeholder="Search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-full border-2 border-primary/40 bg-white py-3 pl-12 pr-4 text-sm text-foreground placeholder:text-primary/60 focus:border-primary focus:outline-none"
                />
              </div>
              <DropdownMenu open={departmentFilterMenuOpen} onOpenChange={setDepartmentFilterMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex w-full items-center justify-between rounded-full border-2 px-5 py-2 text-base font-medium focus:outline-none transition sm:w-auto",
                      filterActive
                        ? "border-primary bg-primary/10 text-[#2F2766]"
                        : "border-primary/30 bg-white text-primary hover:border-primary hover:bg-primary/5"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <Filter className="size-4 text-primary" aria-hidden="true" />
                      <span className="flex flex-col text-left leading-tight">
                        <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-primary/60">
                          Departments
                        </span>
                        <span className="text-sm font-semibold text-[#2F2766]">{filterSummaryText}</span>
                      </span>
                    </span>
                    <span className="ml-4 inline-flex items-center gap-2">
                      {filterBadgeCount ? (
                        <span className="inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-primary/90 px-1 text-xs font-bold text-primary-foreground">
                          {filterBadgeCount}
                        </span>
                      ) : null}
                      <ChevronDown className="size-4 text-primary" aria-hidden="true" />
                    </span>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="start"
                  className="w-60 rounded-3xl border border-primary/40 bg-white px-3 py-2 text-sm font-semibold text-primary shadow-[0_10px_30px_rgba(72,68,110,0.2)]"
                >
                  <div className="flex items-center justify-between px-1 pb-2 pt-1">
                    <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-primary/60">
                      Filters
                    </span>
                    <button
                      type="button"
                      className="rounded-full p-1 text-primary/60 transition hover:bg-primary/10 hover:text-primary focus:outline-none"
                      onClick={() => setDepartmentFilterMenuOpen(false)}
                      aria-label="Close filters"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <DropdownMenuSeparator className="my-1 bg-primary/15" />
                  <div className="max-h-[18rem] overflow-y-auto py-1">
                    {departmentOptions.map((dept) => (
                      <DropdownMenuCheckboxItem
                        key={dept}
                        checked={activeDepartmentFilters.includes(dept)}
                        disabled={myTaskOnly}
                        onCheckedChange={(checked) =>
                          handleToggleDepartmentFilter(dept, Boolean(checked))
                        }
                        onSelect={(event) => event.preventDefault()}
                        className={cn(
                          "rounded-2xl px-3 py-2 pr-10 text-foreground focus:bg-primary/10 focus:text-primary [&>span:first-child]:left-auto [&>span:first-child]:right-3",
                          myTaskOnly && "pointer-events-none opacity-50"
                        )}
                      >
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="size-3 rounded-full border border-black/10"
                            style={{
                              backgroundColor: departmentByName[dept]?.color ?? "#D9D6FF",
                            }}
                          />
                          <span className="block max-w-[10rem] truncate">{dept}</span>
                        </span>
                      </DropdownMenuCheckboxItem>
                    ))}
                    {departmentOptions.length === 0 ? (
                      <div className="px-2 py-3 text-xs font-semibold uppercase tracking-wide text-primary/60">
                        No departments yet
                      </div>
                    ) : null}
                  </div>
                  <DropdownMenuSeparator className="my-2 bg-primary/20" />
                  <DropdownMenuCheckboxItem
                    checked={myTaskOnly}
                    disabled={isMyTaskToggleDisabled}
                    onCheckedChange={(checked) => handleToggleMyTaskFilter(Boolean(checked))}
                    onSelect={(event) => event.preventDefault()}
                    className={cn(
                      "rounded-2xl px-3 py-2 pr-10 focus:bg-primary/10 focus:text-primary [&>span:first-child]:left-auto [&>span:first-child]:right-3",
                      isMyTaskToggleDisabled && "pointer-events-none opacity-50"
                    )}
                  >
                    My Tasks
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator className="my-2 bg-primary/20" />
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault()
                      handleResetDepartmentFilters()
                    }}
                    className={cn(
                      "rounded-2xl px-3 py-2 text-primary/70 focus:bg-primary/10 focus:text-primary",
                      myTaskOnly && "pointer-events-none opacity-50"
                    )}
                  >
                    Reset filters
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-4">
              <div className="relative flex items-center gap-2 select-none text-sm font-medium text-primary flex-nowrap">
                <span className="whitespace-nowrap">Per page</span>
                <DropdownMenu onOpenChange={setPageSizeMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={
                        pageSizeMenuOpen
                          ? "inline-flex h-12 select-none items-center rounded-full border-2 border-primary bg-primary/10 px-4 text-sm font-semibold text-primary"
                          : "inline-flex h-12 select-none items-center rounded-full border-2 border-primary/40 bg-white px-4 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/10"
                      }
                    >
                      {pageSize}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-32 rounded-2xl border border-primary/30 bg-background/95 p-2 text-sm text-primary shadow-[0_16px_30px_rgba(39,36,66,0.15)]"
                  >
                    {pageSizeOptions.map((sizeOption) => {
                      const isActive = sizeOption === pageSize
                      return (
                        <DropdownMenuItem
                          key={sizeOption}
                          className={cn(
                            "flex items-center justify-between rounded-xl px-3 py-2 font-semibold transition hover:bg-primary/10 focus:bg-primary/10 focus:text-primary",
                            isActive && "bg-primary/10 text-primary"
                          )}
                          onSelect={() => {
                            if (isActive) {
                              return
                            }
                            setPageSize(sizeOption)
                            setPage(1)
                          }}
                        >
                          <span>{sizeOption}</span>
                          {isActive ? <Check className="size-4" /> : null}
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
                <div
                  className={cn(
                    "pointer-events-none absolute right-[-8rem] top-3/2 z-[500] max-w-[14rem] -translate-y-1/2 rounded-2xl border border-primary/30 bg-white/95 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary shadow-lg transition duration-200 ease-out",
                    "whitespace-nowrap",
                    pageSizeMenuOpen && filteredTasks.length > 0 ? "opacity-100" : "opacity-0"
                  )}
                >
                  {filteredTasks.length > 0 ? `${filteredTasks.length} tasks` : ""}
                </div>
              </div>
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
                "projects-scroll [scrollbar-gutter:stable] flex flex-col space-y-3 px-0.5 py-4",
                paginatedTasks.length > 0 ? "h-full" : "h-auto"
              )}
              style={{ maxHeight: cardListMaxHeight }}
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
            {paginatedTasks.map((task) => (
              <TaskCard
                key={task.id}
                title={task.title}
                deadline={task.dueDate ? format(new Date(task.dueDate), "dd/MM/yyyy") : "—"}
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
                onOpen={() => handleOpenTask(task.id)}
                onEdit={() => handleEditTask(task.id)}
                onDelete={() => handleDeleteTaskRequest(task)}
              />
            ))}

            {paginatedTasks.length === 0 ? (
              <div className="flex min-h-[11rem] flex-col items-center justify-center rounded-[2.5rem] border border-dashed border-primary/30 bg-white/60 p-10 text-center text-primary">
                <p className="text-lg font-semibold">No tasks found</p>
                <p className="mt-2 text-sm text-primary/70">
                  Try adjusting the search or department filter.
                </p>
              </div>
            ) : null}
            </div>
          </div>

          {!tasksLoading && filteredTasks.length > 0 ? (
                      <div
                          ref={paginationControlsRef}
                          className="mt-auto mb-10 flex select-none items-center justify-center gap-4 pt-4"
                          onFocus={triggerPageHint}
                          onBlur={(event) => {
                            const nextTarget = event.relatedTarget as HTMLElement | null
                            if (!nextTarget || !paginationControlsRef.current?.contains(nextTarget)) {
                              hidePageHint()
                            }
                          }}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              triggerPageHint()
                              setPage((prev) => Math.max(1, prev - 1))
                            }}
                            disabled={page === 1}
                            className="size-10 select-none rounded-full border border-transparent text-lg text-primary/70 transition-colors hover:border-transparent hover:!bg-transparent hover:text-primary focus:outline-none focus-visible:outline-none focus-visible:border-transparent focus-visible:ring-0 active:border-transparent active:bg-transparent"
                          >
                            &#9664;
                          </Button>
                          <div className="relative flex flex-col items-center gap-1">
                            <span
                              aria-hidden="true"
                              className={cn(
                                "absolute -top-8 whitespace-nowrap rounded-full border border-primary/30 bg-white px-3 py-1 text-xs font-medium text-primary shadow-sm transition-all duration-200 ease-out",
                                pageHintVisible
                                  ? "pointer-events-auto opacity-100 translate-y-0 scale-100"
                                  : "pointer-events-none opacity-0 -translate-y-1 scale-95"
                              )}
                            >
                              {pageHint}
                            </span>
                            <span id="project-page-hint" className="sr-only">
                              {pageHint}
                            </span>
                            <input
                              id="project-page-input"
                              type="text"
                              inputMode="numeric"
                              value={pageInput}
                              onFocus={triggerPageHint}
                              onBlur={() => {
                                commitPageInput()
                                hidePageHint()
                              }}
                              onChange={(event) => {
                                const numericValue = event.target.value.replace(/[^0-9]/g, "")
                                setPageInput(numericValue)
                                triggerPageHint()
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  commitPageInput()
                                  triggerPageHint()
                                }
                              }}
                              className="w-16 select-text rounded-full border-2 border-primary/40 bg-white px-3 py-2 text-center text-base font-semibold text-primary shadow-sm focus:border-primary focus:outline-none"
                              aria-describedby="project-page-hint"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              triggerPageHint()
                              setPage((prev) => Math.min(totalPages, prev + 1))
                            }}
                            disabled={page === totalPages}
                            className="size-10 select-none rounded-full border border-transparent text-lg text-primary/70 transition-colors hover:border-transparent hover:!bg-transparent hover:text-primary focus:outline-none focus-visible:outline-none focus-visible:border-transparent focus-visible:ring-0 active:border-transparent active:bg-transparent"
                          >
                            &#9654;
                          </Button>
                        </div>
                      ):null}
        </div>
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={handleDialogOpenChange}>
          <AlertDialogContent className="bg-background border-2 border-primary/30 rounded-[2rem] px-6 py-8 text-center shadow-xl max-w-md mx-auto">
            <AlertDialogTitle className="text-2xl font-semibold text-foreground">
              Are you sure?<br />
              <span className="mt-2 block">
                You want to delete this task? <br />
                <span className="mt-5 block">
                  "{pendingDeleteTask?.title ?? ""}"
                </span>
              </span>
            </AlertDialogTitle>
            <AlertDialogFooter className="mt-6 flex justify-center gap-20 w-auto mx-auto">
              <AlertDialogCancel
                className="rounded-full bg-secondary border-none px-9 py-5 text-lg font-semibold text-secondary-foreground shadow-none transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                onClick={handleCancelDelete}
                disabled={deletingTask}
              >
                No
              </AlertDialogCancel>
              <AlertDialogAction
                className="rounded-full bg-primary px-9 py-5 text-lg font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                onClick={handleConfirmDelete}
                disabled={deletingTask}
              >
                {deletingTask ? "Deleting…" : "Yes"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
