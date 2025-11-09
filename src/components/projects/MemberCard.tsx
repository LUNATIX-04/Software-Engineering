"use client"

import Image from "next/image"
import { useState } from "react"
import { Check, ChevronDown, Footprints, UserRound } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ADD_DEPARTMENT_LABEL,
  DEFAULT_DEPARTMENT_COLORS,
  DEFAULT_DEPARTMENT_TEXT_COLOR,
} from "@/constants/departments"
import { cn } from "@/lib/utils"

export type MemberRole = "Project Owner" | "Header" | "Member"
export type MemberDepartment = string
export type SelectableMemberDepartment = MemberDepartment

const ROLE_STYLES: Record<MemberRole, string> = {
  "Project Owner": "bg-primary text-primary-foreground border-primary/60 shadow-[0_4px_0_rgba(70,52,142,0.35)]",
  Header: "bg-[#C6B5FF] text-[#2F2766]",
  Member: "bg-[#F6F0FF] text-[#2F2766]",
}

type DepartmentColorOverrides = Record<string, { background: string; text: string }>

const getDepartmentStyle = (
  department: MemberDepartment,
  overrides?: DepartmentColorOverrides
) => {
  if (department === ADD_DEPARTMENT_LABEL) {
    return undefined
  }
  if (overrides && overrides[department]) {
    return overrides[department]
  }
  if (DEFAULT_DEPARTMENT_COLORS[department]) {
    return {
      background: DEFAULT_DEPARTMENT_COLORS[department],
      text: DEFAULT_DEPARTMENT_TEXT_COLOR,
    }
  }
  return undefined
}

export type MemberCardProps = {
  name: string
  email: string | null
  avatarUrl?: string | null
  role: MemberRole
  roleLabel?: string
  department: MemberDepartment
  availableDepartments?: SelectableMemberDepartment[]
  onDepartmentSelect?: (department: SelectableMemberDepartment) => void
  departmentColors?: DepartmentColorOverrides
  onClick?: () => void
  readOnly?: boolean
  onKick?: (() => void) | null
  kickDisabled?: boolean
  className?: string
}

export function MemberCard({
  name,
  email,
  avatarUrl,
  role,
  roleLabel,
  department,
  availableDepartments,
  onDepartmentSelect,
  departmentColors,
  onClick,
  readOnly = false,
  onKick,
  kickDisabled = false,
  className,
}: MemberCardProps) {
  const departmentStyle = getDepartmentStyle(department, departmentColors)
  const [departmentMenuOpen, setDepartmentMenuOpen] = useState(false)

  return (
    <article
      className={cn(
        "relative flex flex-col gap-4 rounded-[3rem] border-2 border-primary/30 bg-white px-6 py-5 shadow-[0_4px_0_rgba(144,122,214,0.15)] transition hover:shadow-[0_6px_0_rgba(144,122,214,0.2)] hover:bg-primary/10 sm:flex-row sm:items-center sm:gap-6 sm:px-8 sm:py-6",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {onKick ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            if (kickDisabled) {
              return
            }
            onKick()
          }}
          className="absolute right-5 top-5 inline-flex size-9 items-center justify-center rounded-full border-2 border-primary/30 bg-white text-primary shadow-sm transition hover:border-primary hover:bg-primary/10 disabled:opacity-60"
          aria-label={`Remove ${name} from project`}
          disabled={kickDisabled}
        >
          <Footprints className="size-4" />
        </button>
      ) : null}
      <div className="flex items-center gap-8">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={`${name} avatar`}
            width={48}
            height={48}
            className="size-[3rem] rounded-full object-cover"
          />
        ) : (
          <div className="flex size-[3rem] items-center justify-center rounded-full bg-[#D9C9FF] text-[#2F2766]">
            <UserRound className="size-6" />
          </div>
        )}
        <div className="flex flex-col text-[#2F2766]">
          <span className="text-lg font-semibold">{name}</span>
          {email ? <span className="text-sm opacity-80">{email}</span> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
        <MemberChip
          label={roleLabel ?? role}
          className={cn("h-[2.5rem] min-w-[13rem]", ROLE_STYLES[role])}
        />
        {readOnly || !onDepartmentSelect || !availableDepartments?.length ? (
          <span
            className={cn(
              "inline-flex h-[2.5rem] min-w-[14rem] select-none items-center justify-center gap-2 rounded-full border-2 border-primary/40 px-5 py-2 text-sm font-semibold shadow-[0_4px_0_rgba(144,122,214,0.2)]",
              department === ADD_DEPARTMENT_LABEL
                ? "bg-white text-primary/80"
                : "text-foreground"
            )}
            style={
              department === ADD_DEPARTMENT_LABEL
                ? undefined
                : {
                    backgroundColor: departmentStyle?.background,
                    color: departmentStyle?.text ?? DEFAULT_DEPARTMENT_TEXT_COLOR,
                  }
            }
          >
            <span className="max-w-[10rem] truncate">{department}</span>
          </span>
        ) : (
          <DropdownMenu onOpenChange={setDepartmentMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex h-[2.5rem] min-w-[14rem] select-none items-center justify-center gap-2 rounded-full border-2 border-primary/40 px-5 py-2 text-sm font-semibold shadow-[0_4px_0_rgba(144,122,214,0.2)] transition focus:outline-none hover:border-primary hover:bg-primary/10",
                  department === ADD_DEPARTMENT_LABEL
                    ? "bg-white text-primary/80 hover:border-primary hover:text-primary"
                    : "text-foreground",
                  departmentMenuOpen &&
                    (department === ADD_DEPARTMENT_LABEL
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-primary bg-primary/10 text-primary")
                )}
                style={
                  department === ADD_DEPARTMENT_LABEL
                    ? undefined
                    : {
                        backgroundColor: departmentStyle?.background,
                        color: departmentStyle?.text ?? DEFAULT_DEPARTMENT_TEXT_COLOR,
                      }
                }
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <span className="max-w-[10rem] truncate">{department}</span>
                <ChevronDown className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 select-none rounded-3xl border border-primary/40 bg-white px-2 py-2 text-sm font-semibold text-[#2F2766] shadow-[0_10px_30px_rgba(72,68,110,0.2)]"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {availableDepartments.map((option) => {
                const isActive = option === department
                return (
                  <DropdownMenuItem
                    key={option}
                    onSelect={(event) => {
                      event.stopPropagation()
                      onDepartmentSelect(option)
                    }}
                    className={cn(
                      "flex select-none items-center justify-between rounded-2xl px-3 py-2 hover:bg-primary/10 hover:text-primary focus:bg-primary/10",
                      option === ADD_DEPARTMENT_LABEL
                        ? "text-primary/100 hover:text-primary focus:text-primary"
                        : "focus:text-primary"
                    )}
                  >
                    <span className="block max-w-[10rem] truncate">{option}</span>
                    {isActive ? <Check className="size-4 text-primary" /> : null}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </article>
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
        "inline-flex min-w-[9.5rem] h-[3rem] items-center justify-center rounded-full border-2 border-primary/30 px-5 py-2 text-sm font-semibold shadow-[0_4px_0_rgba(144,122,214,0.2)]",
        className
      )}
    >
      {label}
    </span>
  )
}
