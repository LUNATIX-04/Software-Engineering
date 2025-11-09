"use client"

import * as React from "react"
import {
  addMonths,
  differenceInCalendarDays,
  format,
  startOfDay,
} from "date-fns"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DEFAULT_TASK_CARD_COLOR } from "@/constants/task-colors"
import { cn } from "@/lib/utils"
import { TASK_STATUS_LABEL, type TaskRecord } from "../task/data"

type ProjectCalendarPageProps = {
  params: Promise<{
    projectId: string
  }>
}

type CalendarCell = {
  date: Date
  inCurrentMonth: boolean
  key: string
  tasks: TaskRecord[]
}

const WEEKDAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

function resolveTaskDate(task: TaskRecord) {
  const source = task.dueDate ?? task.startDate ?? task.createdAt ?? task.updatedAt
  if (!source) {
    return null
  }
  const parsed = new Date(source)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function groupTasksByDay(tasks: TaskRecord[]) {
  const map = new Map<string, TaskRecord[]>()
  tasks.forEach((task) => {
    const eventDate = resolveTaskDate(task)
    if (!eventDate) {
      return
    }
    const key = format(eventDate, "yyyy-MM-dd")
    if (!map.has(key)) {
      map.set(key, [])
    }
    map.get(key)?.push(task)
  })
  map.forEach((list) => {
    list.sort((a, b) => {
      const dateA = resolveTaskDate(a)?.getTime() ?? 0
      const dateB = resolveTaskDate(b)?.getTime() ?? 0
      if (dateA !== dateB) return dateA - dateB
      return a.title.localeCompare(b.title)
    })
  })
  return map
}

function buildCalendar(referenceDate: Date, tasks: TaskRecord[]): CalendarCell[] {
  const firstOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
  const firstWeekday = firstOfMonth.getDay()
  const totalDaysInMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0).getDate()
  const totalCells = Math.ceil((firstWeekday + totalDaysInMonth) / 7) * 7
  const taskMap = groupTasksByDay(tasks)

  const cells: CalendarCell[] = []
  for (let index = 0; index < totalCells; index += 1) {
    const dayNumber = index - firstWeekday + 1
    const cellDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), dayNumber)
    const inCurrentMonth = dayNumber >= 1 && dayNumber <= totalDaysInMonth
    const key = format(cellDate, "yyyy-MM-dd")
    cells.push({
      date: cellDate,
      inCurrentMonth,
      key,
      tasks: taskMap.get(key) ?? [],
    })
  }
  return cells
}

