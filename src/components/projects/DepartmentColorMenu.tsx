"use client"

import { useEffect, useState } from "react"
import { Palette, Wand2 } from "lucide-react"
import { HexColorPicker } from "react-colorful"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export const QUICK_DEPARTMENT_COLORS = [
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

type QuickColor = { label: string; value: string }

export type DepartmentColorMenuProps = {
  trigger: React.ReactNode
  color: string
  disabled?: boolean
  quickColors?: readonly QuickColor[]
  align?: "start" | "center" | "end"
  side?: "top" | "bottom" | "left" | "right"
  onSelectColor: (color: string) => void
  onPreviewColor?: (color: string | null) => void
  onOpenChange?: (open: boolean) => void
}

export function DepartmentColorMenu({
  trigger,
  color,
  disabled,
  quickColors = QUICK_DEPARTMENT_COLORS,
  align = "end",
  side,
  onSelectColor,
  onPreviewColor,
  onOpenChange,
}: DepartmentColorMenuProps) {
  const [open, setOpen] = useState(false)
  const [colorMode, setColorMode] = useState<"presets" | "custom">("presets")

  const resetState = () => {
    setColorMode("presets")
    onPreviewColor?.(null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      resetState()
    }
    onOpenChange?.(nextOpen)
  }

  useEffect(() => {
    if (!open) {
      resetState()
    }
  }, [open])

  const handleSelectColor = (next: string) => {
    onSelectColor(next)
    onPreviewColor?.(null)
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        side={side}
        className="dialog-scroll w-64 max-h-[24rem] overflow-y-auto rounded-3xl border border-primary/30 bg-white p-4 text-sm font-semibold text-foreground shadow-[0_16px_30px_rgba(72,68,110,0.2)]"
        onEscapeKeyDown={resetState}
        onPointerDownOutside={resetState}
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
            className="rounded-full border border-transparent px-3 py-1 text-[0.7rem] font-semibold text-primary transition hover:border-primary/30 hover:bg-primary/5 disabled:opacity-60"
            disabled={disabled}
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
            {quickColors.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  "flex size-10 items-center justify-center rounded-2xl border-2 border-primary/20 text-[0.65rem] font-semibold transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  color.toLowerCase() === option.value.toLowerCase() ? "ring-2 ring-primary/40" : ""
                )}
                style={{ backgroundColor: option.value }}
                onMouseEnter={() => onPreviewColor?.(option.value)}
                onMouseLeave={() => onPreviewColor?.(null)}
                onFocus={() => onPreviewColor?.(option.value)}
                onBlur={() => onPreviewColor?.(null)}
                onClick={() => handleSelectColor(option.value)}
                aria-label={`Select ${option.label}`}
                disabled={disabled}
              />
            ))}
          </div>
        ) : (
          <div className="dialog-scroll max-h-[18rem] space-y-2 overflow-auto rounded-2xl border border-primary/20 bg-white/60 p-3">
            <div className="rounded-2xl bg-white p-2">
              <HexColorPicker
                color={color}
                onChange={(next) => {
                  if (disabled) return
                  onPreviewColor?.(next)
                  onSelectColor(next)
                }}
                style={{ width: "100%", height: "160px" }}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-semibold text-primary">
              <span>Selected</span>
              <span>{color.toUpperCase()}</span>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default DepartmentColorMenu
