"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { TASK_STATUS_LABEL, type TaskStatus } from "@/app/projects/[projectId]/task/data"
import {
  Check,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Info,
  Plus,
  Search,
  X,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"
import { usePreferences } from "@/contexts/preferences"
import type { DepartmentLayoutOption } from "@/types/preferences"
import { cn } from "@/lib/utils"
import { getContrastingTextColor, sanitizeHexColor } from "@/utils/colors"
import { Calendar } from "../ui/calendar"

type TaskFormValues = {
  title: string
  detail: string
  assigneeIds: string[]
  deadline: string
  status: TaskStatus
}

type TaskAssigneeOption = {
  id: string
  label: string
  username?: string | null
  fullName?: string | null
  role: string
  departmentName: string | null
  departmentColor: string | null
  departmentTextColor: string | null
}

type TaskFormProps = {
  heading: string
  submitLabel: string
  initialValues: TaskFormValues
  onSubmit: (values: TaskFormValues) => Promise<void> | void
  submitting?: boolean
  showStatus?: boolean
  className?: string
  assigneeOptions: TaskAssigneeOption[]
}

const DEADLINE_YEAR_MIN = 1900
const DEADLINE_YEAR_MAX = 2100

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Project Owner",
  HEADER: "Header",
  MEMBER: "Member",
}

const PROMINENT_ROLE_SET = new Set(["OWNER", "HEADER"])

function normalizeHex(value?: string | null) {
  if (!value) {
    return null
  }
  const sanitized = sanitizeHexColor(value)
  return sanitized.length === 7 ? sanitized : null
}

function adjustHexBrightness(hex: string, amount: number) {
  const normalized = normalizeHex(hex)
  if (!normalized) {
    return "#CFC2F6"
  }
  const clamp = (value: number) => Math.max(0, Math.min(255, value))
  const r = clamp(parseInt(normalized.slice(1, 3), 16) + amount)
  const g = clamp(parseInt(normalized.slice(3, 5), 16) + amount)
  const b = clamp(parseInt(normalized.slice(5, 7), 16) + amount)
  const toHex = (value: number) => value.toString(16).padStart(2, "0")
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min
  }
  return Math.min(max, Math.max(min, value))
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function parseTime(value: string | null | undefined) {
  if (!value) {
    return null
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  const segments = trimmed.split(":")
  if (segments.length < 2) {
    return null
  }
  const [hoursRaw, minutesRaw] = segments
  const hours = Number(hoursRaw)
  const minutes = Number(minutesRaw)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null
  }
  const safeHours = clampNumber(Math.trunc(hours), 0, 23)
  const safeMinutes = clampNumber(Math.trunc(minutes), 0, 59)
  return { hours: safeHours, minutes: safeMinutes }
}

