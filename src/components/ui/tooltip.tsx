"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"
import { TOOLTIP_DELAY_DURATION_MS } from "@/constants/ui"

export const TOOLTIP_PREF_STORAGE_KEY = "asap:tooltips-enabled"
export const TOOLTIP_PREF_EVENT = "asap:tooltip-preference-change"

const TooltipPreferenceContext = React.createContext<boolean>(true)

function readTooltipPreference() {
  if (typeof window === "undefined") {
    return true
  }
  try {
    const raw = window.localStorage.getItem(TOOLTIP_PREF_STORAGE_KEY)
    if (raw === "false") return false
    return true
  } catch {
    return true
  }
}

export function loadTooltipPreference() {
  return readTooltipPreference()
}

export function setTooltipPreference(enabled: boolean) {
  if (typeof window === "undefined") {
    return
  }
  try {
    window.localStorage.setItem(TOOLTIP_PREF_STORAGE_KEY, enabled ? "true" : "false")
    window.dispatchEvent(new Event(TOOLTIP_PREF_EVENT))
  } catch {
    // ignore storage failures
  }
}

function useTooltipPreferenceState() {
  const [enabled, setEnabled] = React.useState<boolean>(readTooltipPreference)

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    const handleChange = () => setEnabled(readTooltipPreference())
    window.addEventListener(TOOLTIP_PREF_EVENT, handleChange)
    return () => window.removeEventListener(TOOLTIP_PREF_EVENT, handleChange)
  }, [])

  return enabled
}

function TooltipProvider({
  delayDuration = TOOLTIP_DELAY_DURATION_MS,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider> & { enabled?: boolean }) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip(props: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const enabled = useTooltipPreferenceState()
  const effectiveProps = enabled
    ? props
    : { ...props, defaultOpen: false, open: false, delayDuration: 0 }

  return (
    <TooltipPreferenceContext.Provider value={enabled}>
      <TooltipProvider delayDuration={enabled ? props.delayDuration : 0}>
        <TooltipPrimitive.Root data-slot="tooltip" {...effectiveProps} />
      </TooltipProvider>
    </TooltipPreferenceContext.Provider>
  )
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  const enabled = React.useContext(TooltipPreferenceContext)
  if (!enabled) {
    return null
  }
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs font-semibold shadow-[0_2px_5px_rgba(30,23,60,0.35)]",
          className
        )}
        style={{
          backgroundColor: "var(--tooltip-bg)",
          color: "var(--tooltip-foreground)",
        }}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow
          className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]"
          style={{
            backgroundColor: "var(--tooltip-bg)",
            fill: "var(--tooltip-bg)",
          }}
        />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
