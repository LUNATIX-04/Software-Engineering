"use client"

import * as React from "react"
import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Button } from "@/components/ui/button"
import { TASK_STATUS_LABEL, TASK_STATUS_STYLE, type TaskRecord } from "../task/data"

function parseTaskDeadline(dueDate: string | null): Date | null {
  if (!dueDate) {
    return null
  }
  const candidate = new Date(dueDate)
  return Number.isNaN(candidate.getTime()) ? null : candidate
}

type CalendarCell = {
  date: Date | null
  dayNumber: number | null
  tasks: TaskRecord[]
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const WEEKDAY_LABELS: { label: string; color: string }[] = [
  { label: "SUN", color: "#D94848" },
  { label: "MON", color: "#E0A106" },
  { label: "TUE", color: "#D463D2" },
  { label: "WED", color: "#2BB673" },
  { label: "THU", color: "#E9A31B" },
  { label: "FRI", color: "#2C89C8" },
  { label: "SAT", color: "#914ACB" },
]

type ProjectCalendarPageProps = {
  params: Promise<{
    projectId: string
  }>
}

export default function ProjectCalendarPage({ params }: ProjectCalendarPageProps) {
  const { projectId } = React.use(params)
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function loadTasks() {
      try {
        setError(null)
        setLoading(true)
        const response = await fetch(`/api/projects/${projectId}/tasks`, { cache: "no-store" })
        if (!response.ok) {
          throw new Error(response.status === 404 ? "Not found" : "Failed to load tasks")
        }
        const data = (await response.json()) as TaskRecord[]
        if (active) {
          setTasks(data)
        }
      } catch (err) {
        console.error(err)
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load tasks")
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadTasks()
    return () => {
      active = false
    }
  }, [projectId])

  const tasksWithDates = React.useMemo(
    () =>
      tasks.map((task, index) => {
        const parsed = parseTaskDeadline(task.dueDate)
        if (parsed) {
          return { task, date: parsed }
        }
        const fallback = new Date()
        fallback.setFullYear(fallback.getFullYear(), index % 12, Math.max(1, index + 1))
        return { task, date: fallback }
      }),
    [tasks]
  )

  const availableYears = React.useMemo(() => {
    const years = new Set<number>(tasksWithDates.map(({ date }) => date.getFullYear()))
    if (years.size === 0) {
      years.add(new Date().getFullYear())
    }
    return Array.from(years).sort((a, b) => a - b)
  }, [tasksWithDates])

  const initialReferenceDate = React.useMemo(() => {
    const maxYear = availableYears.length > 0 ? availableYears[availableYears.length - 1] : new Date().getFullYear()
    const taskInMaxYear = tasksWithDates.find(({ date }) => date.getFullYear() === maxYear)
    const month = taskInMaxYear ? taskInMaxYear.date.getMonth() : 0
    return new Date(maxYear, month, 1)
  }, [availableYears, tasksWithDates])

  const [referenceDate, setReferenceDate] = useState(() => initialReferenceDate)

  const firstDayOfMonth = useMemo(() => {
    const base = new Date(referenceDate)
    base.setDate(1)
    base.setHours(0, 0, 0, 0)
    return base
  }, [referenceDate])

  const daysInMonth = useMemo(() => {
    const base = new Date(referenceDate)
    base.setMonth(base.getMonth() + 1, 0)
    return base.getDate()
  }, [referenceDate])

  const leadingEmptyCells = useMemo(() => {
    return firstDayOfMonth.getDay()
  }, [firstDayOfMonth])

  const cells = useMemo<CalendarCell[]>(() => {
    const list: CalendarCell[] = []
    const tasksByDate = new Map<string, TaskRecord[]>()
    tasksWithDates.forEach(({ task, date }) => {
      const key = date.toISOString().split("T")[0]
      if (!tasksByDate.has(key)) {
        tasksByDate.set(key, [])
      }
      tasksByDate.get(key)?.push(task)
    })

    const baseYear = referenceDate.getFullYear()
    const baseMonth = referenceDate.getMonth()

    for (let i = 0; i < leadingEmptyCells; i += 1) {
      list.push({ date: null, dayNumber: null, tasks: [] })
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const cellDate = new Date(baseYear, baseMonth, day)
      const key = cellDate.toISOString().split("T")[0]
      list.push({
        date: cellDate,
        dayNumber: day,
        tasks: tasksByDate.get(key) ?? [],
      })
    }
    return list
  }, [daysInMonth, leadingEmptyCells, referenceDate, tasksWithDates])

  const monthLabel = `${MONTHS[referenceDate.getMonth()]}`

  const updateMonth = (offset: number) => {
    setReferenceDate((prev) => {
      const next = new Date(prev)
      next.setMonth(prev.getMonth() + offset)
      return next
    })
  }

  const handleBackClick = useCallback(() => {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back()
        return
      }
      router.push("/projects")
    }, [router])

  return (
    <div className="asap-scroll mx-auto overflow-y-scroll w-full px-[clamp(3.25rem,4vw,3.25rem)] pt-3">
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

        <div className="mx-auto mt-10 mb-10 flex w-full max-w-6xl flex-1 flex-col gap-8 px-[clamp(1.5rem,3vw,3.5rem)]">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 rounded-full border-2 border-primary/40 bg-[#EDE4FF] px-6 py-3 text-xl font-semibold text-[#2F2766] shadow-[0_8px_0_rgba(144,122,214,0.2)]">
              <button
                type="button"
                onClick={() => updateMonth(-1)}
                className="rounded-full p-2 transition hover:bg-white"
                aria-label="Previous month"
              >
                <ChevronLeft className="size-5" />
              </button>
              <div className="flex items-center gap-3">
                <span className="min-w-[8rem] text-center">{monthLabel}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-white px-4 py-2 text-base font-semibold text-[#2F2766] shadow-[0_4px_0_rgba(144,122,214,0.2)] focus:outline-none"
                    >
                      {referenceDate.getFullYear()}
                      <ChevronRight className="size-4 -rotate-90" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="max-h-60 w-32 overflow-y-auto rounded-3xl border border-primary/40 bg-white px-2 py-2 text-sm font-semibold text-[#2F2766] shadow-[0_10px_30px_rgba(72,68,110,0.2)]"
                  >
                    {availableYears.map((year) => (
                      <DropdownMenuItem
                        key={year}
                        onSelect={() =>
                          setReferenceDate((prev) => {
                            const next = new Date(prev)
                            next.setFullYear(year)
                            return next
                          })
                        }
                        className="rounded-2xl px-3 py-2 focus:bg-primary/10 focus:text-primary"
                      >
                        {year}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <button
                type="button"
                onClick={() => updateMonth(1)}
                className="rounded-full p-2 transition hover:bg-white"
                aria-label="Next month"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          </header>

          <section className="flex flex-1 flex-col rounded-[3.5rem] border-2 border-primary/40 bg-white/80 px-10 py-8 shadow-[0_18px_0_rgba(144,122,214,0.15)]">
            <div className="grid grid-cols-7 gap-4 px-2 pb-6">
              {WEEKDAY_LABELS.map((weekday) => (
                <div key={weekday.label} className="text-center text-sm font-bold" style={{ color: weekday.color }}>
                  {weekday.label}
                </div>
              ))}
            </div>

            <div className="grid flex-1 grid-cols-7 gap-4">
              {cells.map((cell, index) => (
                <div
                  key={index}
                  className="relative min-h-[7rem] rounded-[1.5rem] border-2 border-primary/30 bg-white/70 p-3 text-sm font-semibold text-[#2F2766] shadow-[0_6px_0_rgba(144,122,214,0.08)]"
                >
                  {cell.dayNumber ? <span>{cell.dayNumber}</span> : null}
                  {cell.tasks.length > 0 ? (
                    <div className="mt-3 flex flex-col gap-2">
                      {cell.tasks.map((task) => (
                        <div
                          key={task.id}
                          className={`flex flex-col rounded-full border-2 border-primary/30 px-3 py-1 text-xs font-semibold shadow-[0_4px_0_rgba(144,122,214,0.2)] ${TASK_STATUS_STYLE[task.status] ?? ""}`}
                        >
                          <span>{task.title}</span>
                          <span className="text-[0.65rem] font-medium opacity-80">
                            {TASK_STATUS_LABEL[task.status]}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
