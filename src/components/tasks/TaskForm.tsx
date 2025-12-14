"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { TASK_STATUS_LABEL, TASK_STATUS_STYLE, type TaskStatus } from "@/app/projects/[projectId]/task/data"
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Palette,
  Plus,
  Wand2,
  X,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TOOLTIP_DELAY_DURATION_MS } from "@/constants/ui"
import { addMinutes, format } from "date-fns"
import { usePreferences } from "@/contexts/preferences"
import type { DepartmentLayoutOption } from "@/types/preferences"
import { cn } from "@/lib/utils"
import {
  computeTextColor,
  getContrastingTextColor,
  sanitizeHexColor,
} from "@/utils/colors"
import { Calendar } from "../ui/calendar"
import { HexColorPicker } from "react-colorful"
import { DEFAULT_TASK_CARD_COLOR, QUICK_COLOR_OPTIONS } from "@/constants/task-colors"
import { SearchField } from "@/components/ui/search-field"
import { ScrollArea, ScrollBar, type ScrollAreaViewportElement } from "@/components/ui/scroll-area"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/ui/responsive-modal"
import { useForm } from "react-hook-form"
import type { DateRange } from "react-day-picker"

type TaskFormValues = {
  title: string
  detail: string
  assigneeIds: string[]
  startDate: string
  deadline: string
  status: TaskStatus
  cardColor: string
}

type TaskColorMenuProps = {
  cardColor: string
  colorMenuOpen: boolean
  colorMode: "presets" | "custom"
  quickColorPreview: string | null
  setColorMenuOpen: React.Dispatch<React.SetStateAction<boolean>>
  setColorMode: React.Dispatch<React.SetStateAction<"presets" | "custom">>
  setCardColor: (color: string) => void
  setQuickColorPreview: (value: string | null) => void
}