function chunkIntoWeeks(cells: CalendarCell[]) {
  const weeks: CalendarCell[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
}

function normalizeDateValue(value: string | null) {
  if (!value) {
    return null
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return startOfDay(date)
}

type MultiDaySpan = {
  task: TaskRecord
  start: Date
  end: Date
}

function buildWeekSpans(weekStart: Date, weekEnd: Date, spans: MultiDaySpan[]) {
  return spans
    .map((span) => {
      if (span.end < weekStart || span.start > weekEnd) {
        return null
      }
      const boundedStart = span.start < weekStart ? weekStart : span.start
      const boundedEnd = span.end > weekEnd ? weekEnd : span.end
      const colStart = Math.max(0, differenceInCalendarDays(boundedStart, weekStart))
      const colEnd = Math.max(colStart, differenceInCalendarDays(boundedEnd, weekStart))
      return {
        task: span.task,
        colStart,
        length: colEnd - colStart + 1,
      }
    })
    .filter((value): value is { task: TaskRecord; colStart: number; length: number } => Boolean(value))
}

export default function ProjectCalendarPage({ params }: ProjectCalendarPageProps) {
  const { projectId } = React.use(params)
  const router = useRouter()

  const [tasks, setTasks] = React.useState<TaskRecord[]>([])
  const [taskLoading, setTaskLoading] = React.useState(true)
  const [taskError, setTaskError] = React.useState<string | null>(null)
  const [referenceDate, setReferenceDate] = React.useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const loadTasks = React.useCallback(async () => {
    try {
      setTaskError(null)
      setTaskLoading(true)
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        cache: "no-store",
      })
      if (!response.ok) {
        throw new Error(response.status === 404 ? "Tasks not found" : "Unable to load tasks")
      }
      const data = (await response.json()) as TaskRecord[]
      setTasks(data)
    } catch (error) {
      console.error(error)
      setTaskError(error instanceof Error ? error.message : "Unable to load tasks")
    } finally {
      setTaskLoading(false)
    }
  }, [projectId])

  React.useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const multiDaySpans = React.useMemo(() => {
    return tasks
      .map((task) => {
        const startNormalized = normalizeDateValue(task.startDate)
        const endNormalized = normalizeDateValue(task.dueDate)
        if (!startNormalized || !endNormalized) {
          return null
        }
        const [start, end] =
          startNormalized <= endNormalized
            ? [startNormalized, endNormalized]
            : [endNormalized, startNormalized]
        if (differenceInCalendarDays(end, start) < 1) {
          return null
        }
        return { task, start, end }
      })
      .filter((value): value is MultiDaySpan => Boolean(value))
  }, [tasks])

  const multiDayTaskIds = React.useMemo(() => new Set(multiDaySpans.map((span) => span.task.id)), [multiDaySpans])

  const singleDayTasks = React.useMemo(
    () => tasks.filter((task) => !multiDayTaskIds.has(task.id)),
    [multiDayTaskIds, tasks]
  )

  const calendarCells = React.useMemo(() => buildCalendar(referenceDate, singleDayTasks), [referenceDate, singleDayTasks])
  const weeks = React.useMemo(() => chunkIntoWeeks(calendarCells), [calendarCells])
  const todayKey = React.useMemo(() => format(new Date(), "yyyy-MM-dd"), [])

  const navigateToCreate = React.useCallback(
    (date: Date | null) => {
      const searchParams = new URLSearchParams()
      if (date) {
        searchParams.set("date", date.toISOString())
      }
      const query = searchParams.toString()
      router.push(
        `/projects/${projectId}/task/create${query ? `?${query}` : ""}`
      )
    },
    [projectId, router]
  )

  const navigateToEdit = React.useCallback(
    (taskId: string) => {
      router.push(`/projects/${projectId}/task/${taskId}/edit`)
    },
    [projectId, router]
  )

  const handleBackClick = React.useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
      return
    }
    router.push(`/projects/${projectId}/task`)
  }, [projectId, router])

  return (
    <div className="asap-scroll w-full min-h-[calc(100vh-6.5rem)] px-[clamp(3.25rem,4vw,3.25rem)] pt-3">
      <div className="flex w-full max-w-7xl flex-col items-start gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="sticky top-1 z-10 -ml-3 flex flex-shrink-0 items-start justify-start">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBackClick}
            className="inline-flex size-12 items-center justify-center rounded-full border border-primary/20 bg-white text-primary shadow-sm transition hover:border-primary/40 hover:bg-primary/10 focus-visible:border-primary focus-visible:ring-0"
            aria-label="Back to tasks"
          >
            <ArrowLeft className="size-6" aria-hidden="true" />
          </Button>
        </div>
        <div className="mx-auto mb-12 mt-6 flex w-full max-w-6xl flex-1 flex-col gap-6 px-[clamp(1.25rem,3vw,3.5rem)]">
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border-2 border-primary/30 bg-white px-6 py-4 shadow-[0_10px_0_rgba(144,122,214,0.12)]">
            <div className="flex items-center gap-3 rounded-full border border-primary/30 bg-[#F6F0FF] px-5 py-2 text-lg font-semibold text-[#2F2766] shadow-[0_6px_0_rgba(144,122,214,0.25)]">
              <button
                type="button"
                className="rounded-full p-2 transition hover:bg-white"
                onClick={() => setReferenceDate((prev) => addMonths(prev, -1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="size-5" />
              </button>
              <div className="flex flex-col items-center">
                <span className="text-xl font-bold">{format(referenceDate, "MMMM yyyy")}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-primary/70">
                  Month View
                </span>
              </div>
              <button
                type="button"
                className="rounded-full p-2 transition hover:bg-white"
                onClick={() => setReferenceDate((prev) => addMonths(prev, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-primary/40 bg-white px-5 text-primary shadow-[0_6px_0_rgba(144,122,214,0.2)]"
                onClick={() => setReferenceDate(new Date())}
              >
                <RefreshCw className="mr-2 size-4" />
                Today
              </Button>
              <Button
                type="button"
                className="rounded-full bg-primary px-6 py-5 text-base font-semibold text-primary-foreground shadow-[0_10px_0_rgba(79,61,152,0.25)] transition hover:bg-primary/90"
                onClick={() =>
                  navigateToCreate(
                    new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
                  )
                }
              >
                <Plus className="mr-2 size-5" />
                Add Task
              </Button>
            </div>
          </header>

          {taskError ? (
            <div className="rounded-[2rem] border border-red-500/40 bg-red-500/10 px-6 py-4 text-sm font-semibold text-red-200 shadow-[0_10px_30px_rgba(255,0,0,0.15)]">
              {taskError}
            </div>
          ) : null}

          <section className="flex flex-1 flex-col rounded-[3.5rem] border-2 border-primary/40 bg-white px-4 py-6 text-[#2F2766] shadow-[0_20px_0_rgba(144,122,214,0.12)]">
            <div className="grid grid-cols-7 gap-3 px-2 pb-4">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="text-center text-xs font-semibold uppercase tracking-wide text-[#2F2766]/70"
                >
                  {label}
                </div>
              ))}
            </div>

            {taskLoading ? (
              <div className="flex flex-1 items-center justify-center rounded-[2rem] border border-primary/30 bg-primary/5 text-primary">
                Loading calendar…
              </div>
            ) : (
              <div className="flex flex-1 flex-col gap-6">
                {weeks.map((weekCells, weekIndex) => {
                  const weekStart = weekCells[0]?.date
                  const weekEnd = weekCells[weekCells.length - 1]?.date
                  if (!weekStart || !weekEnd) {
                    return null
                  }
                  const weekSpans = buildWeekSpans(weekStart, weekEnd, multiDaySpans).sort(
                    (a, b) => a.colStart - b.colStart
                  )
                  return (
                    <div key={`week-${weekIndex}`} className="space-y-3">
                      {weekSpans.length > 0 ? (
                        <div className="space-y-2">
                          {weekSpans.map((span) => (
                            <div key={`${span.task.id}-${span.colStart}`} className="grid grid-cols-7 gap-3">
                              <button
                                type="button"
                                onClick={() => navigateToEdit(span.task.id)}
                                style={{
                                  gridColumnStart: span.colStart + 1,
                                  gridColumnEnd: span.colStart + span.length + 1,
                                  backgroundColor: span.task.cardColor ?? DEFAULT_TASK_CARD_COLOR,
                                  color: span.task.cardTextColor ?? "#2F2766",
                                  borderColor: span.task.cardColor ?? DEFAULT_TASK_CARD_COLOR,
                                }}
                                className="flex items-center justify-between rounded-full border px-4 py-2 text-left text-sm font-semibold shadow-[0_6px_0_rgba(144,122,214,0.2)] transition hover:shadow-[0_8px_0_rgba(144,122,214,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                              >
                                <span className="truncate text-sm">{span.task.title}</span>
                                <span className="ml-4 text-xs font-medium opacity-80">
                                  {span.task.startDate && span.task.dueDate
                                    ? `${format(new Date(span.task.startDate), "dd MMM")} – ${format(
                                        new Date(span.task.dueDate),
                                        "dd MMM"
                                      )}`
                                    : span.task.dueDate
                                      ? format(new Date(span.task.dueDate), "dd MMM")
                                      : ""}
                                </span>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div className="grid grid-cols-7 gap-3">
                        {weekCells.map((cell) => {
                          const isToday = cell.key === todayKey
                          const dayTasks = cell.tasks.filter((task) => !multiDayTaskIds.has(task.id))
                          const hasTasks = dayTasks.length > 0
                          const displayDate = cell.date.getDate()
                          const dayLabelBase = cn(
                            "inline-flex size-8 items-center justify-center rounded-full text-sm font-semibold transition",
                            isToday
                              ? "bg-primary text-white shadow-[0_4px_12px_rgba(144,122,214,0.4)]"
                              : "text-[#2F2766]"
                          )
                          const dayLabelClass = cell.inCurrentMonth ? dayLabelBase : cn(dayLabelBase, "opacity-40")
                          const cellBorderClass = cell.inCurrentMonth ? "border-primary/30" : "border-primary/15 opacity-60"
                          return (
                            <div
                              key={cell.key}
                              className={cn(
                                "flex min-h-[10.5rem] flex-col rounded-[1.5rem] border bg-white/95 p-3 text-[#2F2766] shadow-[0_8px_0_rgba(144,122,214,0.15)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_0_rgba(144,122,214,0.2)]",
                                cellBorderClass
                              )}
                            >
                              <div className="flex items-center justify-between text-sm font-semibold text-[#2F2766]">
                                <span className={dayLabelClass}>{displayDate}</span>
                                <button
                                  type="button"
                                  className="rounded-full border border-primary/20 bg-white p-1.5 text-primary transition hover:border-primary/40 hover:bg-primary/10"
                                  onClick={() => navigateToCreate(cell.date)}
                                  aria-label={`Create task on ${format(cell.date, "dd MMM yyyy")}`}
                                >
                                  <Plus className="size-3.5" />
                                </button>
                              </div>

                              <div className="mt-3 flex-1 overflow-hidden">
                                <div className="flex max-h-[7.5rem] flex-col gap-2 overflow-y-auto pr-1">
                                  {dayTasks.slice(0, 3).map((task) => (
                                    <button
                                      type="button"
                                      key={task.id}
                                      onClick={() => navigateToEdit(task.id)}
                                      className="flex w-full items-center justify-between rounded-2xl border px-3 py-1.5 text-left text-xs font-semibold shadow-[0_4px_0_rgba(144,122,214,0.2)] transition hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                      style={{
                                        backgroundColor: task.cardColor ?? DEFAULT_TASK_CARD_COLOR,
                                        color: task.cardTextColor ?? "#2F2766",
                                        borderColor: task.cardColor ?? DEFAULT_TASK_CARD_COLOR,
                                      }}
                                    >
                                      <span className="block truncate text-sm">{task.title}</span>
                                      <span className="ml-3 text-[0.65rem] font-semibold opacity-85">
                                        {task.dueDate
                                          ? format(new Date(task.dueDate), "HH:mm")
                                          : TASK_STATUS_LABEL[task.status]}
                                      </span>
                                    </button>
                                  ))}
                                  {dayTasks.length > 3 ? (
                                    <button
                                      type="button"
                                      onClick={() => router.push(`/projects/${projectId}/task`)}
                                      className="w-full rounded-full border border-primary/20 bg-white px-3 py-1 text-center text-[0.7rem] font-semibold text-primary transition hover:border-primary/40"
                                    >
                                      +{dayTasks.length - 3} more
                                    </button>
                                  ) : null}
                                  {!hasTasks ? (
                                    <button
                                      type="button"
                                      onClick={() => navigateToCreate(cell.date)}
                                      className="mt-4 flex w-full flex-1 items-center justify-center rounded-2xl border border-dashed border-primary/25 bg-white/60 px-3 py-6 text-xs font-semibold text-primary/50 transition hover:border-primary hover:text-primary"
                                    >
                                      + Add Task
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </div>

    </div>
  )
}
