"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, Check, GripVertical, Palette, Trash2, Wand2 } from "lucide-react"
import { HexColorPicker } from "react-colorful"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { TOOLTIP_DELAY_DURATION_MS } from "@/constants/ui"
import { DEFAULT_DEPARTMENT_TEXT_COLOR } from "@/constants/departments"
import { cn } from "@/lib/utils"
import type { ProjectDepartmentRecord } from "@/utils/projects/departments"

import DepartmentDeleteDialog from "./DepartmentDeleteDialog"
import type { HeadOption } from "../types"

const CARD_TEXT_COLOR = DEFAULT_DEPARTMENT_TEXT_COLOR
const QUICK_COLOR_OPTIONS = [
  { label: "Red", value: "#FFB3B3" },
  { label: "Orange", value: "#FFC9A9" },
  { label: "Yellow", value: "#FFE6A7" },
  { label: "Green", value: "#93E8B9" },
  { label: "Light Green", value: "#CFF7C4" },
  { label: "Sky", value: "#B7E5FF" },
  { label: "Blue", value: "#A9C7FF" },
  { label: "Purple", value: "#CDB4FF" },
  { label: "Pink", value: "#FFB8E2" },
  { label: "Gray", value: "#D9DEE8" },
  { label: "White", value: "#FFFFFF" },
  { label: "Black", value: "#1E1E1E" },
] as const

type DepartmentCardProps = {
  department: ProjectDepartmentRecord
  memberCount?: number
  headOptions: HeadOption[]
  headLabelMap: Record<string, string>
  onSelectHead: (departmentId: string, value: string | null) => void
  onSelectColor: (departmentId: string, color: string) => void
  onRename: (departmentId: string, name: string) => Promise<boolean>
  onDelete: (departmentId: string) => Promise<void>
  autoEditId?: string | null
  onAutoEditComplete?: () => void
  disabled?: boolean
  headControlsDisabled?: boolean
  colorControlsDisabled?: boolean
  showManageControls?: boolean
  dataCyIndex?: number
}

const blendColorWithWhite = (hexColor: string, blendFactor: number) => {
  const sanitized = hexColor.replace("#", "")
  if (sanitized.length !== 6) {
    return hexColor
  }
  const r = parseInt(sanitized.slice(0, 2), 16)
  const g = parseInt(sanitized.slice(2, 4), 16)
  const b = parseInt(sanitized.slice(4, 6), 16)
  const mix = (c: number) => Math.round(c + (255 - c) * blendFactor)
  return `#${[mix(r), mix(g), mix(b)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`
}

