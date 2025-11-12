"use client"

import * as React from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { MoreHorizontal, Palette, PencilLine, Trash2, Wand2 } from "lucide-react"
import { HexColorPicker } from "react-colorful"

import { cn } from "@/lib/utils"
import { TOOLTIP_DELAY_DURATION_MS } from "@/constants/ui"
import { DEFAULT_TASK_CARD_COLOR, QUICK_COLOR_OPTIONS } from "@/constants/task-colors"
import {
  computeTextColor,
  getContrastingTextColor,
  sanitizeHexColor,
} from "@/utils/colors"

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "")
  if (normalized.length !== 6) {
    return null
  }
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  if ([r, g, b].some((value) => Number.isNaN(value))) {
    return null
  }
  return { r, g, b }
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (value: number) => value.toString(16).padStart(2, "0")
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function adjustHexBrightness(hex: string, amount: number) {
  const rgb = hexToRgb(hex)
  if (!rgb) {
    return hex
  }
  const clamp = (value: number) => Math.max(0, Math.min(255, value))
  return rgbToHex(clamp(rgb.r + amount), clamp(rgb.g + amount), clamp(rgb.b + amount))
}

function getRelativeLuminance(hex: string) {
  const rgb = hexToRgb(hex)
  if (!rgb) {
    return 1
  }
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((value) => {
    const channel = value / 255
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function isHexColorDark(hex: string) {
  return getRelativeLuminance(hex) < 0.5
}

function normalizeHexString(hex: string | null | undefined) {
  if (!hex) return null
  const value = hex.trim().replace("#", "")
  if (value.length !== 6) {
    return null
  }
  return `#${value.toLowerCase()}`
}

type TaskCardDepartment = {
  id: string
  name: string
  color: string
  textColor: string
}

type TaskCardProps = {
  title: string
  deadline: string
  assignees: string[]
  statusLabel: string
  statusClassName?: string
  onOpen?: () => void
  onEdit?: () => void
  onDelete?: () => void
  className?: string
  departments?: TaskCardDepartment[]
  cardColor: string
  cardTextColor: string
  onColorChange?: (color: string) => void
  taskId?: string
  showActions?: boolean
  dataCyIndex?: number
}

export function TaskCard({
  title,
  deadline,
  assignees,
  statusLabel,
  statusClassName,
  onOpen,
  onEdit,
  onDelete,
  className,
  departments,
  cardColor,
  cardTextColor,
  onColorChange,
  taskId,
  showActions = true,
  dataCyIndex,
}: TaskCardProps) {
  const normalizedCardColor = normalizeHexString(cardColor) ?? DEFAULT_TASK_CARD_COLOR

  const [menuOpen, setMenuOpen] = React.useState(false)
  const [isHovering, setIsHovering] = React.useState(false)
  const [menuTriggerHover, setMenuTriggerHover] = React.useState(false)
  const [colorMode, setColorMode] = React.useState<"presets" | "custom">("presets")
  const [customColor, setCustomColor] = React.useState(normalizedCardColor)
  const [previewColor, setPreviewColor] = React.useState<string | null>(null)
  const colorChangeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const dataCySuffix = typeof dataCyIndex === "number" ? `-${dataCyIndex}` : ""
  const buildDataCy = (base: string) => `${base}${dataCySuffix}`

  React.useEffect(() => {
    setCustomColor(normalizedCardColor)
    setPreviewColor(null)
  }, [normalizedCardColor])

  React.useEffect(() => {
    return () => {
      if (colorChangeTimeoutRef.current) {
        clearTimeout(colorChangeTimeoutRef.current)
      }
    }
  }, [])

  React.useEffect(() => {
    if (!menuOpen) {
      setPreviewColor(null)
    }
  }, [menuOpen])

  const commitColorChange = React.useCallback(
    (nextColor: string, options?: { immediate?: boolean }) => {
      if (!onColorChange) {
        return
      }
      const normalized = normalizeHexString(nextColor) ?? DEFAULT_TASK_CARD_COLOR
      if (colorChangeTimeoutRef.current) {
        clearTimeout(colorChangeTimeoutRef.current)
        colorChangeTimeoutRef.current = null
      }
      if (options?.immediate) {
        onColorChange(normalized)
        return
      }
      colorChangeTimeoutRef.current = setTimeout(() => {
        onColorChange(normalized)
        colorChangeTimeoutRef.current = null
      }, 200)
    },
    [onColorChange]
  )

  const handlePresetColorSelect = React.useCallback(
    (color: string) => {
      setCustomColor(color)
      commitColorChange(color, { immediate: true })
      setMenuOpen(false)
    },
    [commitColorChange]
  )

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (!onOpen) {
        return
      }
      const target = event.target
      if (target instanceof Element && target.closest("[data-task-menu='true']")) {
        return
      }
      onOpen()
    },
    [onOpen]
  )

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (!onOpen) {
        return
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        onOpen()
      }
    },
    [onOpen]
  )

  const departmentDetails = React.useMemo(() => {
    if (!departments || departments.length === 0) {
      return []
    }
    return [...departments].sort((a, b) => a.name.localeCompare(b.name))
  }, [departments])

  const hasDepartments = departmentDetails.length > 0
  const hasMultipleDepartments = departmentDetails.length > 1
  const primaryDepartment = hasDepartments ? departmentDetails[0] : null
  const rightmostDepartment = hasDepartments
    ? departmentDetails[departmentDetails.length - 1]
    : null

  const effectiveCardColor = previewColor ?? normalizedCardColor
  const resolvedCardTextColor = computeTextColor(effectiveCardColor, cardTextColor)
  const isBackgroundDark = isHexColorDark(effectiveCardColor)
  const hoverColor = adjustHexBrightness(effectiveCardColor, isBackgroundDark ? 20 : -20)
  const borderColor = adjustHexBrightness(effectiveCardColor, isBackgroundDark ? 10 : -20)

  const assigneeLabel = assignees.length > 0 ? assignees.join(", ") : "—"

  const statusChipClassName = cn(
    "inline-flex min-w-[13rem] mr-11 items-center justify-center rounded-full border-2 border-primary/40 px-5 py-2 text-sm font-semibold shadow-[0_4px_0_rgba(144,122,214,0.2)]",
    statusClassName
  )

  const menuButtonClassName = React.useMemo(
    () =>
      cn(
        "data-task-menu-trigger px-2 py-2 absolute top-8 right-8 rounded-full border transition-colors duration-200 cursor-pointer text-inherit",
        "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-transparent focus-visible:outline-none",
        menuOpen
          ? "border-primary/40 bg-white/90 text-primary shadow-[0_1px_3px_rgba(79,61,152,0.95)]"
          : "border-transparent hover:border-primary/30 hover:bg-white/80 hover:text-primary"
      ),
    [menuOpen]
  )

  const menuButtonStyle =
    !menuOpen && !menuTriggerHover ? { color: resolvedCardTextColor } : undefined
  const menuIconStyle =
    !menuOpen && !menuTriggerHover ? { color: resolvedCardTextColor } : undefined
  const menuIconClassName = cn("size-5 transition-colors duration-200", menuOpen ? "text-primary" : "")

  const cardStyle = {
    background: isHovering ? hoverColor : effectiveCardColor,
    color: resolvedCardTextColor,
    borderColor,
    filter: isHovering ? "brightness(1.02)" : undefined,
  }

  const cardClassName = React.useMemo(
    () =>
      cn(
        "task-card relative flex flex-col gap-4 rounded-[3rem] border-2 border-primary/30 bg-white px-8 py-6 shadow-[0_4px_0_rgba(144,122,214,0.15)] transition-all duration-200 ease-out hover:shadow-[0_6px_0_rgba(144,122,214,0.2)] sm:flex-row sm:items-center sm:gap-6",
        !hasDepartments && (menuOpen || isHovering) ? "bg-primary/10" : "",
        onOpen ? "cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40" : "",
        className
      ),
    [className, hasDepartments, isHovering, menuOpen, onOpen]
  )

  const textStyle = { color: resolvedCardTextColor }

  const departmentBadgeClassName = cn(
    "relative inline-flex items-center justify-center rounded-full border-2 px-4 py-2 text-xs font-semibold shadow-[0_3px_0_rgba(144,122,214,0.2)]",
    hasDepartments ? "" : "bg-[#F6F0FF] text-[#2F2766] border-[#CFC2F6]"
  )

  const departmentBadgeStyle = hasDepartments
    ? hasMultipleDepartments
      ? {
          backgroundColor: "#FFFFFF",
          color: "#1E1A37",
          borderColor: "rgba(47,39,102,0.35)",
        }
      : {
          backgroundColor: primaryDepartment?.color ?? normalizedCardColor,
          color: primaryDepartment?.textColor ?? resolvedCardTextColor,
          borderColor:
            primaryDepartment?.color ?? normalizedCardColor
              ? adjustHexBrightness(
                  primaryDepartment?.color ?? normalizedCardColor,
                  isHexColorDark(primaryDepartment?.color ?? normalizedCardColor) ? 10 : -10
                )
              : borderColor,
        }
    : undefined

  return (
    <article
      className={cardClassName}
      id={taskId ? `task-card-${taskId}` : undefined}
      style={cardStyle}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      data-cy={buildDataCy("task-card")}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2 pr-16" style={textStyle}>
        <div className="flex flex-wrap items-center gap-3 text-current">
          <h3 className="text-xl font-black">{title}</h3>
          <span className="text-sm font-medium">Deadline : {deadline}</span>
        </div>
        <p className="text-sm text-current opacity-90">
          <span>Assigned to :</span>{" "}
          <span className="font-semibold">{assigneeLabel}</span>
        </p>
      </div>
      <div
        className="flex items-center gap-4 self-start sm:self-auto"
        style={{ color: resolvedCardTextColor }}
      >
        {hasDepartments ? (
          hasMultipleDepartments ? (
            <Tooltip delayDuration={TOOLTIP_DELAY_DURATION_MS}>
              <TooltipTrigger asChild>
                <div
                  className={departmentBadgeClassName}
                  style={{
                    minWidth: "9rem",
                    ...(departmentBadgeStyle ?? {}),
                  }}
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <span className="block max-w-[9rem] truncate">
                    {`${departmentDetails.length} Departments`}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={8}
                className="w-60 rounded-3xl border border-primary/30 bg-white/95 px-4 py-3 text-left text-sm font-semibold text-[#2F2766] shadow-[0_16px_30px_rgba(39,36,66,0.2)]"
                style={{ backgroundColor: "#ffffff", color: "#2F2766" }}
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">
                  {departmentDetails.length} departments
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {departmentDetails.map((dept) => (
                    <li key={dept.id} className="flex items-center gap-2">
                      <span
                        className="size-3 flex-shrink-0 rounded-full border border-black/10"
                        style={{ backgroundColor: dept.color }}
                      />
                      <span className="block max-w-[10rem] truncate">{dept.name}</span>
                    </li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div
              className={departmentBadgeClassName}
              style={{
                minWidth: "9rem",
                ...(departmentBadgeStyle ?? {}),
              }}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <span className="block max-w-[9rem] truncate">
                {primaryDepartment?.name}
              </span>
            </div>
          )
        ) : null}
        <span className={statusChipClassName}>{statusLabel}</span>
        {(showActions ?? true) && (onEdit || onDelete || onColorChange) ? (
          <DropdownMenu
            modal={false}
            onOpenChange={(open) => {
              setMenuOpen(open)
              if (!open) {
                setIsHovering(false)
                setColorMode("presets")
              }
            }}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={menuButtonClassName}
                data-cy={buildDataCy("task-card-menu-button")}
                aria-label={`Task ${title} actions`}
                data-task-menu="true"
                style={menuButtonStyle}
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
                onMouseEnter={() => setMenuTriggerHover(true)}
                onMouseLeave={() => setMenuTriggerHover(false)}
              >
                <MoreHorizontal className={menuIconClassName} style={menuIconStyle} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={-4}
              className="w-48 rounded-2xl border-none bg-button-background p-3 text-base text-button-foreground shadow-[0_16px_30px_rgba(39,36,66,0.15)]"
              data-task-menu="true"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {onEdit ? (
                <DropdownMenuItem
                  data-task-menu="true"
                  data-cy={buildDataCy("task-card-menu-edit")}
                  onSelect={(event) => {
                    event.stopPropagation()
                    onEdit()
                  }}
                  className="group text-button-foreground rounded-xl py-3 px-4 text-left text-base hover:bg-button-hover-background hover:text-foreground focus:text-foreground"
                >
                  <span className="inline-flex items-center gap-2">
                    <PencilLine className="size-4 text-current group-hover:text-foreground group-focus:text-foreground" />
                    Edit Task
                  </span>
                </DropdownMenuItem>
              ) : null}
              {onDelete ? (
                <DropdownMenuItem
                  data-task-menu="true"
                  data-cy={buildDataCy("task-card-menu-delete")}
                  onSelect={(event) => {
                    event.stopPropagation()
                    onDelete()
                  }}
                  className="rounded-xl px-4 py-3 text-left text-base text-destructive hover:bg-destructive/20 hover:text-destructive focus:bg-destructive/30 focus:text-destructive"
                >
                  <span className="inline-flex items-center gap-2">
                    <Trash2 className="text-destructive size-4" />
                    Delete Task
                  </span>
                </DropdownMenuItem>
              ) : null}
              {/*
              {onColorChange ? (
                <>
                  <DropdownMenuSeparator />
                  <div
                    data-task-menu="true"
                    className="space-y-3 px-4 py-3 text-left text-sm"
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center justify-between text-[0.65rem] font-semibold uppercase tracking-wide text-button-foreground">
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
                        className="rounded-full border border-transparent px-3 py-1 text-[0.7rem] font-semibold text-button-foreground transition hover:border-primary/30 hover:bg-primary/5"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          setColorMode((mode) => (mode === "presets" ? "custom" : "presets"))
                        }}
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
                          const normalizedOption =
                            normalizeHexString(option.value) ?? DEFAULT_TASK_CARD_COLOR
                          const isSelected = normalizedOption === normalizedCardColor
                          return (
                            <button
                              key={option.value}
                              type="button"
                              data-task-menu="true"
                              aria-pressed={isSelected}
                              className={cn(
                                "flex size-10 items-center justify-center rounded-2xl border-2 text-[0.65rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0",
                                isSelected
                                  ? "border-primary"
                                  : "border-primary/20 hover:border-primary"
                              )}
                              style={{ backgroundColor: option.value }}
                        onMouseEnter={() => {
                          setPreviewColor(normalizedOption)
                        }}
                        onMouseLeave={() => {
                          setPreviewColor((current) =>
                            current === normalizedOption ? null : current
                          )
                        }}
                        onFocus={() => {
                          setPreviewColor(normalizedOption)
                        }}
                        onBlur={() => {
                          setPreviewColor((current) =>
                            current === normalizedOption ? null : current
                          )
                        }}
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          handlePresetColorSelect(normalizedOption)
                        }}
                              aria-label={`Select ${option.label}`}
                            />
                          )
                        })}
                      </div>
                    ) : (
                      <div className="space-y-2 rounded-2xl border border-primary/20 bg-white/60 p-3">
                        <div className="rounded-2xl bg-white p-2">
                          <HexColorPicker
                            color={customColor}
                            onChange={(color) => {
                              const normalizedValue =
                                normalizeHexString(color) ?? DEFAULT_TASK_CARD_COLOR
                              setCustomColor(normalizedValue)
                              commitColorChange(normalizedValue)
                            }}
                            style={{ width: "100%", height: "160px" }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
              */}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </article>
  )
}
