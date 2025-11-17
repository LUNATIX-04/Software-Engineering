"use client"

import { Filter, ChevronDown, X } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { TaskScope } from "../types"

type TaskFilterMenuProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClose: () => void
  filterActive: boolean
  filterSummaryText: string
  filterSummaryTitle: string
  filterBadgeCount: number | null
  departmentOptions: string[]
  departmentColorMap: Record<string, string>
  activeDepartmentFilters: string[]
  onToggleDepartmentFilter: (departmentName: string, enabled: boolean) => void
  taskScope: TaskScope
  onTaskScopeChange: (nextScope: TaskScope) => void
  isScopeSelectionDisabled: boolean
  onResetFilters: () => void
}

const normalizeDataCyValue = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const DEFAULT_DEPARTMENT_COLOR = "#D9D6FF"

export default function TaskFilterMenu({
  open,
  onOpenChange,
  onClose,
  filterActive,
  filterSummaryText,
  filterSummaryTitle,
  filterBadgeCount,
  departmentOptions,
  departmentColorMap,
  activeDepartmentFilters,
  onToggleDepartmentFilter,
  taskScope,
  onTaskScopeChange,
  isScopeSelectionDisabled,
  onResetFilters,
}: TaskFilterMenuProps) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-cy="project-task-department-filter-button"
          className={cn(
            "inline-flex w-full items-center justify-between rounded-full border-2 px-5 py-2 text-base font-medium focus:outline-none transition sm:w-auto",
            filterActive
              ? "border-primary bg-primary/10 text-[#2F2766]"
              : "border-primary/30 bg-white text-primary hover:border-primary hover:bg-primary/5"
          )}
          title={filterSummaryTitle}
        >
          <span className="flex items-center gap-3" data-cy="project-task-filter-indicator">
            <Filter className="size-4 text-primary" aria-hidden="true" />
            <span className="flex flex-col text-left leading-tight">
              <span
                className="text-[0.65rem] font-semibold uppercase tracking-wide text-primary/60"
                data-cy="project-task-filter-label"
              >
                Filters
              </span>
              <span
                className="text-sm font-semibold text-[#2F2766] max-w-[12rem] truncate"
                title={filterSummaryText}
                data-cy="project-task-filter-summary"
              >
                {filterSummaryText}
              </span>
            </span>
          </span>
          <span className="ml-4 inline-flex items-center gap-2">
            {filterBadgeCount ? (
              <span
                className="inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-primary/90 px-1 text-xs font-bold text-primary-foreground"
                data-cy="project-task-filter-badge"
              >
                {filterBadgeCount}
              </span>
            ) : null}
            <ChevronDown className="size-4 text-primary" aria-hidden="true" />
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-60 rounded-3xl border border-primary/40 bg-white px-3 py-2 text-sm font-semibold text-primary shadow-[0_10px_30px_rgba(72,68,110,0.2)]"
      >
        <div className="flex items-center justify-between px-1 pb-2 pt-1">
          <span
            className="text-[0.65rem] font-semibold uppercase tracking-wide text-primary/60"
            data-cy="project-task-filter-header"
          >
            Filters
          </span>
          <button
            type="button"
            data-cy="project-task-filter-close-button"
            className="rounded-full p-1 text-primary/60 transition hover:bg-primary/10 hover:text-primary focus:outline-none"
            onClick={onClose}
            aria-label="Close filters"
          >
            <X className="size-4" />
          </button>
        </div>
        <DropdownMenuSeparator className="my-1 bg-primary/15" />
        <div className="asap-scroll max-h-[18rem] overflow-y-auto">
          {departmentOptions.map((dept) => {
            const slug = normalizeDataCyValue(dept)
            return (
              <DropdownMenuCheckboxItem
                key={dept}
                checked={activeDepartmentFilters.includes(dept)}
                onCheckedChange={(nextChecked) =>
                  onToggleDepartmentFilter(dept, Boolean(nextChecked))
                }
                onSelect={(event) => event.preventDefault()}
                className="rounded-2xl px-3 py-2 pr-10 text-foreground focus:bg-primary/10 focus:text-primary [&>span:first-child]:left-auto [&>span:first-child]:right-3"
                data-cy={`project-task-filter-department-${slug}`}
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    className="size-3 rounded-full border border-black/10"
                    style={{
                      backgroundColor: departmentColorMap[dept] ?? DEFAULT_DEPARTMENT_COLOR,
                    }}
                  />
                  <span
                    className="block max-w-[10rem] truncate"
                    data-cy={`project-task-filter-department-label-${slug}`}
                  >
                    {dept}
                  </span>
                </span>
              </DropdownMenuCheckboxItem>
            )
          })}
          {departmentOptions.length === 0 ? (
            <div
              className="px-2 py-3 text-xs font-semibold uppercase tracking-wide text-primary/60"
              data-cy="project-task-no-departments"
            >
              No departments yet
            </div>
          ) : null}
        </div>
        <DropdownMenuSeparator className="my-2 bg-primary/20" />
        <DropdownMenuLabel
          className="px-3 pt-1 text-[0.65rem] font-semibold uppercase tracking-wide text-primary/60"
          data-cy="project-task-scope-label"
        >
          Task scope
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={taskScope} onValueChange={(value) => onTaskScopeChange(value as TaskScope)}>
          <DropdownMenuRadioItem
            value="all"
            className="rounded-2xl px-3 py-2 pr-10 focus:bg-primary/10 focus:text-primary [&>span:first-child]:left-auto [&>span:first-child]:right-3"
            data-cy="project-task-scope-all"
          >
            All tasks
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="assignee"
            disabled={isScopeSelectionDisabled}
            className="rounded-2xl px-3 py-2 pr-10 focus:bg-primary/10 focus:text-primary [&>span:first-child]:left-auto [&>span:first-child]:right-3"
            data-cy="project-task-scope-my-tasks"
          >
            My Tasks (Assignee)
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="assigner"
            disabled={isScopeSelectionDisabled}
            className="rounded-2xl px-3 py-2 pr-10 focus:bg-primary/10 focus:text-primary [&>span:first-child]:left-auto [&>span:first-child]:right-3"
            data-cy="project-task-scope-assigned-tasks"
          >
            Assigned Tasks (Assigner)
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator className="my-2 bg-primary/20" />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault()
            onResetFilters()
          }}
          className="rounded-2xl px-3 py-2 text-primary/70 focus:bg-primary/10 focus:text-primary"
          data-cy="project-task-reset-filters"
        >
          Reset filters
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
