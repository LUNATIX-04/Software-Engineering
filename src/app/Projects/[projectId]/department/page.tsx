"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronDown, Palette, Plus, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type DepartmentRecord = {
  id: string
  name: string
  head: string | null
  memberCount: number
  colorToken: string
}

const COLOR_SEQUENCE = ["#D7F5C3", "#DDE7FF", "#FFE2F1", "#FFF8D6", "#E0F7FA"] as const
const CARD_TEXT_COLOR = "#2F2766"

const DEFAULT_DEPARTMENTS: DepartmentRecord[] = [
  {
    id: "dept-1",
    name: "Account",
    head: null,
    memberCount: 1,
    colorToken: COLOR_SEQUENCE[0],
  },
  {
    id: "dept-2",
    name: "Registration",
    head: "Username 1",
    memberCount: 2,
    colorToken: COLOR_SEQUENCE[1],
  },
] as const

const HEAD_OPTIONS = ["Select", "Username 1", "Username 2", "Username 3"]

type ProjectDepartmentPageProps = {
  params: Promise<{
    projectId: string
  }>
}

export default function ProjectDepartmentPage({ params }: ProjectDepartmentPageProps) {
  const { projectId } = React.use(params)
  const router = useRouter()
  const [departments, setDepartments] = useState<DepartmentRecord[]>(() =>
    DEFAULT_DEPARTMENTS.map((dept) => ({ ...dept }))
  )
  const [search, setSearch] = useState("")

  const filteredDepartments = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) {
      return departments
    }
    return departments.filter((dept) => {
      const haystack = [dept.name, dept.head ?? "", String(dept.memberCount)]
        .join(" ")
        .toLowerCase()
      return haystack.includes(normalized)
    })
  }, [departments, search])

  const handleSelectHead = (departmentId: string, value: string) => {
    setDepartments((prev) =>
      prev.map((dept) =>
        dept.id === departmentId
          ? {
              ...dept,
              head: value === "Select" ? null : value,
            }
          : dept
      )
    )
  }

  const handleCycleColor = (departmentId: string) => {
    setDepartments((prev) =>
      prev.map((dept) => {
        if (dept.id !== departmentId) {
          return dept
        }
        const currentIndex = COLOR_SEQUENCE.indexOf(dept.colorToken as (typeof COLOR_SEQUENCE)[number])
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % COLOR_SEQUENCE.length
        return {
          ...dept,
          colorToken: COLOR_SEQUENCE[nextIndex],
        }
      })
    )
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
        <div className="relative w-full max-w-md sm:ml-auto">
          <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-primary/60" />
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-full border-2 border-primary/40 bg-background py-3 pl-12 pr-4 text-base text-foreground placeholder:text-primary/60 shadow-[0_6px_0_rgba(144,122,214,0.2)] focus:border-primary focus:outline-none"
            data-cy="department-search-input"
          />
        </div>
      </header>

      <section
        className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
        data-project-id={projectId}
        aria-label="Departments"
      >
        {filteredDepartments.map((department) => (
          <DepartmentCard
            key={department.id}
            department={department}
            onSelectHead={handleSelectHead}
            onCycleColor={handleCycleColor}
          />
        ))}
        <AddDepartmentCard />
      </section>
    </div>
  )
}

type DepartmentCardProps = {
  department: DepartmentRecord
  onSelectHead: (departmentId: string, value: string) => void
  onCycleColor: (departmentId: string) => void
}

function DepartmentCard({ department, onSelectHead, onCycleColor }: DepartmentCardProps) {
  const innerTone = React.useMemo(() => {
    return blendColorWithWhite(department.colorToken, 0.35)
  }, [department.colorToken])

  return (
    <article
      className="flex flex-col gap-6 rounded-[2.75rem] border-2 border-primary/30 bg-white px-6 py-6 shadow-[0_12px_0_rgba(144,122,214,0.15)] transition-shadow hover:shadow-[0_18px_0_rgba(144,122,214,0.2)]"
      style={{ backgroundColor: department.colorToken }}
    >
      <header className="text-center text-2xl font-semibold" style={{ color: CARD_TEXT_COLOR }}>
        {department.name}
      </header>
      <div
        className="flex flex-col gap-4 rounded-[2rem] border-2 border-primary/30 px-5 py-5"
        style={{ backgroundColor: innerTone }}
      >
        <div className="text-sm font-semibold" style={{ color: CARD_TEXT_COLOR }}>
          <span>Head :</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="mt-2 flex w-full items-center justify-between rounded-full border-2 border-primary/30 bg-white px-4 py-2 text-base font-medium text-primary shadow-[0_6px_0_rgba(144,122,214,0.2)] focus:outline-none"
              >
                <span>{department.head ?? "Select"}</span>
                <ChevronDown className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-48 rounded-3xl border border-primary/40 bg-white px-3 py-2 text-sm font-semibold text-primary shadow-[0_10px_30px_rgba(72,68,110,0.2)]"
            >
              {HEAD_OPTIONS.map((headOption) => (
                <DropdownMenuItem
                  key={headOption}
                  onSelect={() => onSelectHead(department.id, headOption)}
                  className="rounded-2xl px-3 py-2 focus:bg-primary/10 focus:text-primary"
                >
                  {headOption}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-base font-medium" style={{ color: CARD_TEXT_COLOR }}>
          Number of Member : {department.memberCount}
        </p>
        <button
          type="button"
          onClick={() => onCycleColor(department.id)}
          className="flex items-center justify-between rounded-full border-2 border-primary/30 bg-white px-4 py-3 text-sm font-semibold text-primary shadow-[0_6px_0_rgba(144,122,214,0.2)] transition hover:border-primary hover:text-primary"
        >
          <span className="inline-flex items-center gap-2">
            <Palette className="size-4" />
            Select Color
          </span>
          <span
            className="size-6 rounded-full border-2 border-primary/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
            style={{ backgroundColor: department.colorToken }}
          />
        </button>
      </div>
    </article>
  )
}

function AddDepartmentCard() {
  return (
    <button
      type="button"
      className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-4 rounded-[2.75rem] border-2 border-primary/30 bg-white/40 px-6 py-6 text-center text-primary shadow-[0_12px_0_rgba(144,122,214,0.15)] transition hover:border-primary hover:text-primary"
    >
      <span className="flex size-14 items-center justify-center rounded-full border-2 border-current text-primary">
        <Plus className="size-6" />
      </span>
      <span className="text-xl font-semibold">Add Department</span>
    </button>
  )
}

function blendColorWithWhite(hexColor: string, blendFactor: number) {
  const sanitized = hexColor.replace("#", "")
  if (sanitized.length !== 6) {
    return hexColor
  }
  const r = parseInt(sanitized.slice(0, 2), 16)
  const g = parseInt(sanitized.slice(2, 4), 16)
  const b = parseInt(sanitized.slice(4, 6), 16)

  const mix = (component: number) => Math.round(component + (255 - component) * blendFactor)

  const mixedR = mix(r)
  const mixedG = mix(g)
  const mixedB = mix(b)

  const toHex = (value: number) => value.toString(16).padStart(2, "0")
  return `#${toHex(mixedR)}${toHex(mixedG)}${toHex(mixedB)}`
}
