"use client"

import Image from "next/image"
import { useEffect, useState, type CSSProperties } from "react"
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

type RoleStyle = {
  className: string
  style: CSSProperties
}

const ROLE_SHARED_CLASS =
  "bg-[var(--role-bg)] text-[var(--role-text)] shadow-[0_4px_0_var(--role-shadow)]"

const ROLE_STYLES: Record<MemberRole, RoleStyle> = {
  "Project Owner": {
    className: ROLE_SHARED_CLASS,
    style: {
      "--role-bg": "var(--role-owner-bg)",
      "--role-text": "var(--role-owner-text)",
      "--role-shadow": "var(--role-owner-shadow)",
    } as CSSProperties,
  },
  Header: {
    className: ROLE_SHARED_CLASS,
    style: {
      "--role-bg": "var(--primary-soft)",
      "--role-text": "var(--foreground)",
      "--role-shadow": "color-mix(in srgb, var(--primary-soft) 40%, transparent)",
    } as CSSProperties,
  },
  Member: {
    className: ROLE_SHARED_CLASS,
    style: {
      "--role-bg": "var(--muted)",
      "--role-text": "var(--foreground)",
      "--role-shadow": "color-mix(in srgb, var(--primary) 22%, transparent)",
    } as CSSProperties,
  },
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
  roleOptions?: MemberRole[]
  onRoleSelect?: (role: MemberRole) => void
  department: MemberDepartment
  availableDepartments?: SelectableMemberDepartment[]
  onDepartmentSelect?: (department: SelectableMemberDepartment) => void
  departmentColors?: DepartmentColorOverrides
  onClick?: () => void
  readOnly?: boolean
  onKick?: (() => void) | null
  kickDisabled?: boolean
  className?: string
  dataCyIndex?: number
  onMenuOpenChange?: (open: boolean) => void
}

