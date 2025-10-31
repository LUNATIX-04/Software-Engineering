"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronDown, Filter, Search, UserRound, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type MemberRecord = {
  id: string
  name: string
  email: string
  role: "Head" | "Member"
  department: "Registration" | "Account" | "Add Department"
}

const INITIAL_MEMBERS: MemberRecord[] = [
  {
    id: "1",
    name: "Username 1",
    email: "email1@mail.com",
    role: "Head",
    department: "Registration",
  },
  {
    id: "2",
    name: "Username 2",
    email: "email2@mail.com",
    role: "Member",
    department: "Registration",
  },
  {
    id: "3",
    name: "Username 3",
    email: "email3@mail.com",
    role: "Member",
    department: "Account",
  },
  {
    id: "4",
    name: "Username 4",
    email: "email4@mail.com",
    role: "Member",
    department: "Add Department",
  },
] as const

const ROLE_STYLES: Record<MemberRecord["role"], string> = {
  Head: "bg-[#C6B5FF] text-[#2F2766]",
  Member: "bg-white text-[#2F2766]",
}

const DEPARTMENT_STYLES: Record<MemberRecord["department"], string> = {
  Registration: "bg-[#DCE8FF] text-[#2F2766]",
  Account: "bg-[#D6F5C8] text-[#2F2766]",
  "Add Department": "bg-white text-[#2F2766]",
}

const AVAILABLE_DEPARTMENTS: Array<Exclude<MemberRecord["department"], "Add Department">> = [
  "Registration",
  "Account",
]

type ProjectMemberPageProps = {
  params: Promise<{
    projectId: string
  }>
}

