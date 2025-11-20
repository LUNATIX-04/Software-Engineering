"use client"

import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Palette, PencilLine, Trash2, Wand2, MoreHorizontal } from "lucide-react"
import { HexColorPicker } from "react-colorful"
import { cn } from "@/lib/utils"
import { QUICK_COLOR_OPTIONS } from "@/constants/task-colors"

type ColorControls = {
  colorMode: "presets" | "custom"
  setColorMode: React.Dispatch<React.SetStateAction<"presets" | "custom">>
  normalizedCardColor: string
  customColor: string
  setCustomColor: (value: string) => void
  previewColor: string | null
  setPreviewColor: (value: string | null) => void
  handlePresetColorSelect: (color: string) => void
  commitColorChange: (color: string) => void
}

type TaskCardMenuProps = {
  menuOpen: boolean
  onOpenChange: (open: boolean) => void
  menuButtonClassName: string
  menuButtonStyle?: React.CSSProperties
  menuIconClassName: string
  menuIconStyle?: React.CSSProperties
  title: string
  buildDataCy: (base: string) => string
  onEdit?: () => void
  onDelete?: () => void
  colorControls?: ColorControls
  onTriggerMouseEnter?: () => void
  onTriggerMouseLeave?: () => void
}

export default function TaskCardMenu({
  menuOpen,
  onOpenChange,
  menuButtonClassName,
  menuButtonStyle,
  menuIconClassName,
  menuIconStyle,
  title,
  buildDataCy,
  onEdit,
  onDelete,
  colorControls,
  onTriggerMouseEnter,
  onTriggerMouseLeave,
}: TaskCardMenuProps) {
  const hasColorControls = Boolean(colorControls && colorControls.commitColorChange)

  const handleMenuOpenChange = React.useCallback(
    (open: boolean) => {
      onOpenChange(open)
      if (!open) {
        colorControls?.setColorMode("presets")
        colorControls?.setPreviewColor(null)
      }
    },
    [colorControls, onOpenChange]
  )

  return (
    <DropdownMenu
      modal={false}
      open={menuOpen}
      onOpenChange={handleMenuOpenChange}
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
        onMouseEnter={() => onTriggerMouseEnter?.()}
        onMouseLeave={() => onTriggerMouseLeave?.()}
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
        {hasColorControls ? (
          <>
            <DropdownMenuSeparator />
            <div
              data-task-menu="true"
              className="space-y-3 px-4 py-3 text-left text-sm"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between text-[0.65rem] font-semibold uppercase tracking-wide text-button-foreground">
                <span className="inline-flex items-center gap-1">
                  {colorControls!.colorMode === "presets" ? (
                    <Palette className="size-3.5" />
                  ) : (
                    <Wand2 className="size-3.5" />
                  )}
                  {colorControls!.colorMode === "presets" ? "Quick Colors" : "Custom Color"}
                </span>
                <button
                  type="button"
                  className="rounded-full border border-transparent px-3 py-1 text-[0.7rem] font-semibold text-button-foreground transition hover:border-primary/30 hover:bg-primary/5"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    colorControls?.setColorMode((mode) => (mode === "presets" ? "custom" : "presets"))
                  }}
                >
                  {colorControls!.colorMode === "presets" ? (
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
              {colorControls!.colorMode === "presets" ? (
                <div className="flex flex-wrap gap-2">
                  {QUICK_COLOR_OPTIONS.map((option) => {
                    const isSelected =
                      (option.value.toLowerCase() === colorControls!.normalizedCardColor.toLowerCase())
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
                        onMouseEnter={() => colorControls?.setPreviewColor(option.value)}
                        onMouseLeave={() => colorControls?.setPreviewColor((current) => (current === option.value ? null : current))}
                        onFocus={() => colorControls?.setPreviewColor(option.value)}
                        onBlur={() => colorControls?.setPreviewColor((current) => (current === option.value ? null : current))}
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          colorControls?.handlePresetColorSelect(option.value)
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
                      color={colorControls!.customColor}
                      onChange={(color) => {
                        const normalizedValue = color.trim().startsWith("#") ? color : `#${color}`
                        colorControls?.setCustomColor(normalizedValue)
                        colorControls?.commitColorChange(normalizedValue)
                      }}
                      style={{ width: "100%", height: "160px" }}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