function TaskColorMenu({
  cardColor,
  colorMenuOpen,
  colorMode,
  quickColorPreview,
  setColorMenuOpen,
  setColorMode,
  setCardColor,
  setQuickColorPreview,
}: TaskColorMenuProps) {
  const selectionColor = quickColorPreview ?? cardColor ?? DEFAULT_TASK_CARD_COLOR

  const handleColorSelect = React.useCallback(
    (value: string) => {
      setCardColor(value)
      setQuickColorPreview(null)
      setColorMenuOpen(false)
    },
    [setCardColor, setColorMenuOpen, setQuickColorPreview]
  )

  const handleCustomColorChange = React.useCallback(
    (value: string) => {
      const normalized = sanitizeHexColor(value)
      setCardColor(normalized)
      setQuickColorPreview(normalized)
    },
    [setCardColor, setQuickColorPreview]
  )

  return (
    <DropdownMenu
      open={colorMenuOpen}
      onOpenChange={(open) => {
        setColorMenuOpen(open)
        if (!open) {
          setColorMode("presets")
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-between gap-3 rounded-[1.5rem] border border-primary/30 bg-white/90 px-4 py-2 text-sm font-semibold text-primary shadow-[0_6px_0_rgba(144,122,214,0.15)] transition hover:border-primary hover:bg-primary/10 focus-visible:outline-none"
        >
          <span className="inline-flex items-center gap-2 select-none">
            <Palette className="size-4" />
            Select Color
          </span>
          <span
            className="size-6 rounded-full border-2 border-primary/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
            style={{ backgroundColor: selectionColor }}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="dialog-scroll w-64 max-h-[24rem] overflow-y-auto rounded-3xl border border-primary/30 bg-white p-4 text-sm font-semibold text-primary shadow-[0_16px_30px_rgba(72,68,110,0.2)]"
      >
        <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-primary/70">
          <span className="inline-flex items-center gap-1">
            {colorMode === "presets" ? <Palette className="size-3.5" /> : <Wand2 className="size-3.5" />}
            {colorMode === "presets" ? "Quick Colors" : "Custom Color"}
          </span>
          <button
            type="button"
            className="rounded-full border border-transparent px-3 py-1 text-[0.7rem] font-semibold text-primary transition hover:border-primary/30 hover:bg-primary/5"
            onClick={() => setColorMode((mode) => (mode === "presets" ? "custom" : "presets"))}
          >
            {colorMode === "presets" ? (
              <span className="inline-flex items-center gap-1">
                <Wand2 className="size-3.5" />
                Custom
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Palette className="size-3.5" />
                Palette
              </span>
            )}
          </button>
        </div>
        {colorMode === "presets" ? (
          <div className="flex flex-wrap gap-2">
            {QUICK_COLOR_OPTIONS.map((option) => {
              const normalizedValue = sanitizeHexColor(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  className="flex size-10 items-center justify-center rounded-2xl border-2 border-primary/20 text-[0.65rem] font-semibold transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0"
                  style={{ backgroundColor: option.value }}
                  onMouseEnter={() => setQuickColorPreview(normalizedValue)}
                  onMouseLeave={() =>
                    setQuickColorPreview(
                      quickColorPreview === normalizedValue ? null : quickColorPreview
                    )
                  }
                  onFocus={() => setQuickColorPreview(normalizedValue)}
                  onBlur={() =>
                    setQuickColorPreview(
                      quickColorPreview === normalizedValue ? null : quickColorPreview
                    )
                  }
                  onClick={() => handleColorSelect(normalizedValue)}
                  aria-label={`Select ${option.label}`}
                />
              )
            })}
          </div>
        ) : (
          <div className="dialog-scroll max-h-[18rem] space-y-2 overflow-auto rounded-2xl border border-primary/20 bg-white/60 p-3">
            <div className="rounded-2xl bg-white p-2">
              <HexColorPicker
                color={selectionColor}
                onChange={handleCustomColorChange}
                style={{ width: "100%", height: "160px" }}
              />
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type TaskAssigneeSectionProps = {
  assigneeLayout: DepartmentLayoutOption
  assigneeIds: string[]
  assigneeMetaLookup: Record<string, AssigneeMeta>
  assigneeOptions: TaskAssigneeOption[]
  assigneePickerOpen: boolean
  setAssigneePickerOpen: React.Dispatch<React.SetStateAction<boolean>>
  assigneeSearch: string
  setAssigneeSearch: React.Dispatch<React.SetStateAction<string>>
  assigneeDepartmentFilters: string[]
  assigneeRoleFilters: string[]
  priorityRoleFilterActive: boolean
  availableDepartmentFilters: string[]
  availableRoleFilters: string[]
  filteredAssigneeOptions: AssigneeMeta[]
  handleSelectAssignee: (memberId: string) => void
  toggleDepartmentFilter: (name: string) => void
  toggleRoleFilter: (role: string) => void
  resetAssigneeFilters: () => void
  handleRemoveAssignee: (memberId: string) => void
  handleAssigneeDragStart: (event: React.DragEvent<HTMLSpanElement>, index: number) => void
  handleAssigneeDragOver: (event: React.DragEvent<HTMLSpanElement>, index: number) => void
  handleAssigneeDrop: (event: React.DragEvent<HTMLSpanElement>, index: number) => void
  handleAssigneeDragEnd: () => void
  draggingIndex: number | null
  dragOverIndex: number | null
  togglePriorityRoleFilter: () => void
}

function TaskAssigneeSection({
  assigneeLayout,
  assigneeIds,
  assigneeMetaLookup,
  assigneeOptions,
  assigneePickerOpen,
  setAssigneePickerOpen,
  assigneeSearch,
  setAssigneeSearch,
  assigneeDepartmentFilters,
  assigneeRoleFilters,
  priorityRoleFilterActive,
  availableDepartmentFilters,
  availableRoleFilters,
  filteredAssigneeOptions,
  handleSelectAssignee,
  toggleDepartmentFilter,
  toggleRoleFilter,
  resetAssigneeFilters,
  handleRemoveAssignee,
  handleAssigneeDragStart,
  handleAssigneeDragOver,
  handleAssigneeDrop,
  handleAssigneeDragEnd,
  draggingIndex,
  dragOverIndex,
  togglePriorityRoleFilter,
}: TaskAssigneeSectionProps) {
  const assigneeChipBaseClass =
    "flex items-center gap-2 rounded-full border-2 font-semibold select-none cursor-grab active:cursor-grabbing transition-colors"
  const assigneeChipStyles: Record<DepartmentLayoutOption, string> = {
    compact: `${assigneeChipBaseClass} px-5 py-2 text-sm`,
    fullWidth: `${assigneeChipBaseClass} h-14 w-full justify-between pl-12 pr-4 text-base`,
  }
  const assigneeChipClass = assigneeChipStyles[assigneeLayout]
  const chipActionButtonClass =
    "grid size-6 place-items-center rounded-full bg-white/30 text-current transition hover:bg-white/40 disabled:opacity-40 disabled:hover:bg-white/30"
  const assigneeContainerClass =
    assigneeLayout === "fullWidth" ? "mt-3 flex flex-col gap-3" : "mt-3 flex flex-wrap gap-3"

  return (
    <div className="space-y-4 text-current">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold w-27 mt-3">Assigned To :</span>
        </div>
        <Popover
          open={assigneePickerOpen && assigneeOptions.length > 0}
          onOpenChange={(open) => {
            if (assigneeOptions.length === 0) {
              setAssigneePickerOpen(false)
              return
            }
            setAssigneePickerOpen(open)
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={assigneeOptions.length === 0}
              className="group flex w-full max-w-sm select-none items-center justify-between rounded-full border-2 border-primary/40 bg-white px-6 py-3 text-base font-semibold text-primary transition hover:border-primary hover:bg-primary hover:text-white focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                <Plus className="size-5" />
                <span className="flex items-center gap-2">
                  Add Member
                  <span className="inline-flex min-w-[1.5rem] justify-center rounded-full border border-primary bg-white px-2 py-0.5 text-xs font-bold text-primary group-hover:border-white group-hover:bg-white group-hover:text-primary">
                    {assigneeIds.length}
                  </span>
                </span>
              </span>
              <ChevronRight className="size-4" />
            </button>
          </PopoverTrigger>
          {assigneeOptions.length > 0 ? (
          <PopoverContent
            align="start"
            side="right"
            sideOffset={8}
            className="w-[22rem] h-[30rem] rounded-3xl border border-primary/40 bg-white px-4 py-4 text-sm font-semibold text-[#2F2766] shadow-[0_16px_30px_rgba(39,36,66,0.15)]"
          >
            <div className="flex h-full flex-col gap-4">
              <SearchField
                wrapperClassName="relative"
                value={assigneeSearch}
                    onChange={(event) => setAssigneeSearch(event.target.value)}
                    placeholder="Search member"
                  />
                {(availableDepartmentFilters.length > 0 || availableRoleFilters.length > 0) && (
              <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-primary/60">
                    {availableDepartmentFilters.length > 0 ? (
                      <div>
                        <p className="text-[0.65rem]">Departments</p>
                        <div className="mt-2 flex flex-wrap gap-2 normal-case text-[0.7rem] font-semibold">
                          {availableDepartmentFilters.map((dept) => {
                            const active = assigneeDepartmentFilters.includes(dept)
                            return (
                              <button
                                type="button"
                                key={dept}
                                onClick={() => toggleDepartmentFilter(dept)}
                                className={cn(
                                  "rounded-full border px-3 py-1 text-xs transition focus:outline-none",
                                  active
                                    ? "border-primary bg-primary text-white"
                                    : "border-primary/30 bg-white text-primary hover:border-primary"
                                )}
                              >
                                <span className="block max-w-[7rem] truncate text-left">{dept}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ) : null}
                    {availableRoleFilters.length > 0 ? (
                      <div className="pt-1">
                        <p className="text-[0.65rem]">Roles</p>
                        <div className="mt-2 flex flex-wrap gap-2 normal-case text-[0.7rem] font-semibold">
                          {availableRoleFilters.map((role) => {
                            const active = assigneeRoleFilters.includes(role)
                            return (
                              <button
                                type="button"
                                key={role}
                                onClick={() => toggleRoleFilter(role)}
                                className={cn(
                                  "rounded-full border px-3 py-1 text-xs transition focus:outline-none",
                                  active
                                    ? "border-primary bg-primary text-white"
                                    : "border-primary/30 bg-white text-primary hover:border-primary"
                                )}
                              >
                                {role}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ) : null}
                    {assigneeDepartmentFilters.length > 0 || assigneeRoleFilters.length > 0 ? (
                      <button
                        type="button"
                        onClick={resetAssigneeFilters}
                        className="text-[0.65rem] font-semibold uppercase tracking-wide text-primary hover:text-primary/80"
                      >
                        Reset filters
                      </button>
                    ) : null}
                  </div>
                )}
                <div className="asap-scroll [scrollbar-gutter:stable] flex-1 space-y-1 overflow-y-auto pr-1">
                  {filteredAssigneeOptions.length > 0 ? (
                    filteredAssigneeOptions.map((option) => {
                      const isSelected = assigneeIds.includes(option.id)
                      return (
                        <button
                          type="button"
                          key={option.id}
                          onClick={() =>
                            isSelected ? handleRemoveAssignee(option.id) : handleSelectAssignee(option.id)
                          }
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition",
                            isSelected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-transparent bg-white hover:border-primary/30 hover:bg-primary/5"
                          )}
                        >
                          <span className="flex flex-col">
                            <span className="flex items-center gap-2">
                              <span
                                className="size-3 rounded-full border border-black/10"
                                style={{ backgroundColor: option.chipBackground }}
                              />
                              <span>{option.displayLabel}</span>
                            </span>
                            {option.departmentName ? (
                              <span className="pl-5 text-xs font-medium text-primary/70">{option.departmentName}</span>
                            ) : null}
                          </span>
                          {isSelected ? <Check className="size-4 shrink-0" /> : null}
                        </button>
                      )
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-primary/30 px-4 py-6 text-center text-sm font-medium text-primary/60">
                      {assigneeOptions.length === 0 ? "No members available" : "No members match your search"}
                    </div>
                  )}
                </div>
              </div>
            </PopoverContent>
          ) : null}
        </Popover>
        {assigneeOptions.length === 0 ? (
          <p className="text-sm font-medium text-destructive/80">No project members can be assigned yet.</p>
        ) : null}
      </div>
      <div className={assigneeContainerClass}>
        {assigneeIds.length > 0 ? (
          assigneeIds.map((item, index) => {
            const meta = assigneeMetaLookup[item]
            const isDragOver = dragOverIndex === index
            const isDragging = draggingIndex === index
            const chipClassName = [
              assigneeChipClass,
              isDragOver ? "ring-2 ring-primary/40" : "",
              isDragging ? "cursor-grabbing opacity-80" : "",
            ]
              .filter(Boolean)
              .join(" ")
            const chipStyle = meta
              ? {
                  backgroundColor: meta.chipBackground,
                  color: meta.chipTextColor,
                  borderColor: meta.chipBorderColor,
                }
              : undefined

            return (
              <Tooltip key={item} delayDuration={TOOLTIP_DELAY_DURATION_MS}>
                <TooltipTrigger asChild>
                  <span
                    className={chipClassName}
                    style={chipStyle}
                    draggable
                    aria-grabbed={isDragging}
                    onDragStart={(event) => handleAssigneeDragStart(event, index)}
                    onDragOver={(event) => handleAssigneeDragOver(event, index)}
                    onDrop={(event) => handleAssigneeDrop(event, index)}
                    onDragEnd={handleAssigneeDragEnd}
                  >
                    <span className="inline-flex items-center gap-2">
                      <GripVertical
                        className={cn("size-4 text-current", assigneeLayout === "fullWidth" ? "" : "opacity-70")}
                        aria-hidden
                      />
                      <span className="max-w-[12rem] truncate">{meta?.displayLabel ?? "Unknown member"}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleRemoveAssignee(item)
                        }}
                        className={`${chipActionButtonClass} rounded-full`}
                        aria-label={`Remove ${meta?.displayLabel ?? "member"}`}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  align="start"
                  sideOffset={8}
                  className="w-56 rounded-3xl border border-primary/40 bg-white/95 p-4 text-sm font-semibold text-[#2F2766] shadow-[0_16px_30px_rgba(39,36,66,0.15)]"
                  style={{ backgroundColor: "#ffffff", color: "#2F2766" }}
                >
                  <p className="text-base font-bold text-[#2F2766]">
                    {meta?.username ?? meta?.label ?? "Unknown member"}
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">
                    {meta?.roleLabel ?? meta?.role ?? "Member"}
                  </p>
                  {meta?.departmentName ? (
                    <p className="text-xs text-primary/70">Department: {meta.departmentName}</p>
                  ) : null}
                </TooltipContent>
              </Tooltip>
            )
          })
        ) : (
          <div className="min-h-[4rem] rounded-3xl border-2 border-dashed border-primary/30 bg-white/60 px-5 py-4 text-sm font-medium text-primary/70">
            No members assigned yet.
          </div>
        )}
      </div>
    </div>
  )
}
type TaskAssigneeOption = {
  id: string
  label: string
  username?: string | null
  fullName?: string | null
  role: string
  departmentName: string | null
  departmentColor: string | null
  departmentTextColor: string | null
  roleLabel?: string | null
}

type AssigneeMeta = TaskAssigneeOption & {
  roleLabel: string | null
  displayLabel: string
  searchText: string
  chipBackground: string
  chipTextColor: string
  chipBorderColor: string
}

type TaskFormProps = {
  heading: string
  submitLabel: string
  initialValues: TaskFormValues
  onSubmit: (values: TaskFormValues) => Promise<void> | void
  submitting?: boolean
  showStatus?: boolean
  className?: string
  assigneeOptions: TaskAssigneeOption[]
}

const DEADLINE_YEAR_MIN = 1900
const DEADLINE_YEAR_MAX = 2100

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Project Owner",
  HEADER: "Header",
  MEMBER: "Member",
}

const PROMINENT_ROLE_SET = new Set(["OWNER", "HEADER"])

function normalizeHex(value?: string | null) {
  if (!value) {
    return null
  }
  const sanitized = sanitizeHexColor(value)
  return sanitized.length === 7 ? sanitized : null
}

function adjustHexBrightness(hex: string, amount: number) {
  const normalized = normalizeHex(hex)
  if (!normalized) {
    return "#CFC2F6"
  }
  const clamp = (value: number) => Math.max(0, Math.min(255, value))
  const r = clamp(parseInt(normalized.slice(1, 3), 16) + amount)
  const g = clamp(parseInt(normalized.slice(3, 5), 16) + amount)
  const b = clamp(parseInt(normalized.slice(5, 7), 16) + amount)
  const toHex = (value: number) => value.toString(16).padStart(2, "0")
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min
  }
  return Math.min(max, Math.max(min, value))
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function parseTime(value: string | null | undefined) {
  if (!value) {
    return null
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  const segments = trimmed.split(":")
  if (segments.length < 2) {
    return null
  }
  const [hoursRaw, minutesRaw] = segments
  const hours = Number(hoursRaw)
  const minutes = Number(minutesRaw)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null
  }
  const safeHours = clampNumber(Math.trunc(hours), 0, 23)
  const safeMinutes = clampNumber(Math.trunc(minutes), 0, 59)
  return { hours: safeHours, minutes: safeMinutes }
}

function parseTimeFlexible(value: string | null | undefined) {
  if (!value) {
    return null
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  if (trimmed.includes(":")) {
    const [rawHours, rawMinutes = ""] = trimmed.split(":")
    const minutes = rawMinutes || "00"
    return parseTime(`${rawHours}:${minutes}`)
  }
  const digits = trimmed.replace(/\D/g, "")
  if (!digits) {
    return null
  }
  if (digits.length <= 2) {
    const padded = `${digits.padStart(1, "0")}:${"00"}`
    return parseTime(padded)
  }
  const hours = digits.slice(0, digits.length - 2)
  const minutes = digits.slice(-2)
  return parseTime(`${hours}:${minutes}`)
}

function parseDeadline(value: string | null | undefined): Date | null {
  if (!value) {
    return null
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  const normalized = trimmed.replace(/-/g, "/").replace("T", " ")
  const segments = normalized
    .split(/\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
  if (segments.length === 0) {
    return null
  }
  const [datePortion, ...rest] = segments
  const dateParts = datePortion.split("/").map((part) => part.trim())
  const timePortion = rest.join(" ")
  if (dateParts.length !== 3) {
    return null
  }
  const [dayRaw, monthRaw, yearRaw] = dateParts
  const day = Number(dayRaw)
  const month = Number(monthRaw) - 1
  const year = Number(yearRaw)
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
    return null
  }
  const safeYear = clampNumber(Math.trunc(year), DEADLINE_YEAR_MIN, DEADLINE_YEAR_MAX)
  const safeMonthIndex = clampNumber(Math.trunc(month), 0, 11)
  const maxDays = daysInMonth(safeYear, safeMonthIndex)
  const safeDay = clampNumber(Math.trunc(day), 1, maxDays)
  const candidate = new Date(safeYear, safeMonthIndex, safeDay)
  const parsedTime = parseTime(timePortion)
  if (parsedTime) {
    candidate.setHours(parsedTime.hours, parsedTime.minutes, 0, 0)
  } else {
    candidate.setHours(0, 0, 0, 0)
  }
  return candidate
}

function composeDeadlineInput(dateText: string, timeText: string) {
  const datePart = dateText.trim()
  const timePart = timeText.trim()
  if (datePart && timePart) {
    return `${datePart} ${timePart}`
  }
  return datePart || ""
}

function getDeadlineParts(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ""
  const parsed = parseDeadline(trimmed)
  if (parsed) {
    const includesTime = trimmed.split(/\s+/).length > 1
    return {
      parsed,
      dateText: format(parsed, "dd/MM/yyyy"),
      timeText: includesTime ? format(parsed, "HH:mm") : "",
    }
  }
  if (!trimmed) {
    return { parsed: null, dateText: "", timeText: "" }
  }
  const [datePart, ...timePart] = trimmed.split(/\s+/)
  return {
    parsed: null,
    dateText: datePart ?? "",
    timeText: timePart.join(" "),
  }
}

type BuildDateTimeInputOptions = {
  date?: Date | null
  fallbackDate?: Date | null
  dateText: string
  timeText: string
  defaultTime?: string
}

function buildDateTimeInput({
  date,
  fallbackDate,
  dateText,
  timeText,
  defaultTime = "00:00",
}: BuildDateTimeInputOptions) {
  const selectedDate = date ?? fallbackDate
  if (selectedDate) {
    const formattedDate = dateText.trim() || format(selectedDate, "dd/MM/yyyy")
    const formattedTime =
      timeText.trim() || format(selectedDate, "HH:mm") || defaultTime
    return `${formattedDate} ${formattedTime}`
  }
  const trimmedDateText = dateText.trim()
  if (!trimmedDateText) {
    return ""
  }
  const formattedTime = timeText.trim() || defaultTime
  return `${trimmedDateText} ${formattedTime}`
}

const TASK_STATUS_COLORS: Record<TaskStatus, { background: string; text: string }> = {
  SUBMITTED: {
    background: "var(--task-status-submitted-bg)",
    text: "var(--task-status-submitted-text)",
  },
  IN_PROGRESS: {
    background: "var(--task-status-in-progress-bg)",
    text: "var(--task-status-in-progress-text)",
  },
  BLOCKED: {
    background: "var(--task-status-blocked-bg)",
    text: "var(--task-status-blocked-text)",
  },
}

const TIME_SCROLLER_HEIGHT_CLASS = "h-[8rem]"

type TaskTimeScrollerColumnProps = {
  label: string
  target: "start" | "end"
  parsedTime: { hours: number; minutes: number } | null
  timeOptions: { hours: number[]; minutes: number[] }
  hoursViewportRef: React.RefObject<ScrollAreaViewportElement | null>
  minutesViewportRef: React.RefObject<ScrollAreaViewportElement | null>
  handleTimeSlotSelect: (
    type: "hour" | "minute",
    value: number,
    target: "start" | "end"
  ) => void
  timeScrollerHeightClass: string
}

function TaskTimeScrollerColumn({
  label,
  target,
  parsedTime,
  timeOptions,
  hoursViewportRef,
  minutesViewportRef,
  handleTimeSlotSelect,
  timeScrollerHeightClass,
}: TaskTimeScrollerColumnProps) {
  const containerClassName =
    target === "start"
      ? "order-2 flex w-full max-w-[9rem] flex-col gap-4 text-primary lg:order-1 lg:self-stretch"
      : "order-3 flex w-full max-w-[9rem] flex-col gap-4 text-primary lg:self-stretch"

  const renderScroller = (
    title: string,
    type: "hour" | "minute",
    values: number[],
    selectedValue: number | undefined,
    viewportRef: React.RefObject<ScrollAreaViewportElement | null>
  ) => (
    <div>
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-primary/60">{title}</p>
      <ScrollArea
        className={cn(
          "asap-scroll mt-2 w-full rounded-[1rem] border border-primary/20 bg-white/90 shadow-[0_4px_0_rgba(144,122,214,0.15)] overflow-x-scroll",
          timeScrollerHeightClass
        )}
        viewportRef={viewportRef}
      >
        <div className="flex flex-col gap-2 p-1 pr-1">
          {values.map((value) => (
            <Button
              key={value}
              type="button"
              data-scroll-target={`${target}-${type}-${value}`}
              variant={selectedValue === value ? "default" : "ghost"}
              className={cn(
                "w-full rounded-full border border-primary/20 text-sm font-semibold",
                selectedValue === value
                  ? "bg-primary text-primary-foreground"
                  : "text-primary hover:bg-primary/10"
              )}
              onClick={() => handleTimeSlotSelect(type, value, target)}
            >
              {value.toString().padStart(2, "0")}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  )

  return (
    <div className={containerClassName}>
      <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">{label}</p>
      {renderScroller("Hours", "hour", timeOptions.hours, parsedTime?.hours ?? undefined, hoursViewportRef)}
      {renderScroller(
        "Minutes",
        "minute",
        timeOptions.minutes,
        parsedTime?.minutes ?? undefined,
        minutesViewportRef
      )}
    </div>
  )
}

type TaskTimelinePanelProps = {
  formattedStartLabel: string
  formattedDeadlineLabel: string
  handleResetDeadline: () => void
  startDateTime: Date | null
  deadline: Date | null
  calendarSelectedRange: DateRange | undefined
  calendarMonth: Date
  handleCalendarSelect: (range?: DateRange) => void
  setCalendarMonth: React.Dispatch<React.SetStateAction<Date>>
  timeOptions: { hours: number[]; minutes: number[] }
  parsedStartTime: { hours: number; minutes: number } | null
  parsedDeadlineTime: { hours: number; minutes: number } | null
  handleTimeSlotSelect: (
    type: "hour" | "minute",
    value: number,
    target: "start" | "end"
  ) => void
  startHourViewportRef: React.RefObject<ScrollAreaViewportElement | null>
  startMinuteViewportRef: React.RefObject<ScrollAreaViewportElement | null>
  endHourViewportRef: React.RefObject<ScrollAreaViewportElement | null>
  endMinuteViewportRef: React.RefObject<ScrollAreaViewportElement | null>
  todayStart: Date
  timeScrollerHeightClass: string
  startTimeText: string
  deadlineTimeText: string
  onFillDateTimeValues: (startValue: string, deadlineValue: string) => void
  calendarRange: DateRange | undefined
}

type FillDateTimeForm = {
  startDate: Date
  endDate: Date
}

function TaskTimelinePanel({
  formattedStartLabel,
  formattedDeadlineLabel,
  handleResetDeadline,
  startDateTime,
  deadline,
  calendarSelectedRange,
  calendarMonth,
  handleCalendarSelect,
  setCalendarMonth,
  timeOptions,
  parsedStartTime,
  parsedDeadlineTime,
  handleTimeSlotSelect,
  startHourViewportRef,
  startMinuteViewportRef,
  endHourViewportRef,
  endMinuteViewportRef,
  todayStart,
        timeScrollerHeightClass,
        startTimeText,
        deadlineTimeText,
        onFillDateTimeValues,
        calendarRange,
      }: TaskTimelinePanelProps) {
  const [modalOpen, setModalOpen] = React.useState(false)
  const fillDefaults = React.useMemo<FillDateTimeForm>(() => {
    const baseStart = calendarRange?.from ?? startDateTime ?? todayStart
    const baseEnd = calendarRange?.to ?? deadline ?? addMinutes(baseStart, 30)
    return {
      startDate: new Date(baseStart),
      endDate: new Date(baseEnd),
    }
  }, [calendarRange?.from, calendarRange?.to, startDateTime, deadline, todayStart])
  const fillForm = useForm<FillDateTimeForm>({
    defaultValues: fillDefaults,
  })
  const handleModalSubmit = fillForm.handleSubmit((values) => {
    onFillDateTimeValues(format(values.startDate, "HH:mm"), format(values.endDate, "HH:mm"))
    setModalOpen(false)
  })
  React.useEffect(() => {
    if (modalOpen) {
      fillForm.reset(fillDefaults)
    }
  }, [fillDefaults, fillForm, modalOpen])
  return (
    <div className="mt-0 flex w-full flex-col gap-10 pr-6 md:pr-3">
      <div className="flex w-full max-w-full flex-col gap-6 rounded-[3rem] border-2 border-primary/40 bg-white/90 px-6 py-6 shadow-[0_6px_0_rgba(144,122,214,0.2)]">
        <div className="rounded-[2rem] border border-primary/20 bg-white/80 p-5">
          <div className="grid gap-2">
            <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Startline</p>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleResetDeadline}
                  className="inline-flex select-none items-center rounded-full border border-primary/30 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-primary transition hover:border-primary hover:bg-primary/10"
                >
                  Reset date &amp; time
                </button>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/60 text-right">Deadline</p>
            </div>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
              <p className="text-base font-semibold text-[#2F2766]">{formattedStartLabel}</p>
              <p className="text-base font-semibold text-[#2F2766] text-right">{formattedDeadlineLabel}</p>
            </div>
          </div>
        </div>
        <div className="relative flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,0.35fr)_minmax(0,1fr)_minmax(0,0.35fr)] lg:items-start">
          <TaskTimeScrollerColumn
            label="Startline"
            target="start"
            parsedTime={parsedStartTime}
            timeOptions={timeOptions}
            hoursViewportRef={startHourViewportRef}
            minutesViewportRef={startMinuteViewportRef}
            handleTimeSlotSelect={handleTimeSlotSelect}
            timeScrollerHeightClass={timeScrollerHeightClass}
          />
          <Calendar
            className="order-1 w-full rounded-[1.5rem] min-h-[22rem] lg:order-2"
            classNames={{
              day: "relative w-full h-full p-0 text-center [&:last-child[data-selected=true]_button]:rounded-r-md group/day aspect-square select-none text-primary data-[outside=true]:text-primary/40",
            }}
            mode="range"
            selected={calendarSelectedRange}
            month={calendarMonth}
            onSelect={handleCalendarSelect}
            onMonthChange={setCalendarMonth}
            captionLayout="dropdown"
            fromYear={todayStart.getFullYear()}
            toYear={2100}
            fixedWeeks
            initialFocus
            fromDate={todayStart}
          />
          <TaskTimeScrollerColumn
            label="Deadline"
            target="end"
            parsedTime={parsedDeadlineTime}
            timeOptions={timeOptions}
            hoursViewportRef={endHourViewportRef}
            minutesViewportRef={endMinuteViewportRef}
            handleTimeSlotSelect={handleTimeSlotSelect}
            timeScrollerHeightClass={timeScrollerHeightClass}
          />
        </div>
      </div>
    </div>
  )
}

export function TaskForm({
  heading,
  submitLabel,
  initialValues,
  onSubmit,
  submitting = false,
  showStatus = true,
  className,
  assigneeOptions,
}: TaskFormProps) {
  const todayStart = React.useMemo(() => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
  }, [])
  const clampCalendarDate = React.useCallback((value: Date) => {
    const normalized = new Date(value)
    normalized.setHours(0, 0, 0, 0)
    return normalized
  }, [])
  const defaultStartDateTime = React.useMemo(() => new Date(), [])
  const defaultDeadlineDateTime = React.useMemo(() => {
    const next = new Date(defaultStartDateTime)
    next.setHours(23, 59, 0, 0)
    return next
  }, [defaultStartDateTime])

  const initialDeadlineParts = React.useMemo(
    () => getDeadlineParts(initialValues.deadline),
    [initialValues.deadline]
  )
  const initialStartParts = React.useMemo(
    () => getDeadlineParts(initialValues.startDate),
    [initialValues.startDate]
  )

  const [title, setTitle] = React.useState(initialValues.title ?? "")
  const [detail, setDetail] = React.useState(initialValues.detail ?? "")
  const [cardColor, setCardColor] = React.useState(() =>
    sanitizeHexColor(initialValues.cardColor ?? DEFAULT_TASK_CARD_COLOR)
  )
  const [colorMenuOpen, setColorMenuOpen] = React.useState(false)
  const [colorMode, setColorMode] = React.useState<"presets" | "custom">("presets")
  const [quickColorPreview, setQuickColorPreview] = React.useState<string | null>(null)
  const { profile } = usePreferences()
  const assigneeLayout: DepartmentLayoutOption = profile?.departmentLayout ?? "fullWidth"

  React.useEffect(() => {
    if (!colorMenuOpen) {
      setQuickColorPreview(null)
    }
  }, [colorMenuOpen])

  const [assigneeIds, setAssigneeIds] = React.useState<string[]>(
    initialValues.assigneeIds.length > 0 ? [...initialValues.assigneeIds] : []
  )
  const [assigneePickerOpen, setAssigneePickerOpen] = React.useState(false)
  const [assigneeSearch, setAssigneeSearch] = React.useState("")
  const [assigneeDepartmentFilters, setAssigneeDepartmentFilters] = React.useState<string[]>([])
  const [assigneeRoleFilters, setAssigneeRoleFilters] = React.useState<string[]>([])
  const [priorityRoleFilterActive, setPriorityRoleFilterActive] = React.useState(false)
  const fallbackStartDate = React.useMemo(
    () => clampCalendarDate(defaultStartDateTime),
    [clampCalendarDate, defaultStartDateTime]
  )
  const initialStartDate = clampCalendarDate(initialStartParts.parsed ?? fallbackStartDate)
  const [startDateTime, setStartDateTime] = React.useState<Date | null>(() => {
    if (initialStartParts.parsed) {
      return new Date(initialStartParts.parsed)
    }
    if (initialValues.startDate.trim()) {
      const fallback = new Date(initialStartDate)
      const parsed = parseTime(initialStartParts.timeText ?? "")
      fallback.setHours(parsed?.hours ?? 0, parsed?.minutes ?? 0, 0, 0)
      return fallback
    }
    return new Date(defaultStartDateTime)
  })
  const [deadline, setDeadline] = React.useState<Date | null>(() => {
    if (initialDeadlineParts.parsed) {
      return new Date(initialDeadlineParts.parsed)
    }
    if (initialValues.deadline.trim()) {
      const fallback = new Date(initialStartDate)
      fallback.setHours(0, 0, 0, 0)
      return fallback
    }
    return new Date(defaultDeadlineDateTime)
  })
  const [calendarRange, setCalendarRange] = React.useState<DateRange | undefined>(() => {
    const fallbackEndDate = initialValues.deadline.trim() ? initialStartDate : defaultDeadlineDateTime
    const endDate = clampCalendarDate(initialDeadlineParts.parsed ?? fallbackEndDate)
    return { from: initialStartDate, to: endDate }
  })
  const [calendarMonth, setCalendarMonth] = React.useState<Date>(() => {
    return initialStartParts.parsed ?? new Date(defaultStartDateTime)
  })
  const [startDateText, setStartDateText] = React.useState(() => {
    if (initialStartParts.dateText) {
      return initialStartParts.dateText
    }
    if (initialValues.startDate.trim()) {
      return format(initialStartDate, "dd/MM/yyyy")
    }
    return format(defaultStartDateTime, "dd/MM/yyyy")
  })
  const [deadlineDateText, setDeadlineDateText] = React.useState(() => {
    if (initialDeadlineParts.dateText) {
      return initialDeadlineParts.dateText
    }
    if (initialValues.deadline.trim()) {
      return format(initialStartDate, "dd/MM/yyyy")
    }
    return format(defaultDeadlineDateTime, "dd/MM/yyyy")
  })
  const [startTimeText, setStartTimeText] = React.useState(() => {
    if (initialStartParts.timeText) {
      return initialStartParts.timeText
    }
    if (initialValues.startDate.trim()) {
      return "00:00"
    }
    return format(defaultStartDateTime, "HH:mm")
  })
  const [deadlineTimeText, setDeadlineTimeText] = React.useState(() => {
    if (initialDeadlineParts.timeText) {
      return initialDeadlineParts.timeText
    }
    if (initialValues.deadline.trim()) {
      return "00:00"
    }
    return format(defaultDeadlineDateTime, "HH:mm")
  })
  const [status, setStatus] = React.useState<TaskStatus>(initialValues.status)
  const [draggingIndex, setDraggingIndex] = React.useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null)
  const draggedAssigneeIndexRef = React.useRef<number | null>(null)
  const calendarSelectedRange = calendarRange
  type AssigneeMeta = TaskAssigneeOption & {
    roleLabel: string | null
    displayLabel: string
    searchText: string
    chipBackground: string
    chipTextColor: string
    chipBorderColor: string
  }

  const { assigneeMetaLookup, assigneeMetaList } = React.useMemo(() => {
    const lookup: Record<string, AssigneeMeta> = {}
    const list: AssigneeMeta[] = []
    assigneeOptions.forEach((option) => {
      const normalizedBackground = normalizeHex(option.departmentColor) ?? "#F6F0FF"
      const normalizedTextColor = normalizeHex(option.departmentTextColor)
      const chipTextColor = normalizedTextColor ?? getContrastingTextColor(normalizedBackground)
      const roleLabel =
        option.roleLabel ??
        (ROLE_LABELS[option.role] ?? option.role ?? null)
      const displayLabel =
        option.role && PROMINENT_ROLE_SET.has(option.role)
          ? roleLabel
            ? `${option.label} (${roleLabel})`
            : option.label
          : option.label
      const meta: AssigneeMeta = {
        ...option,
        roleLabel,
        displayLabel,
        chipBackground: normalizedBackground,
        chipTextColor,
        chipBorderColor: adjustHexBrightness(normalizedBackground, -35),
        searchText: [
          option.label,
          option.username ?? "",
          option.fullName ?? "",
          option.departmentName ?? "",
          roleLabel ?? "",
        ]
          .join(" ")
          .toLowerCase(),
      }
      lookup[option.id] = meta
      list.push(meta)
    })
    return { assigneeMetaLookup: lookup, assigneeMetaList: list }
  }, [assigneeOptions])

  const availableDepartmentFilters = React.useMemo(() => {
    const names = assigneeMetaList
      .map((option) => option.departmentName)
      .filter((name): name is string => Boolean(name))
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
  }, [assigneeMetaList])

  const availableRoleFilters = React.useMemo(() => {
    const roles = assigneeMetaList
      .map((option) => option.roleLabel)
      .filter((role): role is string => Boolean(role))
    return Array.from(new Set(roles)).sort((a, b) => a.localeCompare(b))
  }, [assigneeMetaList])

  const filteredAssigneeOptions = React.useMemo(() => {
    const normalizedSearch = assigneeSearch.trim().toLowerCase()
    return assigneeMetaList.filter((option) => {
      const matchesSearch = !normalizedSearch || option.searchText.includes(normalizedSearch)
      const matchesDepartment =
        assigneeDepartmentFilters.length === 0 ||
        (option.departmentName ? assigneeDepartmentFilters.includes(option.departmentName) : false)
      const matchesRole =
        assigneeRoleFilters.length === 0 ||
        (option.roleLabel ? assigneeRoleFilters.includes(option.roleLabel) : false)
      const matchesPriority = !priorityRoleFilterActive
        ? true
        : option.role === "HEADER" || option.role === "OWNER"
      return matchesSearch && matchesDepartment && matchesRole && matchesPriority
    })
  }, [
    assigneeDepartmentFilters,
    assigneeMetaList,
    assigneeRoleFilters,
    priorityRoleFilterActive,
    assigneeSearch,
  ])

  React.useEffect(() => {
    setTitle(initialValues.title ?? "")
    setDetail(initialValues.detail ?? "")
    setAssigneeIds(initialValues.assigneeIds.length > 0 ? [...initialValues.assigneeIds] : [])
    const parts = getDeadlineParts(initialValues.deadline)
    setDeadline(parts.parsed)
    setDeadlineDateText(parts.dateText)
    setDeadlineTimeText(parts.timeText)
    setCalendarMonth(parts.parsed ?? new Date())
    setStatus(initialValues.status)
  }, [assigneeOptions, initialValues])

  React.useEffect(() => {
    if (!assigneePickerOpen) {
      setAssigneeSearch("")
    }
  }, [assigneePickerOpen])

  React.useEffect(() => {
    setAssigneeDepartmentFilters((prev) =>
      prev.filter((dept) => availableDepartmentFilters.includes(dept))
    )
  }, [availableDepartmentFilters])

  React.useEffect(() => {
    setAssigneeRoleFilters((prev) => prev.filter((role) => availableRoleFilters.includes(role)))
    if (!availableRoleFilters.some((role) => role === "Header" || role === "Project Owner")) {
      setPriorityRoleFilterActive(false)
    }
  }, [availableRoleFilters])

  const handleSelectAssignee = React.useCallback((memberId: string) => {
    setAssigneeIds((prev) => {
      if (prev.includes(memberId)) {
        return prev
      }
      return [...prev, memberId]
    })
  }, [])

  const toggleDepartmentFilter = (name: string) => {
    setAssigneeDepartmentFilters((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    )
  }

  const toggleRoleFilter = (role: string) => {
    setAssigneeRoleFilters((prev) =>
      prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role]
    )
  }

  const resetAssigneeFilters = () => {
    setAssigneeDepartmentFilters([])
    setAssigneeRoleFilters([])
    setPriorityRoleFilterActive(false)
  }

  const handleRemoveAssignee = (value: string) => {
    setAssigneeIds((prev) => prev.filter((item) => item !== value))
  }

  const handleAssigneeDragStart = (
    event: React.DragEvent<HTMLSpanElement>,
    index: number
  ) => {
    draggedAssigneeIndexRef.current = index
    setDraggingIndex(index)
    event.dataTransfer?.setData("text/plain", String(index))
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move"
    }
  }

  const handleAssigneeDragOver = (
    event: React.DragEvent<HTMLSpanElement>,
    index: number
  ) => {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move"
    }
    if (draggedAssigneeIndexRef.current === index) {
      if (dragOverIndex !== null) {
        setDragOverIndex(null)
      }
      return
    }
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleAssigneeDrop = (
    event: React.DragEvent<HTMLSpanElement>,
    index: number
  ) => {
    event.preventDefault()
    const fromIndex = draggedAssigneeIndexRef.current
    if (fromIndex === null || fromIndex === index) {
      setDragOverIndex(null)
      setDraggingIndex(null)
      draggedAssigneeIndexRef.current = null
      return
    }

    setAssigneeIds((prev) => {
      if (
        fromIndex < 0 ||
        fromIndex >= prev.length ||
        index < 0 ||
        index >= prev.length
      ) {
        return prev
      }
      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(index, 0, moved)
      return updated
    })

    setDragOverIndex(null)
    setDraggingIndex(null)
    draggedAssigneeIndexRef.current = null
  }
  const handleCalendarSelect = (range?: DateRange) => {
    if (!range?.from) {
      setCalendarRange(undefined)
      setStartDateTime(null)
      setStartDateText("")
      setStartTimeText("")
      setDeadline(null)
      setDeadlineDateText("")
      setDeadlineTimeText("")
    setCalendarMonth(new Date(todayStart))
      return
    }
    let boundedFrom = clampCalendarDate(range.from)
    let boundedTo = range.to ? clampCalendarDate(range.to) : boundedFrom
    if (boundedTo < boundedFrom) {
      boundedTo = boundedFrom
    }

    const startTimeParsed = parseTime(startTimeText) ?? { hours: 0, minutes: 0 }
    const nextStartDate = new Date(boundedFrom)
    nextStartDate.setHours(startTimeParsed.hours, startTimeParsed.minutes, 0, 0)
    setStartDateTime(nextStartDate)
    setStartDateText(format(boundedFrom, "dd/MM/yyyy"))
    if (!startTimeText) {
      setStartTimeText(format(nextStartDate, "HH:mm"))
    }

    const deadlineTimeParsed = parseTime(deadlineTimeText)
    const nextEndDate = new Date(boundedTo)
    if (deadlineTimeParsed) {
      nextEndDate.setHours(deadlineTimeParsed.hours, deadlineTimeParsed.minutes, 0, 0)
    } else if (deadline) {
      nextEndDate.setHours(deadline.getHours(), deadline.getMinutes(), 0, 0)
    } else {
      nextEndDate.setHours(23, 59, 0, 0)
    }

    if (nextEndDate < nextStartDate) {
      nextEndDate.setTime(nextStartDate.getTime())
      boundedTo = boundedFrom
    }

    setDeadline(nextEndDate)
    setDeadlineDateText(format(boundedTo, "dd/MM/yyyy"))
    if (!deadlineTimeText) {
      setDeadlineTimeText(format(nextEndDate, "HH:mm"))
    }
    setCalendarRange({ from: boundedFrom, to: boundedTo })
  }

  const timeOptions = React.useMemo(
    () => ({
      hours: Array.from({ length: 24 }, (_, index) => index),
      minutes: Array.from({ length: 60 }, (_, index) => index),
    }),
    []
  )

  const startHourViewportRef = React.useRef<ScrollAreaViewportElement | null>(null)
  const startMinuteViewportRef = React.useRef<ScrollAreaViewportElement | null>(null)
  const endHourViewportRef = React.useRef<ScrollAreaViewportElement | null>(null)
  const endMinuteViewportRef = React.useRef<ScrollAreaViewportElement | null>(null)

  const scrollToTarget = React.useCallback(
    (viewport: ScrollAreaViewportElement | null, selector: string) => {
      if (!viewport) {
        return
      }
      const target = viewport.querySelector(`[data-scroll-target="${selector}"]`) as
        | HTMLElement
        | null
      if (!target) {
        return
      }
      const targetCenter = target.offsetTop + target.offsetHeight / 2
      const viewportCenter = viewport.clientHeight / 2
      const desiredScrollTop = targetCenter - viewportCenter
      const maxScrollTop = viewport.scrollHeight - viewport.clientHeight
      viewport.scrollTop = Math.max(0, Math.min(desiredScrollTop, Math.max(0, maxScrollTop)))
    },
    []
  )

  const scrollTimePanels = React.useCallback(
    (startHour: number, startMinute: number, endHour: number, endMinute: number) => {
      requestAnimationFrame(() => {
        scrollToTarget(startHourViewportRef.current, `start-hour-${startHour}`)
        scrollToTarget(startMinuteViewportRef.current, `start-minute-${startMinute}`)
        scrollToTarget(endHourViewportRef.current, `end-hour-${endHour}`)
        scrollToTarget(endMinuteViewportRef.current, `end-minute-${endMinute}`)
      })
    },
    [scrollToTarget]
  )

  const handleResetDeadline = () => {
    const now = new Date()
    const resetStart = clampCalendarDate(now)
    const resetEnd = new Date(resetStart)
    resetEnd.setDate(resetEnd.getDate() + 1)
    resetEnd.setHours(0, 0, 0, 0)

    const adjustedEnd = new Date(resetEnd)
    adjustedEnd.setHours(23, 59, 0, 0)
    setCalendarRange({ from: resetStart, to: clampCalendarDate(adjustedEnd) })
    setCalendarMonth(resetStart)

    setStartDateTime(new Date(now))
    setStartDateText(format(now, "dd/MM/yyyy"))
    setStartTimeText(format(now, "HH:mm"))

    setDeadline(new Date(resetEnd))
    setDeadlineDateText(format(resetEnd, "dd/MM/yyyy"))
    setDeadlineTimeText(format(resetEnd, "HH:mm"))
  }

  const parsedStartTime = React.useMemo(() => {
    const parsed = parseTime(startTimeText)
    if (!calendarRange?.from || parsed === null) {
      return null
    }
    return parsed
  }, [calendarRange?.from, startTimeText])

  const parsedDeadlineTime = React.useMemo(() => {
    const parsed = parseTime(deadlineTimeText)
    if (!calendarRange?.to || parsed === null) {
      return null
    }
    return parsed
  }, [calendarRange?.to, deadlineTimeText])

  const handleTimeSlotSelect = React.useCallback(
    (type: "hour" | "minute", value: number, target: "start" | "end") => {
      if (target === "start") {
        const currentParsed = parsedStartTime ?? { hours: 0, minutes: 0 }
        const nextHours = type === "hour" ? value : currentParsed.hours
        const nextMinutes = type === "minute" ? value : currentParsed.minutes
        const baseDate = startDateTime
          ? new Date(startDateTime)
          : calendarRange?.from
            ? new Date(calendarRange.from)
            : new Date(todayStart)
        baseDate.setHours(nextHours, nextMinutes, 0, 0)

        setStartDateTime(baseDate)
        setStartTimeText(`${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`)
        const fromDate = clampCalendarDate(baseDate)
        let toDate = calendarRange?.to ? clampCalendarDate(calendarRange.to) : fromDate
        if (toDate < fromDate) {
          toDate = fromDate
          const adjustedDeadline = new Date(baseDate)
          setDeadline(adjustedDeadline)
          setDeadlineDateText(format(fromDate, "dd/MM/yyyy"))
          setDeadlineTimeText(format(adjustedDeadline, "HH:mm"))
        }
        setStartDateText(format(fromDate, "dd/MM/yyyy"))
        setCalendarRange({ from: fromDate, to: toDate })
        return
      }

      const currentParsed = parsedDeadlineTime ?? { hours: 0, minutes: 0 }
      const nextHours = type === "hour" ? value : currentParsed.hours
      const nextMinutes = type === "minute" ? value : currentParsed.minutes
      const baseDate =
        (deadline ? new Date(deadline) : undefined) ??
        (calendarRange?.to ? new Date(calendarRange.to) : undefined) ??
        (calendarRange?.from ? new Date(calendarRange.from) : undefined) ??
        new Date(todayStart)
      baseDate.setHours(nextHours, nextMinutes, 0, 0)

      setDeadline(baseDate)
      setDeadlineTimeText(`${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`)
      const toDate = clampCalendarDate(baseDate)
      const fromDate = calendarRange?.from ? clampCalendarDate(calendarRange.from) : toDate
      if (toDate < fromDate) {
        setCalendarRange({ from: fromDate, to: fromDate })
      } else {
        setCalendarRange({ from: fromDate, to: toDate })
      }
      setDeadlineDateText(format(toDate, "dd/MM/yyyy"))
    },
    [calendarRange, deadline, parsedDeadlineTime, parsedStartTime, startDateTime, todayStart]
  )

  React.useEffect(() => {
    const startParsed =
      parseTime(startTimeText) ??
      (startDateTime
        ? {
            hours: startDateTime.getHours(),
            minutes: startDateTime.getMinutes(),
          }
        : null)
    const deadlineParsed =
      parseTime(deadlineTimeText) ??
      (deadline
        ? {
            hours: deadline.getHours(),
            minutes: deadline.getMinutes(),
          }
        : null)
    if (!startParsed || !deadlineParsed) {
      return
    }
    scrollTimePanels(
      startParsed.hours,
      startParsed.minutes,
      deadlineParsed.hours,
      deadlineParsed.minutes
    )
  }, [
    calendarRange?.from,
    calendarRange?.to,
    deadline,
    deadlineTimeText,
    scrollTimePanels,
    startDateTime,
    startTimeText,
  ])

  const handleFillDateTimeValues = React.useCallback(
    (startValue: string, deadlineValue: string) => {
      const parsedStart = parseTimeFlexible(startValue)
      if (parsedStart) {
        handleTimeSlotSelect("hour", parsedStart.hours, "start")
        handleTimeSlotSelect("minute", parsedStart.minutes, "start")
      }
      const parsedDeadline = parseTimeFlexible(deadlineValue)
      if (parsedDeadline) {
        handleTimeSlotSelect("hour", parsedDeadline.hours, "end")
        handleTimeSlotSelect("minute", parsedDeadline.minutes, "end")
      }
    },
    [handleTimeSlotSelect]
  )

  const handleAssigneeDragEnd = () => {
    setDragOverIndex(null)
    setDraggingIndex(null)
    draggedAssigneeIndexRef.current = null
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedAssignees = assigneeIds.filter(
      (item, index, array) => item && array.indexOf(item) === index
    )
    const startDateValue = buildDateTimeInput({
      date: startDateTime,
      fallbackDate: calendarRange?.from ?? null,
      dateText: startDateText,
      timeText: startTimeText,
      defaultTime: "00:00",
    })
    const deadlineValue = buildDateTimeInput({
      date: deadline,
      fallbackDate: calendarRange?.to ?? null,
      dateText: deadlineDateText,
      timeText: deadlineTimeText,
      defaultTime: "00:00",
    })
    onSubmit({
      title: title.trim(),
      detail: detail.trim(),
      assigneeIds: normalizedAssignees,
      startDate: startDateValue,
      deadline: deadlineValue,
      status,
      cardColor,
    })
  }

  const formattedDeadlineLabel =
    calendarRange?.to && deadlineDateText
      ? `${format(calendarRange.to, "EEE, dd MMM yyyy")} • ${(deadlineTimeText.trim() || "00:00")}`
      : "No deadline set"
  const formattedStartLabel =
    calendarRange?.from && startDateText
      ? `${format(calendarRange.from, "EEE, dd MMM yyyy")} • ${(startTimeText.trim() || "00:00")}`
      : "No start date set"
  const TIME_SCROLLER_HEIGHT_CLASS = "h-[8rem]"

  const effectiveFormColor = quickColorPreview ?? cardColor
  const formTextColor = computeTextColor(effectiveFormColor)

  return (
    <div className="grid items-start gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-7 rounded-[3.5rem] border-2 border-primary/30 bg-card-project px-[clamp(2.5rem,4vw,3.75rem)] pb-12 pt-8 shadow-[0_2px_6px_rgba(0,0,0,0.12)] lg:-ml-4 2xl:-ml-6"
        style={{ backgroundColor: effectiveFormColor, color: formTextColor }}
      >
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-current">{heading}</h1>
          <TaskColorMenu
            cardColor={cardColor}
            colorMenuOpen={colorMenuOpen}
            colorMode={colorMode}
            quickColorPreview={quickColorPreview}
            setColorMenuOpen={setColorMenuOpen}
            setColorMode={setColorMode}
            setCardColor={setCardColor}
            setQuickColorPreview={setQuickColorPreview}
          />
        </div>

        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Task Title"
          aria-label="Task Title"
          className="h-12 rounded-full border-2 border-primary/40 bg-white px-5 text-base font-semibold text-[#2F2766] placeholder:text-[#2F2766]/70 focus:border-primary focus:outline-none"
          required />

        <div className="textarea-surface group/textarea overflow-hidden rounded-[1.25rem]">
          <Textarea
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            placeholder="Add detail"
            aria-label="Task detail"
            className="project-detail-scroll min-h-[10rem] w-full resize-y rounded-[inherit] border-none bg-transparent px-6 py-2 text-base shadow-none focus-visible:outline-none focus-visible:ring-0" />
        </div>

        <TaskAssigneeSection
          assigneeLayout={assigneeLayout}
          assigneeIds={assigneeIds}
          assigneeMetaLookup={assigneeMetaLookup}
          assigneeOptions={assigneeOptions}
          assigneePickerOpen={assigneePickerOpen}
          setAssigneePickerOpen={setAssigneePickerOpen}
          assigneeSearch={assigneeSearch}
          setAssigneeSearch={setAssigneeSearch}
          assigneeDepartmentFilters={assigneeDepartmentFilters}
          assigneeRoleFilters={assigneeRoleFilters}
          priorityRoleFilterActive={priorityRoleFilterActive}
          availableDepartmentFilters={availableDepartmentFilters}
          availableRoleFilters={availableRoleFilters}
          filteredAssigneeOptions={filteredAssigneeOptions}
          handleSelectAssignee={handleSelectAssignee}
          toggleDepartmentFilter={toggleDepartmentFilter}
          toggleRoleFilter={toggleRoleFilter}
          resetAssigneeFilters={resetAssigneeFilters}
          handleRemoveAssignee={handleRemoveAssignee}
          handleAssigneeDragStart={handleAssigneeDragStart}
          handleAssigneeDragOver={handleAssigneeDragOver}
          handleAssigneeDrop={handleAssigneeDrop}
          handleAssigneeDragEnd={handleAssigneeDragEnd}
          draggingIndex={draggingIndex}
          dragOverIndex={dragOverIndex}
          togglePriorityRoleFilter={() => setPriorityRoleFilterActive((prev) => !prev)}
        />
        {showStatus ? (
          <div className="space-y-4 text-current">
            <span className="text-lg font-semibold">Task Status :</span>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className={cn(
                      "mt-3 flex h-12 w-full items-center justify-between rounded-full border-2 pl-12 pr-6 text-base font-semibold shadow-[0_6px_0_rgba(144,122,214,0.2)] transition focus-visible:border-primary focus-visible:outline-none has-[>svg]:pl-6 has-[>svg]:pr-6",
                      "border-transparent hover:opacity-90",
                      TASK_STATUS_STYLE[status]
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full border border-primary/30"
                        style={{ backgroundColor: TASK_STATUS_COLORS[status].background }}
                      />
                      <span>{TASK_STATUS_LABEL[status]}</span>
                    </span>
                    <ChevronDown className="size-4 text-current" />
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-52 rounded-3xl border border-primary/40 bg-white px-2 py-2 text-sm font-semibold text-[#2F2766] shadow-[0_10px_30px_rgba(72,68,110,0.2)]"
              >
                {Object.entries(TASK_STATUS_LABEL).map(([value, label]) => {
                  const isActive = value === status
                  const colors = TASK_STATUS_COLORS[value as TaskStatus]
                  return (
                    <DropdownMenuItem
                      key={value}
                      onSelect={() => setStatus(value as TaskStatus)}
                      className="flex items-center justify-between rounded-2xl pl-5 pr-3 py-2 focus:bg-primary/10 focus:text-primary"
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full border border-primary/30"
                          style={{ backgroundColor: colors.background }}
                        />
                        <span className={cn(isActive ? "text-primary" : "text-foreground/70")}>{label}</span>
                      </span>
                      {isActive ? <Check className="size-4 text-primary" /> : null}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={submitting}
            className="inline-flex h-12 items-center rounded-full bg-[#3F3478] px-8 text-base font-semibold text-white shadow-[0_6px_0_rgba(63,52,120,0.3)] transition hover:bg-[#2F2766] disabled:opacity-70"
          >
            {submitLabel}
          </Button>
        </div>
      </form>

      <TaskTimelinePanel
        formattedStartLabel={formattedStartLabel}
        formattedDeadlineLabel={formattedDeadlineLabel}
        handleResetDeadline={handleResetDeadline}
        startDateTime={startDateTime}
        deadline={deadline}
        calendarSelectedRange={calendarSelectedRange}
        calendarMonth={calendarMonth}
        handleCalendarSelect={handleCalendarSelect}
        setCalendarMonth={setCalendarMonth}
        timeOptions={timeOptions}
        parsedStartTime={parsedStartTime}
        parsedDeadlineTime={parsedDeadlineTime}
        handleTimeSlotSelect={handleTimeSlotSelect}
        startHourViewportRef={startHourViewportRef}
        startMinuteViewportRef={startMinuteViewportRef}
        endHourViewportRef={endHourViewportRef}
        endMinuteViewportRef={endMinuteViewportRef}
        startTimeText={startTimeText}
        deadlineTimeText={deadlineTimeText}
        onFillDateTimeValues={handleFillDateTimeValues}
        calendarRange={calendarRange}
        todayStart={todayStart}
        timeScrollerHeightClass={TIME_SCROLLER_HEIGHT_CLASS}
      />
    </div>
  )
}

export type { TaskFormValues, TaskAssigneeOption }
