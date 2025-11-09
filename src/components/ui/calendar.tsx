"use client"

import * as React from "react"
import {
  Check,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import {
  DayButton,
  DayPicker,
  getDefaultClassNames,
  type DropdownProps as DayPickerDropdownProps,
} from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  disabled,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const todayStart = React.useMemo(() => {
    const base = new Date()
    base.setHours(0, 0, 0, 0)
    return base
  }, [])
  const disabledDays = React.useMemo(() => {
    const beforeToday = { before: todayStart }
    if (!disabled) {
      return beforeToday
    }
    if (Array.isArray(disabled)) {
      return [...disabled, beforeToday]
    }
    return [disabled, beforeToday]
  }, [disabled, todayStart])
  const defaultClassNames = getDefaultClassNames()
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-background group/calendar p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("en-US", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "flex gap-4 flex-col md:flex-row relative",
          defaultClassNames.months
        ),
        month: cn("flex flex-col w-full gap-4", defaultClassNames.month),
        nav: cn(
          "flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) aria-disabled:opacity-50 p-0 select-none",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) aria-disabled:opacity-50 p-0 select-none",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "w-full flex items-center text-sm font-medium justify-center h-(--cell-size) gap-1.5",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative has-focus:border-ring border border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "absolute bg-popover inset-0 opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "select-none font-medium",
          captionLayout === "label"
            ? "text-sm"
            : "rounded-md pl-2 pr-1 flex items-center gap-1 text-sm h-8 [&>svg]:text-muted-foreground [&>svg]:size-3.5",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none",
          defaultClassNames.weekday
        ),
        week: cn("flex w-full mt-2", defaultClassNames.week),
        week_number_header: cn(
          "select-none w-(--cell-size)",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-[0.8rem] select-none text-muted-foreground",
          defaultClassNames.week_number
        ),
        day: cn(
          "relative w-full h-full p-0 text-center [&:last-child[data-selected=true]_button]:rounded-r-md group/day aspect-square select-none",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-md"
            : "[&:first-child[data-selected=true]_button]:rounded-l-md",
          defaultClassNames.day
        ),
        range_start: cn(
          "rounded-l-[1.5rem] bg-[var(--calendar-range)] text-[var(--calendar-range-text)]",
          defaultClassNames.range_start
        ),
        range_middle: cn(
          "rounded-none bg-[var(--calendar-range)] text-[var(--calendar-range-text)]",
          defaultClassNames.range_middle
        ),
        range_end: cn(
          "rounded-r-[1.5rem] bg-[var(--calendar-range)] text-[var(--calendar-range-text)]",
          defaultClassNames.range_end
        ),
        today: cn(
          "bg-[var(--calendar-today-bg)] text-[var(--calendar-today-text)] rounded-md data-[selected=true]:rounded-none data-[selected=true]:bg-[var(--calendar-range)] data-[selected=true]:text-[var(--calendar-range-text)]",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground/60 aria-selected:text-muted-foreground/40",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-primary/70 opacity-80",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        Dropdown: CalendarDropdown,
        ...components,
      }}
      disabled={disabledDays}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()
  const todayRef = React.useRef<Date | null>(null)
  if (!todayRef.current) {
    const base = new Date()
    base.setHours(0, 0, 0, 0)
    todayRef.current = base
  }
  const isPastDay = React.useMemo(() => {
    const current = todayRef.current
    if (!current) return false
    const compareDate = new Date(day.date)
    compareDate.setHours(0, 0, 0, 0)
    return compareDate < current
  }, [day.date])

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      data-past={isPastDay || undefined}
      className={cn(
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-[var(--calendar-range)] data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[past=true]:text-muted-foreground/35 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 dark:hover:text-accent-foreground flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

function CalendarDropdown({
  options = [],
  value,
  disabled,
  onChange,
  className,
  classNames,
  components,
  ...selectProps
}: DayPickerDropdownProps) {
  const selectedOption = options.find((option) => option.value === value)
  const selectedItemRef = React.useRef<HTMLDivElement | null>(null)
  const [menuOpen, setMenuOpen] = React.useState(false)

  const handleSelect = React.useCallback(
    (nextValue: number) => {
      if (!onChange) return
      const syntheticEvent = {
        target: { value: String(nextValue) },
      } as unknown as React.ChangeEvent<HTMLSelectElement>
      onChange(syntheticEvent)
    },
    [onChange]
  )

  const { ["aria-label"]: ariaLabel, ...restSelectProps } = selectProps

  React.useEffect(() => {
    if (!menuOpen) return
    const frame = requestAnimationFrame(() => {
      selectedItemRef.current?.scrollIntoView({ block: "center", inline: "nearest" })
    })
    return () => cancelAnimationFrame(frame)
  }, [menuOpen, selectedOption?.value])

  return (
    <div className="relative flex items-center gap-2 select-none" data-disabled={disabled}>
      <DropdownMenu onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <button
            type="button"
            className={cn(
              "inline-flex min-w-[4rem] items-center justify-between rounded-full border border-primary/30 bg-white px-4 py-1.5 text-sm font-semibold text-primary shadow-[0_2px_0_rgba(144,122,214,0.2)] transition hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-70",
              className
            )}
            aria-label={ariaLabel}
          >
            <span>{selectedOption?.label ?? "Select"}</span>
            <ChevronDownIcon className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-32 rounded-3xl border border-primary/30 bg-white px-1 py-1 text-sm font-semibold text-primary shadow-[0_12px_24px_rgba(39,36,66,0.2)]"
        >
          <div className="asap-scroll [scrollbar-gutter:stable] max-h-40 overflow-y-auto pr-1">
            {options.map((option) => (
              <DropdownMenuItem
                key={option.value}
                disabled={disabled || option.disabled}
                onSelect={(event) => {
                  event.preventDefault()
                  if (disabled || option.disabled) return
                  handleSelect(option.value)
                }}
                ref={option.value === value ? selectedItemRef : undefined}
                className={cn(
                  "flex items-center justify-between rounded-2xl px-3 py-2 select-none",
                  option.value === value ? "bg-primary/10 text-primary" : ""
                )}
              >
                <span>{option.label}</span>
                {option.value === value ? <Check className="size-4" /> : null}
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <select
        {...restSelectProps}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-hidden="true"
        tabIndex={-1}
        className="sr-only"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export { Calendar, CalendarDayButton }
