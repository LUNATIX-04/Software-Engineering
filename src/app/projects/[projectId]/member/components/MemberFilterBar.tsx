"use client"

import { Filter, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { SearchField } from "@/components/ui/search-field"

import type {
  MemberRole,
  SelectableMemberDepartment,
} from "@/components/projects/MemberCard"
import { ADD_DEPARTMENT_LABEL } from "@/constants/departments"
import { useNotifications } from "@/components/notifications/Notification"
import { useEffect } from "react"

export type MemberFilterBarProps = {
  availableRoles: MemberRole[]
  search: string
  filterCount: number
  filterActionOpen: boolean
  roleFilters: MemberRole[]
  departmentFilters: SelectableMemberDepartment[]
  departmentOptions: SelectableMemberDepartment[]
  departmentsError: string | null
  departmentsLoading: boolean
  onSearchChange: (value: string) => void
  onFilterActionOpenChange: (open: boolean) => void
  onToggleRoleFilter: (role: MemberRole, checked: boolean) => void
  onToggleDepartmentFilter: (department: SelectableMemberDepartment, checked: boolean) => void
  onResetFilters: () => void
}

export function MemberFilterBar({
  availableRoles,
  search,
  filterCount,
  filterActionOpen,
  roleFilters,
  departmentFilters,
  departmentOptions,
  departmentsError,
  departmentsLoading,
  onSearchChange,
  onFilterActionOpenChange,
  onToggleRoleFilter,
  onToggleDepartmentFilter,
  onResetFilters,
}: MemberFilterBarProps) {
  const { notify } = useNotifications()

  useEffect(() => {
    if (departmentsError) {
      notify({
        title: "Department filters failed",
        description: departmentsError,
        variant: "destructive",
      })
    }
  }, [departmentsError, notify])

  return (
    <div className="flex flex-col gap-3 md:flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          wrapperClassName="w-full sm:max-w-md"
          aria-label="Search members"
          placeholder="Search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <DropdownMenu open={filterActionOpen} onOpenChange={onFilterActionOpenChange}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              data-cy="project-member-filter-button"
              className={cn(
                "select-none inline-flex h-12 w-[8rem] items-center gap-2 rounded-full px-6 text-base font-semibold focus:outline-none",
                filterCount > 0 ? "" : "justify-center",
                filterActionOpen
                  ? "border-primary bg-button-hover-background text-primary-foreground"
                  : "border-primary/40 bg-button-background text-button-foreground transition hover:border-primary hover:bg-button-hover-background hover:text-primary-foreground"
              )}
            >
              <span className="inline-flex items-center gap-2">
                <Filter className="size-4" />
                Filter
              </span>
              {filterCount > 0 ? (
                <span className="ml-auto inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-primary/90 px-1 text-xs font-bold text-primary-foreground">
                  {filterCount}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-60 overflow-hidden rounded-3xl border border-primary/40 bg-white text-sm font-semibold text-primary shadow-[0_10px_30px_rgba(72,68,110,0.2)]"
          >
            <div className="member-filter-scroll max-h-[22rem] overflow-y-auto px-2 py-2">
              <div className="flex items-center justify-between px-3 py-1.5">
                <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-primary/60">
                  Filters
                </DropdownMenuLabel>
                <button
                  type="button"
                  data-cy="project-member-filter-close-button"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onFilterActionOpenChange(false)
                  }}
                  className="rounded-full p-1 text-primary/60 transition hover:bg-primary/10 hover:text-primary focus:outline-none"
                  aria-label="Close department filters"
                >
                  <X className="size-4" />
                </button>
              </div>
              <DropdownMenuSeparator className="my-1 bg-primary/20" />
              <DropdownMenuLabel className="px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-primary/60">
                Roles
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 bg-primary/10" />
              {availableRoles.map((role) => (
                <DropdownMenuCheckboxItem
                  key={role}
                  checked={roleFilters.includes(role)}
                  onCheckedChange={(checked) => onToggleRoleFilter(role, Boolean(checked))}
                  onSelect={(event) => event.preventDefault()}
                  className="rounded-2xl px-3 py-2 pr-10 text-foreground focus:bg-primary/10 focus:text-primary [&>span:first-child]:left-auto [&>span:first-child]:right-3"
                >
                  {role}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator className="my-1 bg-primary/20" />
              <DropdownMenuLabel className="px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-primary/60">
                Departments
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 bg-primary/10" />
              {departmentOptions.map((department) => (
                <DropdownMenuCheckboxItem
                  key={department}
                  checked={departmentFilters.includes(department)}
                  onCheckedChange={(checked) =>
                    onToggleDepartmentFilter(department, Boolean(checked))
                  }
                  onSelect={(event) => event.preventDefault()}
                  className={cn(
                    "rounded-2xl px-3 py-2 pr-10 focus:bg-primary/10 focus:text-primary [&>span:first-child]:left-auto [&>span:first-child]:right-3",
                    department === ADD_DEPARTMENT_LABEL ? "text-primary/80" : "text-foreground"
                  )}
                >
                  <span className="block max-w-[20rem] truncate">{department}</span>
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator className="my-1 bg-primary/20" />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  onResetFilters()
                }}
                className="rounded-2xl px-3 py-2 text-primary/70 focus:bg-primary/10 focus:text-primary"
                data-cy="project-member-reset-filters"
              >
                Reset filters
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
