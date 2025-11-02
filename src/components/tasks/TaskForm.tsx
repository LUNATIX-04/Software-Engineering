"use client"

import * as React from "react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { TASK_STATUS_LABEL, type TaskStatus } from "@/app/projects/[projectId]/task/data"
import { Calendar as CalendarIcon, Check, ChevronDown, GripVertical, Plus, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"
import { usePreferences, type DepartmentLayoutOption } from "@/components/layout/AppShell"
import { useNotifications } from "@/components/notifications/Notification"
import { ERROR_MESSAGES } from "@/constants/error"

type TaskFormValues = {
  title: string
  detail: string
  assignees: string[]
  deadline: string
  status: TaskStatus
}

type TaskFormProps = {
  heading: string
  submitLabel: string
  initialValues: TaskFormValues
  onSubmit: (values: TaskFormValues) => Promise<void> | void
  submitting?: boolean
}

const DEADLINE_YEAR_MIN = 1900
const DEADLINE_YEAR_MAX = 2100

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
}: TaskFormProps) {
  const [title, setTitle] = React.useState(initialValues.title ?? "")
  const [detail, setDetail] = React.useState(initialValues.detail ?? "")
  const { profile } = usePreferences()
  const assigneeLayout: DepartmentLayoutOption = profile?.departmentLayout ?? "fullWidth"

  const [assignees, setAssignees] = React.useState<string[]>(
    initialValues.assignees.length > 0 ? [...initialValues.assignees] : []
  )
  const [assigneeInput, setAssigneeInput] = React.useState("")
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
  const [calendarOpen, setCalendarOpen] = React.useState(false)
  const { notify } = useNotifications()

  React.useEffect(() => {
    setTitle(initialValues.title ?? "")
    setDetail(initialValues.detail ?? "")
    setAssignees(initialValues.assignees.length > 0 ? [...initialValues.assignees] : [])
    setAssigneeInput("")
    const parts = getDeadlineParts(initialValues.deadline)
    setDeadline(parts.parsed)
    setDeadlineDateText(parts.dateText)
    setDeadlineTimeText(parts.timeText)
    setCalendarMonth(parts.parsed ?? new Date())
    setStatus(initialValues.status)
  }, [initialValues])

  const handleAddAssignee = () => {
    const trimmed = assigneeInput.trim()
    if (!trimmed) {
      const { title, description } = ERROR_MESSAGES.emptyAssignee
      notify({
        title,
        description,
        variant: "destructive",
      })
      return
    }
    setAssignees((prev) => {
      if (prev.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
        return prev
      }
      return [...prev, trimmed]
    })
    setAssigneeInput("")
  }

  const handleRemoveAssignee = (value: string) => {
    setAssignees((prev) => prev.filter((item) => item !== value))
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

    setAssignees((prev) => {
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

  const handleAssigneeDragEnd = () => {
    setDragOverIndex(null)
    setDraggingIndex(null)
    draggedAssigneeIndexRef.current = null
  }

  const assigneeChipBaseClass =
    "flex items-center gap-2 rounded-full border-2 border-primary/30 bg-white font-semibold text-[#2F2766] select-none cursor-grab active:cursor-grabbing transition-colors"
  const assigneeChipStyles: Record<DepartmentLayoutOption, string> = {
    compact: `${assigneeChipBaseClass} px-5 py-2 text-sm`,
    fullWidth: `${assigneeChipBaseClass} h-14 w-full justify-between pl-12 pr-4 text-base`,
  }
  const assigneeChipClass = assigneeChipStyles[assigneeLayout]
  const chipActionButtonClass =
    "grid size-6 place-items-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20 disabled:opacity-40 disabled:hover:bg-primary/10"
  const assigneeContainerClass =
    assigneeLayout === "fullWidth"
      ? "mt-3 flex flex-col gap-3"
      : "mt-3 flex flex-wrap gap-3"

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedAssignees = assignees
      .map((item) => item.trim())
      .filter((item, index, array) => item && array.indexOf(item) === index)
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
      assignees: normalizedAssignees,
      deadline: deadlineValue,
      status,
    })
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-7 rounded-[3.5rem] border-2 border-primary/40 bg-[#F3ECFF] px-[clamp(2.5rem,4vw,3.75rem)] pb-12 pt-5 shadow-[0_20px_0_rgba(144,122,214,0.18)]"
      >
        <h1 className="text-3xl font-bold text-[#2F2766]">
          {heading}
        </h1>

        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Task Title"
          aria-label="Task Title"
          className="h-12 rounded-full border-2 border-primary/40 bg-white px-5 text-base font-medium text-[#2F2766] shadow-[0_6px_0_rgba(144,122,214,0.2)] focus:border-primary focus:outline-none"
          required
        />

        <div className="group/textarea overflow-hidden rounded-[2rem] border-2 border-primary/40 bg-white/80 transition-[box-shadow,border-color] focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(0,0,0,0.12)]">
          <Textarea
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            placeholder="Add detail"
            aria-label="Task detail"
            className="min-h-[10rem] w-full resize-y rounded-[inherit] border-none bg-transparent px-6 py-3 text-base text-[#2F2766] placeholder:text-primary/60 shadow-none focus-visible:outline-none focus-visible:ring-0"
          />
        </div>

        <div className="space-y-4 text-[#2F2766]">
          <span className="text-lg font-semibold">Assigned To :</span>
          <div className={assigneeContainerClass}>
            {assignees.map((item, index) => {
              const isDragOver = dragOverIndex === index
              const isDragging = draggingIndex === index
              const chipClassName = [
                assigneeChipClass,
                "shadow-[0_4px_0_rgba(144,122,214,0.2)]",
                isDragOver ? "border-primary bg-primary/10" : "",
                isDragging ? "cursor-grabbing opacity-80" : "",
              ]
                .filter(Boolean)
                .join(" ")

              return (
                <span
                  key={item}
                  className={chipClassName}
                  draggable
                  aria-grabbed={isDragging}
                  onDragStart={(event) => handleAssigneeDragStart(event, index)}
                  onDragOver={(event) => handleAssigneeDragOver(event, index)}
                  onDrop={(event) => handleAssigneeDrop(event, index)}
                  onDragEnd={handleAssigneeDragEnd}
                >
                  <span className="inline-flex items-center gap-2">
                    <GripVertical
                      className={`size-4 ${assigneeLayout === "fullWidth" ? "text-primary" : "text-primary/60"}`}
                      aria-hidden
                    />
                    <span>{item}</span>
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleRemoveAssignee(item)
                    }}
                    className={`${chipActionButtonClass} ml-auto`}
                    aria-label={`Remove ${item}`}
                  >
                    <X className="size-4" />
                  </button>
                </span>
              )
            })}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={handleAddAssignee}
              aria-label="Add assignee"
              className="absolute left-5 top-1/2 -translate-y-1/2 text-primary/60 transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <Plus className="size-5" />
            </button>
            <Input
              value={assigneeInput}
              onChange={(event) => {
                setAssigneeInput(event.target.value)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  handleAddAssignee()
                }
              }}
              placeholder="Add"
              aria-label="Add assignee"
              className="h-14 rounded-[2rem] border-2 border-primary/40 bg-white/80 pl-12 pr-4 text-base font-medium text-[#2F2766] placeholder:text-primary/60 shadow-[0_6px_0_rgba(144,122,214,0.15)] focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-4 text-[#2F2766]">
          <span className="text-lg font-semibold">Deadline Date & Time :</span>
          <div className="relative mt-3 flex flex-wrap items-center gap-2 sm:flex-nowrap">
            <Input
              value={deadlineDateText}
              onChange={(event) => {
                const value = event.target.value
                const parsed = parseDeadline(composeDeadlineInput(value, deadlineTimeText))
                if (parsed) {
                  setDeadline(parsed)
                  setCalendarMonth(parsed)
                  setDeadlineDateText(format(parsed, "dd/MM/yyyy"))
                  if (deadlineTimeText.trim()) {
                    setDeadlineTimeText(format(parsed, "HH:mm"))
                  }
                } else {
                  setDeadline(null)
                  setDeadlineDateText(value)
                }
              }}
              onFocus={() => {
                setCalendarOpen(true)
                const parsed = parseDeadline(
                  composeDeadlineInput(deadlineDateText, deadlineTimeText)
                )
                setCalendarMonth(parsed ?? new Date())
              }}
              onBlur={() => {
                const parsed = parseDeadline(
                  composeDeadlineInput(deadlineDateText, deadlineTimeText)
                )
                if (parsed) {
                  setDeadline(parsed)
                  setCalendarMonth(parsed)
                  setDeadlineDateText(format(parsed, "dd/MM/yyyy"))
                  if (deadlineTimeText.trim()) {
                    setDeadlineTimeText(format(parsed, "HH:mm"))
                  }
                } else {
                  setDeadline(null)
                }
              }}
              placeholder="DD/MM/YYYY"
              aria-label="Deadline date"
              className="h-12 flex-1 rounded-full border-2 border-primary/40 bg-white px-5 text-base font-medium text-[#2F2766] placeholder:text-primary/60 shadow-[0_6px_0_rgba(144,122,214,0.2)] focus:border-primary focus:outline-none"
            />
            <Input
              type="time"
              step={60}
              value={deadlineTimeText}
              onChange={(event) => {
                const value = event.target.value
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
              }}
              onBlur={() => {
                if (!deadlineDateText.trim()) {
                  setDeadlineTimeText("")
                  return
                }
                const parsed = parseDeadline(
                  composeDeadlineInput(deadlineDateText, deadlineTimeText)
                )
                if (parsed) {
                  setDeadline(parsed)
                  setCalendarMonth(parsed)
                  setDeadlineDateText(format(parsed, "dd/MM/yyyy"))
                  setDeadlineTimeText(format(parsed, "HH:mm"))
                }
              }}
              placeholder="HH:MM"
              aria-label="Deadline time"
              className="h-12 w-[7.5rem] rounded-full border-2 border-primary/40 bg-white px-4 text-base font-medium text-[#2F2766] placeholder:text-primary/60 shadow-[0_6px_0_rgba(144,122,214,0.2)] focus:border-primary focus:outline-none"
            />
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="flex h-12 items-center justify-center rounded-full border-2 border-primary/40 bg-white px-4 shadow-[0_6px_0_rgba(144,122,214,0.2)] transition hover:bg-white"
                >
                  <CalendarIcon className="size-5 text-primary" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={8}
                className="w-auto rounded-[1.5rem] border border-primary/30 bg-white p-3 shadow-[0_10px_30px_rgba(72,68,110,0.2)]"
              >
                <Calendar
                  mode="single"
                  selected={deadline ?? undefined}
                  month={calendarMonth}
                  today={deadline ?? undefined}
                  onSelect={(date) => {
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
                    }
                    setDeadline(next)
                    setDeadlineDateText(format(next, "dd/MM/yyyy"))
                    if (existingTime) {
                      setDeadlineTimeText(format(next, "HH:mm"))
                    }
                    setCalendarMonth(next)
                    setCalendarOpen(false)
                  }}
                  onMonthChange={setCalendarMonth}
                  captionLayout="dropdown"
                  fromYear={2000}
                  toYear={2100}
                  fixedWeeks
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-4 text-[#2F2766]">
          <span className="text-lg font-semibold">Task Status :</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="mt-3 flex h-12 w-full items-center justify-between rounded-full border-2 border-primary/40 bg-white px-5 text-base font-semibold text-[#2F2766] shadow-[0_6px_0_rgba(144,122,214,0.2)] transition hover:bg-white focus-visible:border-primary focus-visible:outline-none"
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
                    className="flex items-center justify-between rounded-2xl px-3 py-2 focus:bg-primary/10 focus:text-primary"
                  >
                    <span>{label}</span>
                    {isActive ? <Check className="size-4 text-primary" /> : null}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

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

      <aside className="flex items-center justify-center">
        <div className="relative size-72 md:size-[22rem]">
          <Image
            src="/imageWeb/Homepage/logo.png"
            alt="ASAP logo"
            fill
            className="object-contain"
            priority
          />
        </div>
      </aside>
    </div>
  )
}

export type { TaskFormValues }