function parseDeadline(value: string | null | undefined): Date | null {
  if (!value) {
    return null
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  const normalized = trimmed.replace(/-/g, "/").replace("T", " ")
  const segments = normalized
    .split(/\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
  if (segments.length === 0) {
    return null
  }
  const [datePortion, ...rest] = segments
  const dateParts = datePortion.split("/").map((part) => part.trim())
  const timePortion = rest.join(" ")
  if (dateParts.length !== 3) {
    return null
  }
  const [dayRaw, monthRaw, yearRaw] = dateParts
  const day = Number(dayRaw)
  const month = Number(monthRaw) - 1
  const year = Number(yearRaw)
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
    return null
  }
  const safeYear = clampNumber(Math.trunc(year), DEADLINE_YEAR_MIN, DEADLINE_YEAR_MAX)
  const safeMonthIndex = clampNumber(Math.trunc(month), 0, 11)
  const maxDays = daysInMonth(safeYear, safeMonthIndex)
  const safeDay = clampNumber(Math.trunc(day), 1, maxDays)
  const candidate = new Date(safeYear, safeMonthIndex, safeDay)
  const parsedTime = parseTime(timePortion)
  if (parsedTime) {
    candidate.setHours(parsedTime.hours, parsedTime.minutes, 0, 0)
  } else {
    candidate.setHours(0, 0, 0, 0)
  }
  return candidate
}

function composeDeadlineInput(dateText: string, timeText: string) {
  const datePart = dateText.trim()
  const timePart = timeText.trim()
  if (datePart && timePart) {
    return `${datePart} ${timePart}`
  }
  return datePart || ""
}

function getDeadlineParts(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ""
  const parsed = parseDeadline(trimmed)
  if (parsed) {
    const includesTime = trimmed.split(/\s+/).length > 1
    return {
      parsed,
      dateText: format(parsed, "dd/MM/yyyy"),
      timeText: includesTime ? format(parsed, "HH:mm") : "",
    }
  }
  if (!trimmed) {
    return { parsed: null, dateText: "", timeText: "" }
  }
  const [datePart, ...timePart] = trimmed.split(/\s+/)
  return {
    parsed: null,
    dateText: datePart ?? "",
    timeText: timePart.join(" "),
  }
}

export function TaskForm({
  heading,
  submitLabel,
  initialValues,
  onSubmit,
  submitting = false,
  showStatus = true,
  className,
  assigneeOptions,
}: TaskFormProps) {
  const [title, setTitle] = React.useState(initialValues.title ?? "")
  const [detail, setDetail] = React.useState(initialValues.detail ?? "")
  const { profile } = usePreferences()
  const assigneeLayout: DepartmentLayoutOption = profile?.departmentLayout ?? "fullWidth"

  const [assigneeIds, setAssigneeIds] = React.useState<string[]>(
    initialValues.assigneeIds.length > 0 ? [...initialValues.assigneeIds] : []
  )
  const [assigneePickerOpen, setAssigneePickerOpen] = React.useState(false)
  const [assigneeSearch, setAssigneeSearch] = React.useState("")
  const [assigneeDepartmentFilters, setAssigneeDepartmentFilters] = React.useState<string[]>([])
  const [assigneeRoleFilters, setAssigneeRoleFilters] = React.useState<string[]>([])
  const [priorityRoleFilterActive, setPriorityRoleFilterActive] = React.useState(false)
  const [deadline, setDeadline] = React.useState<Date | null>(() => {
    const parts = getDeadlineParts(initialValues.deadline)
    return parts.parsed
  })
  const [calendarMonth, setCalendarMonth] = React.useState<Date>(() => {
    const parts = getDeadlineParts(initialValues.deadline)
    return parts.parsed ?? new Date()
  })
  const [deadlineDateText, setDeadlineDateText] = React.useState(() => {
    const parts = getDeadlineParts(initialValues.deadline)
    return parts.dateText
  })
  const [deadlineTimeText, setDeadlineTimeText] = React.useState(() => {
    const parts = getDeadlineParts(initialValues.deadline)
    return parts.timeText
  })
  const [status, setStatus] = React.useState<TaskStatus>(initialValues.status)
  const [draggingIndex, setDraggingIndex] = React.useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null)
  const draggedAssigneeIndexRef = React.useRef<number | null>(null)
  type AssigneeMeta = TaskAssigneeOption & {
    roleLabel: string | null
    displayLabel: string
    searchText: string
    chipBackground: string
    chipTextColor: string
    chipBorderColor: string
  }

  const { assigneeMetaLookup, assigneeMetaList } = React.useMemo(() => {
    const lookup: Record<string, AssigneeMeta> = {}
    const list: AssigneeMeta[] = []
    assigneeOptions.forEach((option) => {
      const normalizedBackground = normalizeHex(option.departmentColor) ?? "#F6F0FF"
      const normalizedTextColor = normalizeHex(option.departmentTextColor)
      const chipTextColor = normalizedTextColor ?? getContrastingTextColor(normalizedBackground)
      const roleLabel =
        option.role === "HEADER"
          ? "Header - Project Owner"
          : ROLE_LABELS[option.role] ?? option.role ?? null
      const displayLabel =
        option.role && PROMINENT_ROLE_SET.has(option.role)
          ? roleLabel
            ? `${option.label} (${roleLabel})`
            : option.label
          : option.label
      const meta: AssigneeMeta = {
        ...option,
        roleLabel,
        displayLabel,
        chipBackground: normalizedBackground,
        chipTextColor,
        chipBorderColor: adjustHexBrightness(normalizedBackground, -35),
        searchText: [
          option.label,
          option.username ?? "",
          option.fullName ?? "",
          option.departmentName ?? "",
          roleLabel ?? "",
        ]
          .join(" ")
          .toLowerCase(),
      }
      lookup[option.id] = meta
      list.push(meta)
    })
    return { assigneeMetaLookup: lookup, assigneeMetaList: list }
  }, [assigneeOptions])

  const availableDepartmentFilters = React.useMemo(() => {
    const names = assigneeMetaList
      .map((option) => option.departmentName)
      .filter((name): name is string => Boolean(name))
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
  }, [assigneeMetaList])

  const availableRoleFilters = React.useMemo(() => {
    const roles = assigneeMetaList
      .map((option) => option.roleLabel)
      .filter((role): role is string => Boolean(role))
    return Array.from(new Set(roles)).sort((a, b) => a.localeCompare(b))
  }, [assigneeMetaList])

  const filteredAssigneeOptions = React.useMemo(() => {
    const normalizedSearch = assigneeSearch.trim().toLowerCase()
    return assigneeMetaList.filter((option) => {
      const matchesSearch = !normalizedSearch || option.searchText.includes(normalizedSearch)
      const matchesDepartment =
        assigneeDepartmentFilters.length === 0 ||
        (option.departmentName ? assigneeDepartmentFilters.includes(option.departmentName) : false)
      const matchesRole =
        assigneeRoleFilters.length === 0 ||
        (option.roleLabel ? assigneeRoleFilters.includes(option.roleLabel) : false)
      const matchesPriority = !priorityRoleFilterActive
        ? true
        : option.roleLabel === "Header" || option.roleLabel === "Project Owner"
      return matchesSearch && matchesDepartment && matchesRole && matchesPriority
    })
  }, [
    assigneeDepartmentFilters,
    assigneeMetaList,
    assigneeRoleFilters,
    priorityRoleFilterActive,
    assigneeSearch,
  ])

  React.useEffect(() => {
    setTitle(initialValues.title ?? "")
    setDetail(initialValues.detail ?? "")
    setAssigneeIds(initialValues.assigneeIds.length > 0 ? [...initialValues.assigneeIds] : [])
    const parts = getDeadlineParts(initialValues.deadline)
    setDeadline(parts.parsed)
    setDeadlineDateText(parts.dateText)
    setDeadlineTimeText(parts.timeText)
    setCalendarMonth(parts.parsed ?? new Date())
    setStatus(initialValues.status)
  }, [assigneeOptions, initialValues])

  React.useEffect(() => {
    if (!assigneePickerOpen) {
      setAssigneeSearch("")
    }
  }, [assigneePickerOpen])

  React.useEffect(() => {
    setAssigneeDepartmentFilters((prev) =>
      prev.filter((dept) => availableDepartmentFilters.includes(dept))
    )
  }, [availableDepartmentFilters])

  React.useEffect(() => {
    setAssigneeRoleFilters((prev) => prev.filter((role) => availableRoleFilters.includes(role)))
    if (!availableRoleFilters.some((role) => role === "Header" || role === "Project Owner")) {
      setPriorityRoleFilterActive(false)
    }
  }, [availableRoleFilters])

  const handleSelectAssignee = React.useCallback((memberId: string) => {
    setAssigneeIds((prev) => {
      if (prev.includes(memberId)) {
        return prev
      }
      return [...prev, memberId]
    })
  }, [])

  const toggleDepartmentFilter = (name: string) => {
    setAssigneeDepartmentFilters((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    )
  }

  const toggleRoleFilter = (role: string) => {
    setAssigneeRoleFilters((prev) =>
      prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role]
    )
  }

  const resetAssigneeFilters = () => {
    setAssigneeDepartmentFilters([])
    setAssigneeRoleFilters([])
    setPriorityRoleFilterActive(false)
  }

  const handleRemoveAssignee = (value: string) => {
    setAssigneeIds((prev) => prev.filter((item) => item !== value))
  }

  const handleAssigneeDragStart = (
    event: React.DragEvent<HTMLSpanElement>,
    index: number
  ) => {
    draggedAssigneeIndexRef.current = index
    setDraggingIndex(index)
    event.dataTransfer?.setData("text/plain", String(index))
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move"
    }
  }

  const handleAssigneeDragOver = (
    event: React.DragEvent<HTMLSpanElement>,
    index: number
  ) => {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move"
    }
    if (draggedAssigneeIndexRef.current === index) {
      if (dragOverIndex !== null) {
        setDragOverIndex(null)
      }
      return
    }
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleAssigneeDrop = (
    event: React.DragEvent<HTMLSpanElement>,
    index: number
  ) => {
    event.preventDefault()
    const fromIndex = draggedAssigneeIndexRef.current
    if (fromIndex === null || fromIndex === index) {
      setDragOverIndex(null)
      setDraggingIndex(null)
      draggedAssigneeIndexRef.current = null
      return
    }

    setAssigneeIds((prev) => {
      if (
        fromIndex < 0 ||
        fromIndex >= prev.length ||
        index < 0 ||
        index >= prev.length
      ) {
        return prev
      }
      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(index, 0, moved)
      return updated
    })

    setDragOverIndex(null)
    setDraggingIndex(null)
    draggedAssigneeIndexRef.current = null
  }
  const handleCalendarSelect = (date?: Date | null) => {
    if (!date) {
      setDeadline(null)
      setDeadlineDateText("")
      setDeadlineTimeText("")
      return
    }
    const next = new Date(date)
    const existingTime = parseTime(deadlineTimeText)
    if (existingTime) {
      next.setHours(existingTime.hours, existingTime.minutes, 0, 0)
    } else {
      next.setHours(0, 0, 0, 0)
    }
    setDeadline(next)
    setCalendarMonth(next)
    setDeadlineDateText(format(next, "dd/MM/yyyy"))
    if (existingTime) {
      setDeadlineTimeText(format(next, "HH:mm"))
    }
  }

  const handleDeadlineTimeChange = (value: string) => {
    if (!deadlineDateText.trim()) {
      setDeadlineTimeText(value)
      setDeadline(null)
      return
    }
    if (!value) {
      setDeadlineTimeText("")
      const parsedDateOnly = parseDeadline(deadlineDateText)
      if (parsedDateOnly) {
        parsedDateOnly.setHours(0, 0, 0, 0)
        setDeadline(parsedDateOnly)
        setCalendarMonth(parsedDateOnly)
        setDeadlineDateText(format(parsedDateOnly, "dd/MM/yyyy"))
      } else {
        setDeadline(null)
      }
      return
    }
    const parsed = parseDeadline(composeDeadlineInput(deadlineDateText, value))
    if (parsed) {
      setDeadline(parsed)
      setCalendarMonth(parsed)
      setDeadlineDateText(format(parsed, "dd/MM/yyyy"))
      setDeadlineTimeText(format(parsed, "HH:mm"))
    } else {
      setDeadline(null)
      setDeadlineTimeText(value)
    }
  }

  const handleAssigneeDragEnd = () => {
    setDragOverIndex(null)
    setDraggingIndex(null)
    draggedAssigneeIndexRef.current = null
  }

  const assigneeChipBaseClass =
    "flex items-center gap-2 rounded-full border-2 font-semibold select-none cursor-grab active:cursor-grabbing transition-colors"
  const assigneeChipStyles: Record<DepartmentLayoutOption, string> = {
    compact: `${assigneeChipBaseClass} px-5 py-2 text-sm`,
    fullWidth: `${assigneeChipBaseClass} h-14 w-full justify-between pl-12 pr-4 text-base`,
  }
  const assigneeChipClass = assigneeChipStyles[assigneeLayout]
  const chipActionButtonClass =
    "grid size-6 place-items-center rounded-full bg-white/30 text-current transition hover:bg-white/40 disabled:opacity-40 disabled:hover:bg-white/30"
  const assigneeContainerClass =
    assigneeLayout === "fullWidth"
      ? "mt-3 flex flex-col gap-3"
      : "mt-3 flex flex-wrap gap-3"

  const [infoPopoverId, setInfoPopoverId] = React.useState<string | null>(null)
  const closeInfoPopover = () => setInfoPopoverId(null)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedAssignees = assigneeIds.filter(
      (item, index, array) => item && array.indexOf(item) === index
    )
    const deadlineValue = deadline
      ? (() => {
          const formattedDate = format(deadline, "dd/MM/yyyy")
          const hasTime = Boolean(deadlineTimeText.trim())
          const formattedTime = hasTime ? format(deadline, "HH:mm") : ""
          return [formattedDate, formattedTime].filter(Boolean).join(" ")
        })()
      : [deadlineDateText.trim(), deadlineTimeText.trim()].filter(Boolean).join(" ")
    onSubmit({
      title: title.trim(),
      detail: detail.trim(),
      assigneeIds: normalizedAssignees,
      deadline: deadlineValue,
      status,
    })
  }

  const formattedDeadlineLabel = deadline
    ? format(deadline, "EEE, dd MMM yyyy")
    : "No deadline set"

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.95fr)] lg:gap-16">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-7 rounded-[3.5rem] border-2 border-primary/30 bg-card-project px-[clamp(2.5rem,4vw,3.75rem)] pb-12 pt-8 shadow-[0_2px_6px_rgba(0,0,0,0.12)]"
      >
        <h1 className="text-3xl font-bold text-[#2F2766]">
          {heading}
        </h1>

        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Task Title"
          aria-label="Task Title"
          className="h-12 rounded-full border-2 border-primary/40 bg-white px-5 text-base font-semibold text-[#2F2766] placeholder:text-[#2F2766]/70 focus:border-primary focus:outline-none"
          required
        />

        <div className="group/textarea overflow-hidden rounded-[1.25rem] border-2 border-primary/40 bg-white/80 transition-[box-shadow,border-color] focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(0,0,0,0.25)]">
          <Textarea
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            placeholder="Add detail"
            aria-label="Task detail"
            className="project-detail-scroll min-h-[10rem] w-full resize-y rounded-[inherit] border-none bg-transparent px-6 py-2 text-base text-[#2F2766] placeholder:text-primary/60 shadow-none focus-visible:outline-none focus-visible:ring-0"
          />
        </div>

        <div className="space-y-4 text-[#2F2766]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold w-27 mt-3">Assigned To :</span>
            </div>
            <Popover
              open={assigneePickerOpen && assigneeOptions.length > 0}
              onOpenChange={(open) => {
                if (assigneeOptions.length === 0) {
                  setAssigneePickerOpen(false)
                  return
                }
                setAssigneePickerOpen(open)
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={assigneeOptions.length === 0}
                  className="flex w-full max-w-sm items-center justify-between rounded-full border-2 border-primary/40 bg-white px-6 py-3 text-base font-semibold text-primary shadow-[0_3px_0_rgba(144,122,214,0.2)] transition hover:border-primary hover:bg-primary hover:text-white focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-2">
                    <Plus className="size-5" />
                    Add Member
                  </span>
                  <ChevronRight className="size-4" />
                </button>
              </PopoverTrigger>
              {assigneeOptions.length > 0 ? (
                <PopoverContent
                  align="start"
                  side="right"
                  sideOffset={8}
                  className="w-[22rem] rounded-3xl border border-primary/40 bg-white px-4 py-4 text-sm font-semibold text-[#2F2766] shadow-[0_16px_30px_rgba(39,36,66,0.15)]"
                >
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-primary/50" />
                      <Input
                        value={assigneeSearch}
                        onChange={(event) => setAssigneeSearch(event.target.value)}
                        placeholder="Search member"
                        className="h-11 w-full rounded-full border-2 border-primary/30 bg-white pl-10 pr-4 text-sm font-medium text-[#2F2766] placeholder:text-primary/60 focus:border-primary focus:outline-none"
                      />
                    </div>
                    {availableDepartmentFilters.length > 0 || availableRoleFilters.length > 0 ? (
                      <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-primary/60">
                        {availableDepartmentFilters.length > 0 ? (
                          <div>
                            <p className="text-[0.65rem]">Departments</p>
                            <div className="mt-2 flex flex-wrap gap-2 normal-case text-[0.7rem] font-semibold">
                              {availableDepartmentFilters.map((dept) => {
                                const active = assigneeDepartmentFilters.includes(dept)
                                return (
                              <button
                                type="button"
                                key={dept}
                                onClick={() => toggleDepartmentFilter(dept)}
                                className={cn(
                                  "rounded-full border px-3 py-1 text-xs transition focus:outline-none",
                                  active
                                    ? "border-primary bg-primary text-white"
                                    : "border-primary/30 bg-white text-primary hover:border-primary"
                                )}
                              >
                                <span className="block max-w-[7rem] truncate text-left">
                                  {dept}
                                </span>
                              </button>
                                )
                              })}
                            </div>
                          </div>
                        ) : null}
                        {availableRoleFilters.length > 0 ? (
                          <div className="pt-1">
                            <p className="text-[0.65rem]">Roles</p>
                            <div className="mt-2 flex flex-wrap gap-2 normal-case text-[0.7rem] font-semibold">
                              {availableRoleFilters.map((role) => {
                                const active = assigneeRoleFilters.includes(role)
                                return (
                                  <button
                                    type="button"
                                    key={role}
                                    onClick={() => toggleRoleFilter(role)}
                                    className={cn(
                                      "rounded-full border px-3 py-1 text-xs transition focus:outline-none",
                                      active
                                        ? "border-primary bg-primary text-white"
                                        : "border-primary/30 bg-white text-primary hover:border-primary"
                                    )}
                                  >
                                    {role}
                                  </button>
                                )
                              })}
                              <button
                                type="button"
                                onClick={() => setPriorityRoleFilterActive((prev) => !prev)}
                                className={cn(
                                  "rounded-full border px-3 py-1 text-xs transition focus:outline-none",
                                  priorityRoleFilterActive
                                    ? "border-primary bg-primary text-white"
                                    : "border-primary/30 bg-white text-primary hover:border-primary"
                                )}
                              >
                                Header (Project Owner)
                              </button>
                            </div>
                          </div>
                        ) : null}
                        {assigneeDepartmentFilters.length > 0 || assigneeRoleFilters.length > 0 ? (
                          <button
                            type="button"
                            onClick={resetAssigneeFilters}
                            className="text-[0.65rem] font-semibold uppercase tracking-wide text-primary hover:text-primary/80"
                          >
                            Reset filters
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="asap-scroll [scrollbar-gutter:stable] max-h-64 space-y-1 overflow-y-auto pr-1">
                      {filteredAssigneeOptions.length > 0 ? (
                        filteredAssigneeOptions.map((option) => {
                          const isSelected = assigneeIds.includes(option.id)
                          return (
                            <button
                              type="button"
                              key={option.id}
                              onClick={() =>
                                isSelected
                                  ? handleRemoveAssignee(option.id)
                                  : handleSelectAssignee(option.id)
                              }
                              className={cn(
                                "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition",
                                isSelected
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-transparent bg-white hover:border-primary/30 hover:bg-primary/5"
                              )}
                            >
                              <span className="flex flex-col">
                                <span className="flex items-center gap-2">
                                  <span
                                    className="size-3 rounded-full border border-black/10"
                                    style={{ backgroundColor: option.chipBackground }}
                                  />
                                  <span>{option.displayLabel}</span>
                                </span>
                                {option.departmentName ? (
                                  <span className="pl-5 text-xs font-medium text-primary/70">
                                    {option.departmentName}
                                  </span>
                                ) : null}
                              </span>
                              {isSelected ? <Check className="size-4 shrink-0" /> : null}
                            </button>
                          )
                        })
                      ) : (
                        <div className="rounded-2xl border border-dashed border-primary/30 px-4 py-6 text-center text-sm font-medium text-primary/60">
                          {assigneeOptions.length === 0
                            ? "No members available"
                            : "No members match your search"}
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              ) : null}
            </Popover>
            {assigneeOptions.length === 0 ? (
              <p className="text-sm font-medium text-destructive/80">
                No project members can be assigned yet.
              </p>
            ) : null}
          </div>
          <div className={assigneeContainerClass}>
            {assigneeIds.length > 0 ? (
              assigneeIds.map((item, index) => {
                const meta = assigneeMetaLookup[item]
                const isDragOver = dragOverIndex === index
                const isDragging = draggingIndex === index
                const chipClassName = [
                  assigneeChipClass,
                  "shadow-[0_4px_0_rgba(144,122,214,0.2)]",
                  isDragOver ? "ring-2 ring-primary/40" : "",
                  isDragging ? "cursor-grabbing opacity-80" : "",
                ]
                  .filter(Boolean)
                  .join(" ")
                const chipStyle = meta
                  ? {
                      backgroundColor: meta.chipBackground,
                      color: meta.chipTextColor,
                      borderColor: meta.chipBorderColor,
                    }
                  : undefined

                return (
                  <span
                    key={item}
                    className={chipClassName}
                    style={chipStyle}
                    draggable
                    aria-grabbed={isDragging}
                    onDragStart={(event) => handleAssigneeDragStart(event, index)}
                    onDragOver={(event) => handleAssigneeDragOver(event, index)}
                    onDrop={(event) => handleAssigneeDrop(event, index)}
                    onDragEnd={handleAssigneeDragEnd}
                  >
                <span className="inline-flex items-center gap-2">
                  <GripVertical
                    className={cn(
                      "size-4 text-current",
                      assigneeLayout === "fullWidth" ? "" : "opacity-70"
                    )}
                    aria-hidden
                  />
                    <span className="max-w-[12rem] truncate">{meta?.displayLabel ?? "Unknown member"}</span>
                  </span>
                    <div className="flex items-center gap-2">
                      <Popover
                        open={infoPopoverId === item}
                        onOpenChange={(open) => setInfoPopoverId(open ? item : null)}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            onClick={(event) => event.stopPropagation()}
                            className="grid size-6 place-items-center rounded-full bg-primary/10 text-primary transition hover:bg-primary/20 focus:outline-none"
                          >
                            <Info className="size-4" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          sideOffset={8}
                          className="w-52 rounded-3xl border border-primary/40 bg-white p-4 text-sm text-[#2F2766] shadow-[0_16px_30px_rgba(39,36,66,0.15)]"
                        >
                          <div className="flex items-center justify-between gap-2 pb-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-primary/60">
                              Member details
                            </span>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                closeInfoPopover()
                              }}
                              className="rounded-full p-1 text-primary/60 transition hover:text-primary hover:bg-primary/5 focus:outline-none"
                              aria-label="Close info"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                          <div className="space-y-1 text-xs text-[#2F2766]">
                            <p className="text-sm font-semibold text-[#2F2766]">
                              {meta?.username ?? meta?.label ?? "Unknown member"}
                            </p>
                            <p className="text-[0.7rem] text-primary/70">
                              Role: {meta?.roleLabel ?? meta?.role ?? "Member"}
                            </p>
                            {meta?.departmentName ? (
                              <p className="text-[0.7rem] text-primary/70">
                                Department: {meta.departmentName}
                              </p>
                            ) : null}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleRemoveAssignee(item)
                        }}
                        className={`${chipActionButtonClass} rounded-full`}
                        aria-label={`Remove ${meta?.displayLabel ?? "member"}`}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </span>
                )
              })
            ) : (
              <div className="min-h-[4rem] rounded-3xl border-2 border-dashed border-primary/30 bg-white/60 px-5 py-4 text-sm font-medium text-primary/70">
                No members assigned yet.
              </div>
            )}
          </div>
        </div>

        {showStatus ? (
          <div className="space-y-4 text-[#2F2766]">
            <span className="text-lg font-semibold">Task Status :</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 flex h-12 w-full items-center justify-between rounded-full border-2 border-primary/40 bg-white pl-12 pr-6 has-[>svg]:pl-6 has-[>svg]:pr-6 text-base font-semibold text-[#2F2766] shadow-[0_6px_0_rgba(144,122,214,0.2)] transition hover:bg-white focus-visible:border-primary focus-visible:outline-none"
                >
                  <span>{TASK_STATUS_LABEL[status]}</span>
                  <ChevronDown className="size-4 text-primary" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-52 rounded-3xl border border-primary/40 bg-white px-2 py-2 text-sm font-semibold text-[#2F2766] shadow-[0_10px_30px_rgba(72,68,110,0.2)]"
              >
                {Object.entries(TASK_STATUS_LABEL).map(([value, label]) => {
                  const isActive = value === status
                  return (
                    <DropdownMenuItem
                      key={value}
                      onSelect={() => setStatus(value as TaskStatus)}
                      className="flex items-center justify-between rounded-2xl pl-5 pr-3 py-2 focus:bg-primary/10 focus:text-primary"
                    >
                      <span>{label}</span>
                      {isActive ? <Check className="size-4 text-primary" /> : null}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={submitting}
            className="inline-flex h-12 items-center rounded-full bg-[#3F3478] px-8 text-base font-semibold text-white shadow-[0_6px_0_rgba(63,52,120,0.3)] transition hover:bg-[#2F2766] disabled:opacity-70"
          >
            {submitLabel}
          </Button>
        </div>
      </form>

      <aside className="flex w-full flex-col gap-6 pr-6 md:pr-10">
        <div className="flex w-full max-w-sm flex-col gap-4 rounded-[3rem] border-2 border-primary/40 bg-white/90 px-6 py-6 shadow-[0_20px_0_rgba(144,122,214,0.2)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Deadline</p>
              <p className="text-lg font-semibold text-[#2F2766]">{formattedDeadlineLabel}</p>
            </div>
            <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-primary/60">
              Future dates only
            </span>
          </div>
          <Calendar
            mode="single"
            selected={deadline ?? undefined}
            month={calendarMonth}
            onSelect={handleCalendarSelect}
            onMonthChange={setCalendarMonth}
            captionLayout="dropdown"
            fromYear={2000}
            toYear={2100}
            fixedWeeks
            initialFocus
            disablePast
          />
        </div>
        <div className="flex w-full max-w-sm flex-col gap-2 rounded-[3rem] border-2 border-primary/40 bg-white/90 px-6 py-4 shadow-[0_20px_0_rgba(144,122,214,0.2)]">
          <label className="text-xs font-semibold uppercase tracking-wide text-primary/60" htmlFor="deadline-time-input">
            Time
          </label>
          <Input
            id="deadline-time-input"
            type="time"
            step={60}
            value={deadlineTimeText}
            onChange={(event) => handleDeadlineTimeChange(event.target.value)}
            className="h-12 rounded-full border-2 border-primary/40 bg-white px-4 text-sm font-semibold text-[#2F2766] placeholder:text-primary/60 focus:border-primary focus:outline-none"
          />
          <p className="text-[0.7rem] text-primary/70">
            Leave blank for midnight. Time can be updated any time.
          </p>
        </div>
      </aside>
    </div>
  )
}

export type { TaskFormValues, TaskAssigneeOption }
