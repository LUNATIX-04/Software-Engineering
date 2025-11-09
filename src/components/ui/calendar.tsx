"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, type Matcher } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  disablePast?: boolean
}

export function Calendar({
  className,
  classNames,
  components,
  showOutsideDays = true,
  disablePast = false,
  disabled,
  ...restProps
}: CalendarProps) {
  const today = React.useMemo(() => {
    const value = new Date()
    value.setHours(0, 0, 0, 0)
    return value
  }, [])

  const mergedDisabled = React.useMemo(() => {
    if (!disablePast) {
      return disabled
    }
    const matcher: Matcher = { before: today }
    if (!disabled) {
      return matcher
    }
    return Array.isArray(disabled) ? [...disabled, matcher] : [disabled, matcher]
  }, [disablePast, disabled, today])

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-semibold text-[#2F2766]",
        nav: "space-x-1 flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 text-[#2F2766] hover:bg-primary/10"
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 text-[#2F2766] hover:bg-primary/10"
        ),
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.75rem]",
        row: "flex w-full mt-2",
        cell: "relative p-0 text-center text-sm",
        day: cn(
          "h-9 w-9 p-0 font-semibold transition aria-selected:opacity-100",
          "rounded-full text-[#2F2766] hover:bg-primary/10"
        ),
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-white focus:bg-primary focus:text-white",
        day_outside: "text-muted-foreground opacity-60",
        day_today: "font-bold underline decoration-primary/60",
        day_disabled: "text-muted-foreground opacity-40",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...iconProps }) => <ChevronLeft className="size-4" {...iconProps} />,
        IconRight: ({ ...iconProps }) => <ChevronRight className="size-4" {...iconProps} />,
        ...components,
      }}
      disabled={mergedDisabled}
      {...restProps}
    />
  )
}
