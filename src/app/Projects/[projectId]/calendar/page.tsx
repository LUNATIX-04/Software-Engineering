"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DEFAULT_TASKS,
  TASK_STATUS_LABEL,
  TASK_STATUS_STYLE,
  type TaskRecord,
} from "../task/data"

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
  const [referenceDate, setReferenceDate] = useState(() => new Date())

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
    DEFAULT_TASKS.forEach((task) => {
      const dateKey = "2024-09-0" + Math.max(1, Math.min(9, DEFAULT_TASKS.indexOf(task) + 7))
      // Placeholder logic; real data should include ISO dates.
      if (!tasksByDate.has(dateKey)) {
        tasksByDate.set(dateKey, [])
      }
      tasksByDate.get(dateKey)?.push(task)
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
  }, [daysInMonth, leadingEmptyCells, referenceDate])

  const monthLabel = `${MONTHS[referenceDate.getMonth()]}`

  const updateMonth = (offset: number) => {
    setReferenceDate((prev) => {
      const next = new Date(prev)
      next.setMonth(prev.getMonth() + offset)
      return next
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-[clamp(1.5rem,3vw,3.5rem)] pb-16 pt-6">
      <header className="flex items-center justify-between">
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

        <div className="flex items-center gap-4 rounded-full border-2 border-primary/40 bg-[#EDE4FF] px-6 py-3 text-xl font-semibold text-[#2F2766] shadow-[0_8px_0_rgba(144,122,214,0.2)]">
          <button
            type="button"
            onClick={() => updateMonth(-1)}
            className="rounded-full p-2 transition hover:bg-white"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-5" />
          </button>
          <span className="min-w-[10rem] text-center">{monthLabel}</span>
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
  )
}