export default function ProjectMemberPage({ params }: ProjectMemberPageProps) {
  const { projectId } = React.use(params)
  const router = useRouter()
  const [members, setMembers] = useState<MemberRecord[]>(() => [...INITIAL_MEMBERS])
  const [search, setSearch] = useState("")
  const [activeDepartments, setActiveDepartments] = useState<Array<string>>([
    "Registration",
    "Account",
  ])
  const [page, setPage] = useState(1)
  const pageSize = 3

  const filteredMembers = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    const hasFilters = activeDepartments.length > 0

    return members.filter((member) => {
      const matchesDepartment =
        member.department === "Add Department" ||
        !hasFilters ||
        activeDepartments.includes(member.department)
      if (!matchesDepartment) {
        return false
      }
      if (!normalized) {
        return true
      }
      const haystack = [member.name, member.email, member.role, member.department]
        .join(" ")
        .toLowerCase()
      return haystack.includes(normalized)
    })
  }, [activeDepartments, members, search])

  const totalPages = useMemo(() => {
    if (filteredMembers.length === 0) {
      return 1
    }
    return Math.max(1, Math.ceil(filteredMembers.length / pageSize))
  }, [filteredMembers.length])

  React.useEffect(() => {
    setPage(1)
  }, [search, activeDepartments])

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const paginatedMembers = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    return filteredMembers.slice(startIndex, startIndex + pageSize)
  }, [filteredMembers, page, pageSize])

  const handleRemoveFilter = (label: string) => {
    setActiveDepartments((prev) => prev.filter((item) => item !== label))
  }

  const handleResetFilters = () => {
    setActiveDepartments(AVAILABLE_DEPARTMENTS)
  }

  const handleSetMemberDepartment = (memberId: string, department: MemberRecord["department"]) => {
    setMembers((prev) =>
      prev.map((item) => (item.id === memberId ? { ...item, department } : item))
    )
  }

  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-[clamp(1.5rem,3vw,3.5rem)] pb-16 pt-6"
      data-project-id={projectId}
    >
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
      </header>

      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary/60" />
            <input
              aria-label="Search members"
              placeholder="Search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-full border-2 border-primary/40 bg-white/90 py-3 pl-12 pr-4 text-sm text-[#2F2766] placeholder:text-primary/60 shadow-[0_6px_0_rgba(144,122,214,0.2)] focus:border-primary focus:outline-none"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleResetFilters}
            className="inline-flex h-12 items-center gap-2 rounded-full border-primary/40 px-4 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary hover:text-primary-foreground"
          >
            <Filter className="size-4" />
            Filter
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {activeDepartments.map((department) => (
            <button
              key={department}
              type="button"
              onClick={() => handleRemoveFilter(department)}
              className="inline-flex items-center gap-2 rounded-full border-2 border-primary/40 bg-white px-5 py-2 text-sm font-semibold text-primary shadow-[0_4px_0_rgba(144,122,214,0.2)] transition hover:border-primary hover:text-primary"
            >
              {department}
              <X className="size-4" />
            </button>
          ))}
          {activeDepartments.length === 0 ? (
            <span className="rounded-full border border-dashed border-primary/40 px-5 py-2 text-sm font-semibold text-primary/60">
              No filters
            </span>
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-6">
        {paginatedMembers.map((member) => (
          <article
            key={member.id}
            className="flex flex-col gap-4 rounded-[3rem] border-2 border-primary/30 bg-[#F6F0FF] px-6 py-5 shadow-[0_10px_0_rgba(144,122,214,0.15)] transition hover:shadow-[0_14px_0_rgba(144,122,214,0.2)] sm:flex-row sm:items-center sm:gap-6 sm:px-8 sm:py-6"
          >
            <div className="flex items-center gap-4">
              <div className="flex size-[4.25rem] items-center justify-center rounded-full bg-[#D9C9FF] text-[#2F2766] shadow-[0_5px_0_rgba(144,122,214,0.28)]">
                <UserRound className="size-7" />
              </div>
              <div className="flex flex-col text-[#2F2766]">
                <span className="text-lg font-semibold">{member.name}</span>
                <span className="text-sm opacity-80">{member.email}</span>
              </div>
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
              <MemberChip label={member.role} className={ROLE_STYLES[member.role]} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border-2 border-primary/40 px-5 py-2 text-sm font-semibold shadow-[0_4px_0_rgba(144,122,214,0.2)] transition focus:outline-none",
                      member.department === "Add Department"
                        ? "bg-white text-primary hover:border-primary hover:text-primary"
                        : DEPARTMENT_STYLES[member.department]
                    )}
                  >
                    {member.department === "Add Department" ? "Add Department" : member.department}
                    <ChevronDown className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-44 rounded-3xl border border-primary/40 bg-white px-2 py-2 text-sm font-semibold text-[#2F2766] shadow-[0_10px_30px_rgba(72,68,110,0.2)]"
                >
                  {AVAILABLE_DEPARTMENTS.map((option) => (
                    <DropdownMenuItem
                      key={option}
                      onSelect={() => handleSetMemberDepartment(member.id, option)}
                      className="rounded-2xl px-3 py-2 focus:bg-primary/10 focus:text-primary"
                    >
                      {option}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </article>
        ))}

        {paginatedMembers.length === 0 ? (
          <div className="rounded-[3rem] border-2 border-dashed border-primary/40 bg-white/70 px-6 py-12 text-center text-sm font-semibold text-primary">
            No members match your filters.
          </div>
        ) : null}
      </section>

      <footer className="mt-auto flex items-center justify-center gap-4 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page === 1}
          className="size-10 rounded-full border border-transparent text-lg text-primary hover:border-primary/40 hover:text-primary"
        >
          &#9664;
        </Button>
        <span className="flex min-w-[3rem] items-center justify-center rounded-full border-2 border-primary/40 bg-white px-4 py-2 text-base font-semibold text-primary shadow-sm">
          {page}
        </span>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page === totalPages}
          className="size-10 rounded-full border border-transparent text-lg text-primary hover:border-primary/40 hover:text-primary"
        >
          &#9654;
        </Button>
      </footer>
    </div>
  )
}

type MemberChipProps = {
  label: string
  className?: string
}

function MemberChip({ label, className }: MemberChipProps) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[8.5rem] items-center justify-center rounded-full border-2 border-primary/30 px-5 py-2 text-sm font-semibold shadow-[0_4px_0_rgba(144,122,214,0.2)]",
        className
      )}
    >
      {label}
    </span>
  )
}