export default function DepartmentCard({
  department,
  memberCount,
  headOptions,
  headLabelMap,
  onSelectHead,
  onSelectColor,
  onRename,
  onDelete,
  autoEditId,
  onAutoEditComplete,
  disabled,
  headControlsDisabled,
  colorControlsDisabled,
  showManageControls = true,
  dataCyIndex,
}: DepartmentCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: department.id,
    disabled,
  })
  const [headMenuOpen, setHeadMenuOpen] = useState(false)
  const [colorMenuOpen, setColorMenuOpen] = useState(false)
  const [colorMode, setColorMode] = useState<"presets" | "custom">("presets")
  const [previewColor, setPreviewColor] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(department.name)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const dataCySuffix = typeof dataCyIndex === "number" ? `-${dataCyIndex}` : ""
  const buildDataCy = (base: string) => `${base}${dataCySuffix}`

  useEffect(() => {
    if (headControlsDisabled) {
      setHeadMenuOpen(false)
    }
  }, [headControlsDisabled])

  useEffect(() => {
    if (!colorMenuOpen) {
      setPreviewColor(null)
    }
  }, [colorMenuOpen])

  const displayColor = previewColor ?? department.color
  const innerTone = useMemo(() => blendColorWithWhite(displayColor, 0.35), [displayColor])

  const textColor = department.textColor || CARD_TEXT_COLOR
  const currentHeadLabel =
    department.head && headLabelMap[department.head]
      ? headLabelMap[department.head]
      : department.head ?? "Nothing"

  useEffect(() => {
    setNameDraft(department.name)
  }, [department.name])

  useEffect(() => {
    if (editingName) {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    }
  }, [editingName])

  useEffect(() => {
    if (autoEditId && autoEditId === department.id) {
      setEditingName(true)
      onAutoEditComplete?.()
    }
  }, [autoEditId, department.id, onAutoEditComplete])

  const handleRename = useCallback(async () => {
    if (disabled) {
      return
    }
    const success = await onRename(department.id, nameDraft)
    if (success) {
      setEditingName(false)
    }
  }, [department.id, disabled, nameDraft, onRename])

  const handleRenameCancel = useCallback(() => {
    setNameDraft(department.name)
    setEditingName(false)
  }, [department.name])

  const handleConfirmDelete = useCallback(async () => {
    setDeleting(true)
    try {
      await onDelete(department.id)
      setDeleteDialogOpen(false)
    } catch {
      // keep dialog open to allow retry
    } finally {
      setDeleting(false)
    }
  }, [department.id, onDelete])

  const handleHeadMenuOpenChange = useCallback(
    (open: boolean) => {
      if (headControlsDisabled) {
        setHeadMenuOpen(false)
        return
      }
      setHeadMenuOpen(open)
    },
    [headControlsDisabled]
  )

  const handleColorMenuOpenChange = useCallback(
    (open: boolean) => {
      if (colorControlsDisabled) {
        setColorMenuOpen(false)
        return
      }
      setColorMenuOpen(open)
      if (!open) {
        setColorMode("presets")
      }
    },
    [colorControlsDisabled]
  )

  return (
    <article
      ref={(node) => {
        setNodeRef(node)
        cardRef.current = node as HTMLDivElement | null
      }}
      id={`department-card-${department.id}`}
      data-cy={buildDataCy("department-card")}
      className="relative flex flex-col gap-6 rounded-[2.75rem] border-2 border-primary/30 bg-white px-6 py-6 shadow-[0_12px_0_rgba(144,122,214,0.15)] transition-shadow hover:shadow-[0_18px_0_rgba(144,122,214,0.2)]"
      style={{
        backgroundColor: displayColor,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.9 : 1,
      }}
    >
      {showManageControls ? (
        <button
          type="button"
          data-cy={buildDataCy("department-reorder-button")}
          className="absolute left-4 top-4 inline-flex size-9 items-center justify-center rounded-full border border-white/40 bg-white/70 text-primary shadow-sm transition hover:bg-white disabled:opacity-60"
          aria-label="Reorder department"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      ) : null}
      {showManageControls ? (
        <button
          type="button"
          data-cy={buildDataCy("department-delete-button")}
          className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full border border-white/40 bg-white/70 text-primary shadow-sm transition hover:bg-white disabled:opacity-60"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={disabled}
          aria-label={`Delete ${department.name}`}
        >
          <Trash2 className="size-4" />
        </button>
      ) : null}
      <Tooltip delayDuration={TOOLTIP_DELAY_DURATION_MS}>
        <TooltipTrigger asChild>
          <header
            className="group px-6 text-center text-xl font-semibold"
            style={{ color: textColor, cursor: disabled ? "default" : "text" }}
            onDoubleClick={() => {
              if (!disabled) {
                setEditingName(true)
              }
            }}
          >
            {editingName ? (
              <Input
                ref={nameInputRef}
                value={nameDraft}
                data-cy={buildDataCy("department-name-input")}
                maxLength={128}
                onChange={(event) => setNameDraft(event.target.value)}
                onBlur={handleRename}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    handleRename()
                  } else if (event.key === "Escape") {
                    event.preventDefault()
                    handleRenameCancel()
                  }
                }}
                className="mx-auto w-full max-w-[calc(100%-3.5rem)] rounded-full border-primary/40 bg-white text-center text-base font-semibold text-primary"
              />
            ) : (
              <span className="mx-auto block max-w-[calc(100%-3.5rem)] break-all break-words whitespace-normal">
                {department.name}
              </span>
            )}
          </header>
        </TooltipTrigger>
        {!editingName && !disabled && (
          <TooltipContent side="top" sideOffset={6}>
            Double-click to rename
          </TooltipContent>
        )}
      </Tooltip>
      <div
        className="flex flex-col gap-4 rounded-[2rem] border-2 border-primary/30 px-5 py-5"
        style={{ backgroundColor: innerTone }}
      >
        <div className="text-sm font-semibold" style={{ color: textColor }}>
          <span>Head :</span>
          <DropdownMenu open={headControlsDisabled ? false : headMenuOpen} onOpenChange={handleHeadMenuOpenChange}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                data-cy={buildDataCy("department-head-trigger")}
                className="mt-2 flex w-full select-none items-center justify-between rounded-full border-2 border-primary/30 bg-white px-4 py-2 text-base font-medium text-primary shadow-[0_6px_0_rgba(144,122,214,0.2)] focus:outline-none disabled:opacity-60"
                disabled={headControlsDisabled}
              >
                <span className={cn(currentHeadLabel === "Nothing" && "text-[#1E1E1E]")}>{currentHeadLabel}</span>
                <ChevronDown className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-48 rounded-3xl border border-primary/40 bg-white px-3 py-2 text-sm font-semibold text-primary shadow-[0_10px_30px_rgba(72,68,110,0.2)]"
            >
              {headOptions.map((headOption) => {
                const isActive = headOption.value === department.head
                return (
                  <DropdownMenuItem
                    key={headOption.value ?? "none"}
                    onSelect={(event) => {
                      if (headControlsDisabled) {
                        event.preventDefault()
                        return
                      }
                      onSelectHead(department.id, headOption.value)
                      setHeadMenuOpen(false)
                    }}
                    className={cn(
                      "flex items-center justify-between rounded-2xl px-3 py-2 focus:bg-primary/10 focus:text-primary",
                      headOption.value === null && "text-[#1E1E1E] focus:text-[#1E1E1E]"
                    )}
                  >
                    <span>{headOption.label}</span>
                    {isActive ? <Check className="size-4 text-primary" /> : null}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-sm font-medium text-center" style={{ color: textColor }}>
          Number of Member : {memberCount ?? department.memberCount}
        </p>

        <DropdownMenu
          open={colorControlsDisabled ? false : colorMenuOpen}
          onOpenChange={handleColorMenuOpenChange}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-cy={buildDataCy("department-color-trigger")}
              className="flex w-full select-none items-center justify-between rounded-full border-2 border-primary/30 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-[0_6px_0_rgba(144,122,214,0.2)] transition hover:border-primary disabled:opacity-60"
              disabled={colorControlsDisabled}
            >
              <span className="inline-flex items-center gap-2">
                <Palette className="size-4" />
                Select Color
              </span>
              <span
                className="size-6 rounded-full border-2 border-primary/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                style={{ backgroundColor: department.color }}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            side="top"
            className="w-64 max-h-[24rem] overflow-y-auto rounded-3xl border border-primary/30 bg-white p-4 text-sm font-semibold text-primary shadow-[0_16px_30px_rgba(72,68,110,0.2)]"
          >
            <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-primary/70">
              <span className="inline-flex items-center gap-1">
                {colorMode === "presets" ? (
                  <Palette className="size-3.5" />
                ) : (
                  <Wand2 className="size-3.5" />
                )}
                {colorMode === "presets" ? "Quick Colors" : "Custom Color"}
              </span>
              <button
                type="button"
                data-cy={buildDataCy("department-color-mode-toggle")}
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
                {QUICK_COLOR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    data-cy={buildDataCy(`department-color-option-${option.value.replace("#", "")}`)}
                    className="flex size-10 items-center justify-center rounded-2xl border-2 border-primary/20 text-[0.65rem] font-semibold transition hover:border-primary"
                    style={{ backgroundColor: option.value }}
                    onMouseEnter={() => setPreviewColor(option.value)}
                    onMouseLeave={() => setPreviewColor(null)}
                    onFocus={() => setPreviewColor(option.value)}
                    onBlur={() => setPreviewColor(null)}
                    onClick={() => {
                      if (disabled) {
                        return
                      }
                      onSelectColor(department.id, option.value)
                      setColorMenuOpen(false)
                    }}
                    aria-label={`Select ${option.label}`}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2 rounded-2xl border border-primary/20 bg-white/60 p-3 max-h-[18rem] overflow-auto">
                <div className="rounded-2xl bg-white p-2">
                  <HexColorPicker
                    color={department.color}
                    onChange={(color) => onSelectColor(department.id, color)}
                    style={{ width: "100%", height: "160px" }}
                  />
                </div>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showManageControls ? (
        <DepartmentDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          departmentName={department.name}
          onConfirm={handleConfirmDelete}
          deleting={deleting}
          dataCySuffix={dataCySuffix}
        />
      ) : null}
    </article>
  )
}
