"use client"

import * as React from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, PencilLine, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"

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
}: TaskCardProps) {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [isHovering, setIsHovering] = React.useState(false)
  const [menuTriggerHover, setMenuTriggerHover] = React.useState(false)
  const [departmentListOpen, setDepartmentListOpen] = React.useState(false)

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

  const baseColor = primaryDepartment?.color ?? "#FFFFFF"
  const backgroundPalette = hasDepartments
    ? departmentDetails.map((dept) => dept.color)
    : [baseColor]
  const darkColorCount = backgroundPalette.filter((color) => isHexColorDark(color)).length
  const isBackgroundDark = darkColorCount >= Math.ceil(backgroundPalette.length / 2)
  const hoverColor = !hasMultipleDepartments
    ? adjustHexBrightness(baseColor, isBackgroundDark ? 35 : -25)
    : undefined
  const gradientBackground = hasMultipleDepartments
    ? `linear-gradient(135deg, ${departmentDetails
        .map((dept, index) => {
          const start = Math.round((index / departmentDetails.length) * 100)
          const end = Math.round(((index + 1) / departmentDetails.length) * 100)
          return `${dept.color} ${start}% ${end}%`
        })
        .join(", ")})`
    : undefined
  const textColor = hasMultipleDepartments
    ? isBackgroundDark
      ? "#FFFFFF"
      : "#2F2766"
    : primaryDepartment
      ? primaryDepartment.textColor ?? (isHexColorDark(baseColor) ? "#FFFFFF" : "#2F2766")
      : "#2F2766"
  const borderColor = primaryDepartment
    ? adjustHexBrightness(primaryDepartment.color, -35)
    : "#CFC2F6"

  React.useEffect(() => {
    if (!hasMultipleDepartments) {
      setDepartmentListOpen(false)
    }
  }, [hasMultipleDepartments])

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

  const shouldUseContrastMenuColor = hasDepartments && isBackgroundDark
  const menuButtonStyle =
    !menuOpen && !menuTriggerHover && shouldUseContrastMenuColor ? { color: textColor } : undefined
  const menuIconStyle =
    !menuOpen && !menuTriggerHover && shouldUseContrastMenuColor ? { color: textColor } : undefined
  const menuIconClassName = cn("size-5 transition-colors duration-200", menuOpen ? "text-primary" : "")

  const cardStyle = hasDepartments
    ? {
        background: hasMultipleDepartments
          ? gradientBackground
          : isHovering && hoverColor
            ? hoverColor
            : baseColor,
        color: textColor,
        borderColor,
        filter: hasMultipleDepartments && isHovering ? "brightness(1.05)" : undefined,
      }
    : undefined

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

  const textStyle = hasDepartments ? { color: textColor } : undefined

  const departmentBadgeClassName = cn(
    "relative inline-flex items-center justify-center rounded-full border-2 px-4 py-2 text-xs font-semibold shadow-[0_3px_0_rgba(144,122,214,0.2)]",
    hasDepartments ? "" : "bg-[#F6F0FF] text-[#2F2766] border-[#CFC2F6]"
  )

  const departmentBadgeStyle = hasDepartments
    ? hasMultipleDepartments
      ? {
          backgroundColor: "rgba(255,255,255,0.25)",
          color: textColor,
          borderColor: "rgba(255,255,255,0.4)",
        }
      : {
          backgroundColor: baseColor,
          color: textColor,
          borderColor,
        }
    : undefined

  return (
    <article
      className={cardClassName}
      style={cardStyle}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2 pr-16" style={textStyle}>
        <div className="flex flex-wrap items-center gap-3 text-current">
          <h3 className="text-xl font-black">{title}</h3>
          <span className="text-sm font-medium">Deadline : {deadline}</span>
        </div>
        <p className="text-sm font-medium text-current opacity-90">Assigned to : {assigneeLabel}</p>
      </div>
      <div className="flex items-center gap-4 self-start sm:self-auto">
        {hasDepartments ? (
          <div
            className={departmentBadgeClassName}
            style={{
              minWidth: "9rem",
              ...(departmentBadgeStyle ?? {}),
            }}
            onMouseEnter={() => {
              if (hasMultipleDepartments) {
                setDepartmentListOpen(true)
              }
            }}
            onMouseLeave={() => {
              if (hasMultipleDepartments) {
                setDepartmentListOpen(false)
              }
            }}
          >
            <span>
              {hasMultipleDepartments ? `${departmentDetails.length} Departments` : primaryDepartment?.name}
            </span>
            {hasMultipleDepartments ? (
              <div
                className={cn(
                  "absolute left-0 top-full z-30 mt-2 w-60 rounded-3xl border border-primary/30 bg-white/95 px-4 py-3 text-left text-sm font-semibold text-[#2F2766] shadow-[0_16px_30px_rgba(39,36,66,0.2)] transition-all duration-150",
                  departmentListOpen ? "pointer-events-auto opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-2"
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">
                  {departmentDetails.length} departments
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {departmentDetails.map((dept) => (
                    <li key={dept.id} className="flex items-center gap-2">
                      <span
                        className="size-3 rounded-full border border-black/10"
                        style={{ backgroundColor: dept.color }}
                      />
                      <span>{dept.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
        <span className={statusChipClassName}>{statusLabel}</span>
        {onEdit || onDelete ? (
          <DropdownMenu
            modal={false}
            onOpenChange={(open) => {
              setMenuOpen(open)
              if (!open) {
                setIsHovering(false)
              }
            }}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={menuButtonClassName}
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
              className="w-48 rounded-2xl border-none bg-button-background p-2 text-base text-button-foreground shadow-[0_16px_30px_rgba(39,36,66,0.15)]"
              data-task-menu="true"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {onEdit ? (
                <DropdownMenuItem
                  data-task-menu="true"
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
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </article>
  )
}
