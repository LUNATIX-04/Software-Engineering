"use client"

import { Filter, ChevronDown, X } from "lucide-react"
import { useCallback, useMemo, useState } from "react"

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
import {
  TASK_STATUS_LABEL,
  type TaskStatus,
} from "@/app/projects/[projectId]/task/data"
import { normalizeHexColorValue } from "@/utils/colors"

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
  exactDepartmentMatch: boolean
  onExactDepartmentMatchChange: (next: boolean) => void
  taskScope: TaskScope
  onTaskScopeChange: (nextScope: TaskScope) => void
  isScopeSelectionDisabled: boolean
  onResetFilters: () => void
  availableColors: string[]
  selectedColors: string[]
  colorLabelMap: Record<string, string>
  onToggleColorFilter: (color: string) => void
  selectedStatuses: TaskStatus[]
  onToggleStatusFilter: (status: TaskStatus, enabled: boolean) => void
}

const normalizeDataCyValue = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const DEFAULT_DEPARTMENT_COLOR = "#D9D6FF"

const TASK_STATUS_OPTIONS = Object.keys(TASK_STATUS_LABEL) as TaskStatus[]
const STATUS_BACKGROUND_MAP: Record<TaskStatus, string> = {
  SUBMITTED: "var(--task-status-submitted-bg)",
  IN_PROGRESS: "var(--task-status-in-progress-bg)",
  BLOCKED: "var(--task-status-blocked-bg)",
}

