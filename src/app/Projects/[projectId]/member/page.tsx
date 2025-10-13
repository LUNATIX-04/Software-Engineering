"use client"

import * as React from "react"
import { useMemo, useState } from "react"

import { ChevronDown, Search, UserRound } from "lucide-react"

import { cn } from "@/lib/utils"

type MemberStatusVariant = "primary" | "secondary" | "accent" | "outline"

type MemberRecord = {
  id: string
  name: string
  email: string
  role: {
    label: string
    variant: MemberStatusVariant
  }
  department: {
    label: string
    variant: MemberStatusVariant
    withCaret?: boolean
  }
}

const STATUS_VARIANT_STYLES: Record<MemberStatusVariant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-[0_4px_0_rgba(72,68,110,0.4)] hover:bg-primary",
  secondary:
    "bg-secondary text-secondary-foreground shadow-[0_4px_0_rgba(72,68,110,0.25)] hover:bg-secondary",
  accent:
    "bg-accent text-accent-foreground shadow-[0_4px_0_rgba(72,68,110,0.25)] hover:bg-accent",
  outline:
    "bg-background text-primary shadow-[0_4px_0_rgba(72,68,110,0.25)] hover:bg-background border border-primary/50",
}

const MEMBERS: MemberRecord[] = [
  {
    id: "1",
    name: "Username 1",
    email: "email1@mail.com",
    role: { label: "Head", variant: "primary" },
    department: { label: "Registration", variant: "accent" },
  },
  {
    id: "2",
    name: "Username 2",
    email: "email2@mail.com",
    role: { label: "Member", variant: "outline" },
    department: { label: "Registration", variant: "accent" },
  },
  {
    id: "3",
    name: "Username 3",
    email: "email3@mail.com",
    role: { label: "Member", variant: "outline" },
    department: { label: "Account", variant: "secondary" },
  },
  {
    id: "4",
    name: "Username 4",
    email: "email4@mail.com",
    role: { label: "Member", variant: "outline" },
    department: { label: "Add Department", variant: "outline", withCaret: true },
  },
]

type ProjectMemberPageProps = {
  params: Promise<{
    projectId: string
  }>
}

export default function ProjectMemberPage({ params }: ProjectMemberPageProps) {
  const { projectId } = React.use(params)
  const [search, setSearch] = useState("")

  const filteredMembers = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) {
      return MEMBERS
    }
    return MEMBERS.filter((member) => {
      const haystack = [member.name, member.email, member.role.label, member.department.label]
        .join(" ")
        .toLowerCase()
      return haystack.includes(normalized)
    })
  }, [search])

  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-[clamp(1.5rem,3vw,3.5rem)] pb-16"
      data-project-id={projectId}
    >
      <div className="flex w-full justify-end">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary/60" />
          <input
            aria-label="Search members"
            placeholder="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-full border-2 border-primary/40 bg-background py-3 pl-12 pr-4 text-sm text-foreground placeholder:text-primary/60 shadow-[0_6px_0_rgba(144,122,214,0.25)] focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {filteredMembers.map((member) => (
          <div
            key={member.id}
            className="flex flex-col gap-4 rounded-[2.75rem] border-2 border-primary/40 bg-primary/5 px-6 py-4 shadow-[0_10px_0_rgba(144,122,214,0.15)] sm:flex-row sm:items-center sm:gap-6 sm:px-8 sm:py-6"
          >
            <div className="flex items-center gap-4">
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/20 text-primary shadow-[0_4px_0_rgba(144,122,214,0.35)]">
                <UserRound className="size-7" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-foreground">{member.name}</span>
                <span className="text-sm text-foreground/70">{member.email}</span>
              </div>
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-3 sm:justify-end">
              <StatusChip label={member.role.label} variant={member.role.variant} />
              <StatusChip
                label={member.department.label}
                variant={member.department.variant}
                withCaret={member.department.withCaret}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

type StatusChipProps = {
  label: string
  variant: MemberStatusVariant
  withCaret?: boolean
}

function StatusChip({ label, variant, withCaret }: StatusChipProps) {
  return (
    <span
      className={cn(
        "flex min-w-[9rem] items-center justify-center gap-2 rounded-full px-6 py-2 text-sm font-semibold transition-colors",
        STATUS_VARIANT_STYLES[variant]
      )}
    >
      {label}
      {withCaret ? <ChevronDown className="size-4" /> : null}
    </span>
  )
}