export function MemberCard({
  name,
  email,
  avatarUrl,
  role,
  roleLabel,
  roleOptions,
  onRoleSelect,
  department,
  availableDepartments,
  onDepartmentSelect,
  departmentColors,
  onClick,
  readOnly = false,
  onKick,
  kickDisabled = false,
  className,
  dataCyIndex,
  onMenuOpenChange,
}: MemberCardProps) {
  const departmentStyle = getDepartmentStyle(department, departmentColors)
  const [departmentMenuOpen, setDepartmentMenuOpen] = useState(false)
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)
  const menuOpen = roleMenuOpen || departmentMenuOpen
  const dataCySuffix = typeof dataCyIndex === "number" ? `-${dataCyIndex}` : ""
  const buildDataCy = (base: string) => `${base}${dataCySuffix}`
  const roleStyle = ROLE_STYLES[role] ?? ROLE_STYLES.Member
  const isProjectOwnerRole = (roleLabel ?? role)?.includes("Project Owner")
  const isRoleOwner = role === "Project Owner"
  useEffect(() => {
    onMenuOpenChange?.(menuOpen)
  }, [menuOpen, onMenuOpenChange])

  return (
    <article
      className={cn(
        "relative flex flex-col gap-4 rounded-[3rem] border-2 border-primary/30 bg-card px-6 py-5 shadow-[0_4px_0_color-mix(in_srgb,var(--primary)_18%,transparent)] transition hover:shadow-[0_6px_0_color-mix(in_srgb,var(--primary)_26%,transparent)] hover:bg-primary/10 sm:flex-row sm:items-center sm:gap-6 sm:px-8 sm:py-6",
        onClick && "cursor-pointer",
        menuOpen && "bg-primary/10 shadow-[0_6px_0_color-mix(in_srgb,var(--primary)_26%,transparent)]",
        className
      )}
      onClick={onClick}
      data-cy={buildDataCy("member-card")}
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
          className="absolute right-5 top-5 inline-flex size-9 items-center justify-center rounded-full border-2 border-primary/30 bg-card text-primary shadow-sm transition hover:border-primary hover:bg-primary/10 disabled:opacity-60"
          aria-label={`Remove ${name} from project`}
          disabled={kickDisabled}
          data-cy={buildDataCy("member-card-kick-button")}
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
            data-cy="member-card-avatar"
          />
        ) : (
          <div className="flex size-[3rem] items-center justify-center rounded-full bg-primary/20 text-primary">
            <UserRound className="size-6" />
          </div>
        )}
        <div className="flex flex-col text-foreground">
          <span className="text-lg font-semibold">{name}</span>
          {email ? <span className="text-sm opacity-80">{email}</span> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
        {roleOptions && roleOptions.length > 0 && onRoleSelect ? (
          <div
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <DropdownMenu open={roleMenuOpen} onOpenChange={setRoleMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-[2.5rem] min-w-[14rem] select-none items-center justify-center gap-2 rounded-full border-2 px-5 py-2 text-sm font-semibold transition focus:outline-none",
                    ROLE_SHARED_CLASS,
                    roleStyle.className,
                    isProjectOwnerRole && "hover:text-black",
                    isRoleOwner
                      ? "border-[color:var(--role-owner-bg)] text-[color:var(--role-owner-text)] hover:border-[color:var(--role-owner-shadow)] hover:bg-[color:var(--role-owner-bg)]/90 hover:text-[color:var(--role-owner-text)] focus-visible:ring-2 focus-visible:ring-[color:var(--role-owner-text)]/30"
                      : "border-primary/40 hover:border-primary hover:bg-primary/10"
                  )}
                  style={roleStyle.style}
                  data-cy={buildDataCy("member-card-role-trigger")}
                >
                  {roleLabel ?? role}
                  <ChevronDown className="size-4" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="dialog-scroll dropdown-surface w-48 max-h-[28rem] overflow-y-auto rounded-3xl border border-primary/30 bg-card text-sm font-semibold text-primary">
                {roleOptions.map((option) => (
                  <DropdownMenuItem
                    key={option}
                    onSelect={(event) => {
                      event.preventDefault()
                      onRoleSelect(option)
                      setRoleMenuOpen(false)
                    }}
                    className="flex items-center justify-between rounded-2xl px-3 py-2 focus:bg-primary/10 focus:text-primary"
                    data-cy={buildDataCy(`member-card-role-${option.toLowerCase().replace(/\\s+/g, "-")}`)}
                  >
                    {option}
                    {option === roleLabel || (option === role && !roleLabel) ? (
                      <Check className="size-4" aria-hidden="true" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <MemberChip
            label={roleLabel ?? role}
            className={cn(
              "h-[2.5rem] min-w-[13rem]",
              ROLE_SHARED_CLASS,
              roleStyle.className,
              isRoleOwner
                ? "border-[color:var(--role-owner-bg)] text-[color:var(--role-owner-text)]"
                : "border-primary/40"
            )}
            style={roleStyle.style}
          />
        )}
        {readOnly || !onDepartmentSelect || !availableDepartments?.length ? (
          <span
            className={cn(
              "inline-flex h-[2.5rem] min-w-[14rem] select-none items-center justify-center gap-2 rounded-full border-2 border-primary/40 px-5 py-2 text-sm font-semibold shadow-[0_4px_0_color-mix(in_srgb,var(--primary)_20%,transparent)]",
              department === ADD_DEPARTMENT_LABEL
                ? "bg-card text-primary/80"
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
          <div
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <DropdownMenu open={departmentMenuOpen} onOpenChange={setDepartmentMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-[2.5rem] min-w-[14rem] select-none items-center justify-center gap-2 rounded-full border-2 border-primary/40 px-5 py-2 text-sm font-semibold shadow-[0_4px_0_color-mix(in_srgb,var(--primary)_20%,transparent)] transition focus:outline-none hover:border-primary hover:bg-primary/10",
                    department === ADD_DEPARTMENT_LABEL
                      ? "bg-card text-primary/80 hover:border-primary hover:text-primary"
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
                  data-cy={buildDataCy("member-card-department-trigger")}
                >
                  <span className="max-w-[10rem] truncate">{department}</span>
                  <ChevronDown className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="dialog-scroll dropdown-surface w-44 select-none rounded-3xl border border-primary/40 bg-card px-2 py-2 text-sm font-semibold text-foreground"
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                {availableDepartments.map((option) => {
                  const isActive = option === department
                  return (
                    <DropdownMenuItem
                      key={option}
                      data-cy={buildDataCy(
                        `member-card-department-option-${option.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`
                      )}
                      onSelect={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        onDepartmentSelect(option)
                        setDepartmentMenuOpen(false)
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
          </div>
        )}
      </div>
    </article>
  )
}

type MemberChipProps = {
  label: string
  className?: string
  style?: CSSProperties
}

function MemberChip({ label, className, style }: MemberChipProps) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[9.5rem] h-[3rem] items-center justify-center rounded-full border-2 border-primary/30 px-5 py-2 text-sm font-semibold",
        className
      )}
      style={style}
    >
      {label}
    </span>
  )
}