type FilterMode = "department" | "color"

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
  availableColors,
  selectedColors,
  colorLabelMap,
  onToggleColorFilter,
  selectedStatuses,
  onToggleStatusFilter,
  exactDepartmentMatch,
  onExactDepartmentMatchChange,
  taskScope,
  onTaskScopeChange,
  isScopeSelectionDisabled,
  onResetFilters,
}: TaskFilterMenuProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>("department")
  const normalizedAvailableColors = useMemo(() => {
    const seen = new Set<string>()
    return availableColors
      .map((color) => normalizeHexColorValue(color))
      .filter((color): color is string => Boolean(color))
      .filter((color) => {
        if (seen.has(color)) {
          return false
        }
        seen.add(color)
        return true
      })
  }, [availableColors])
  const { paletteColors, customColors } = useMemo(() => {
    const palette: Array<{ label: string; value: string }> = []
    let customIndex = 0
    normalizedAvailableColors.forEach((color) => {
      const label = colorLabelMap[color]
      if (label) {
        palette.push({ label, value: color })
      } else {
        customIndex += 1
        palette.push({
          label: `Custom Color ${customIndex}`,
          value: color,
        })
      }
    })
    return {
      paletteColors: palette.filter(
        (item) => !item.label.toLowerCase().startsWith("custom color")
      ),
      customColors: palette.filter((item) =>
        item.label.toLowerCase().startsWith("custom color")
      ),
    }
  }, [colorLabelMap, normalizedAvailableColors])
  const renderColorItem = useCallback(
    (color: string, label?: string) => {
      const normalized = color
      const isChecked = selectedColors.includes(normalized)
      const displayLabel = label ?? colorLabelMap[normalized] ?? normalized.toUpperCase()
      return (
        <DropdownMenuCheckboxItem
          key={normalized}
          checked={isChecked}
          onCheckedChange={() => onToggleColorFilter(normalized)}
          onSelect={(event) => event.preventDefault()}
          className="rounded-2xl px-3 py-2 pr-10 text-foreground focus:bg-primary/10 focus:text-primary [&>span:first-child]:left-auto [&>span:first-child]:right-3"
        >
          <span className="inline-flex items-center gap-2">
            <span
              className="size-3 rounded-full border border-black/10"
              style={{ backgroundColor: normalized }}
            />
            <span className="block max-w-[10rem] truncate">{displayLabel}</span>
          </span>
        </DropdownMenuCheckboxItem>
      )
    },
    [colorLabelMap, onToggleColorFilter, selectedColors]
  )
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
                className="select-none text-[0.65rem] font-semibold uppercase tracking-wide text-primary/60"
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
                className="select-none inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-primary/90 px-1 text-xs font-bold text-primary-foreground"
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
        className="dropdown-surface w-60 overflow-hidden rounded-3xl border border-primary/40 bg-white text-sm font-semibold text-primary shadow-[0_10px_30px_rgba(72,68,110,0.2)]"
      >
      <div className="member-filter-scroll max-h-[22rem] overflow-y-auto px-2 py-2">
        <div className="flex items-center justify-between px-3 py-1.5">
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
        <div className="flex items-center justify-end gap-2 px-1 pb-2">
          <button
            type="button"
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition",
              filterMode === "department"
                ? "bg-primary/10 text-primary"
                : "text-primary/70 hover:bg-primary/10 hover:text-primary"
            )}
            onClick={() => setFilterMode("department")}
          >
            Departments
          </button>
          <button
            type="button"
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition",
              filterMode === "color"
                ? "bg-primary/10 text-primary"
                : "text-primary/70 hover:bg-primary/10 hover:text-primary"
            )}
            onClick={() => setFilterMode("color")}
          >
            Colors
          </button>
        </div>
        <DropdownMenuSeparator className="my-1 bg-primary/15" />
        {filterMode === "department" ? (
          <div className="space-y-1">
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
        ) : (
          <div className="member-filter-scroll max-h-[22rem] overflow-y-auto space-y-2 px-2 py-1">
            {paletteColors.map((item) => renderColorItem(item.value, item.label))}
            {paletteColors.length === 0 && customColors.length === 0 ? (
              <div className="px-2 py-3 text-xs font-semibold uppercase tracking-wide text-primary/60">
                No colors available
              </div>
            ) : null}
            {customColors.length > 0
              ? customColors.map((item) => renderColorItem(item.value, item.label))
              : null}
          </div>
        )}
        <DropdownMenuSeparator className="my-2 bg-primary/20" />
        <DropdownMenuLabel
          className="px-3 pt-1 text-[0.65rem] font-semibold uppercase tracking-wide text-primary/60"
          data-cy="project-task-status-label"
        >
          Task status
        </DropdownMenuLabel>
        <div className="space-y-1 px-2 py-1">
          {TASK_STATUS_OPTIONS.map((status) => (
            <DropdownMenuCheckboxItem
              key={status}
              checked={selectedStatuses.includes(status)}
              onCheckedChange={(nextChecked) =>
                onToggleStatusFilter(status, Boolean(nextChecked))
              }
              onSelect={(event) => event.preventDefault()}
              className="rounded-2xl px-3 py-2 pr-10 text-foreground focus:bg-primary/10 focus:text-primary [&>span:first-child]:left-auto [&>span:first-child]:right-3"
              data-cy={`project-task-filter-status-${status.toLowerCase()}`}
            >
              <span className="inline-flex items-center gap-2">
                <span
                  className="size-3 rounded-full border border-black/10"
                  style={{
                    backgroundColor: STATUS_BACKGROUND_MAP[status] ?? "#D9D6FF",
                  }}
                />
                <span className="block max-w-[10rem] truncate">
                  {TASK_STATUS_LABEL[status]}
                </span>
              </span>
            </DropdownMenuCheckboxItem>
          ))}
        </div>
        <DropdownMenuLabel
          className="px-3 pt-1 text-[0.65rem] font-semibold uppercase tracking-wide text-primary/60"
          data-cy="project-task-scope-label"
        >
          Task scope
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={taskScope}
          onValueChange={(value) => onTaskScopeChange(value as TaskScope)}
        >
          <DropdownMenuRadioItem
            value="all"
            onSelect={(event) => event.preventDefault()}
            className="rounded-2xl px-3 py-2 pr-10 focus:bg-primary/10 focus:text-primary [&>span:first-child]:left-auto [&>span:first-child]:right-3"
            data-cy="project-task-scope-all"
          >
            All tasks
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="assignee"
            disabled={isScopeSelectionDisabled}
            onSelect={(event) => event.preventDefault()}
            className="rounded-2xl px-3 py-2 pr-10 focus:bg-primary/10 focus:text-primary [&>span:first-child]:left-auto [&>span:first-child]:right-3"
            data-cy="project-task-scope-my-tasks"
          >
            My Tasks (Assignee)
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="assigner"
            disabled={isScopeSelectionDisabled}
            onSelect={(event) => event.preventDefault()}
            className="rounded-2xl px-3 py-2 pr-10 focus:bg-primary/10 focus:text-primary [&>span:first-child]:left-auto [&>span:first-child]:right-3"
            data-cy="project-task-scope-assigned-tasks"
          >
            Assigned Tasks (Assigner)
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuCheckboxItem
          checked={exactDepartmentMatch}
          onCheckedChange={(checked) => onExactDepartmentMatchChange(Boolean(checked))}
          onSelect={(event) => event.preventDefault()}
          className="rounded-2xl px-3 py-2 pr-10 text-foreground focus:bg-primary/10 focus:text-primary [&>span:first-child]:left-auto [&>span:first-child]:right-3"
          data-cy="project-task-filter-exact-match"
        >
          <span className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">Exact Match</span>
            <span className="text-xs font-normal text-primary/70">
              Require all selected departments
            </span>
          </span>
        </DropdownMenuCheckboxItem>
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
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
