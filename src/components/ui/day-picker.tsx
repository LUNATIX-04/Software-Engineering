"use client";

"use client";

import { enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";
import type { CustomComponents } from "react-day-picker";
import { DayPicker as ReactDayPicker, getDefaultClassNames } from "react-day-picker";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TDayPickerProps = ComponentProps<typeof ReactDayPicker>;

function DayPicker({
  className,
  classNames: userClassNames,
  showOutsideDays = true,
  ...props
}: TDayPickerProps) {
  const defaultClassNames = getDefaultClassNames();

  const baseClassNames = {
    ...defaultClassNames,
    months: cn(
      "flex flex-col select-none sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
      defaultClassNames.months,
    ),
    month: cn("space-y-4", defaultClassNames.month),
    caption: "flex justify-center pt-1 relative items-center capitalize",
    caption_label: cn("text-sm font-medium", defaultClassNames.caption_label),
    nav: cn(
      "space-x-1 flex items-center justify-between",
      defaultClassNames.nav,
    ),
    button_previous: cn(
      buttonVariants({ variant: "outline" }),
      "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
      defaultClassNames.button_previous,
    ),
    button_next: cn(
      buttonVariants({ variant: "outline" }),
      "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
      defaultClassNames.button_next,
    ),
    month_caption: cn(
      "flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)",
      defaultClassNames.month_caption,
    ),
    dropdowns: cn(
      "w-full flex items-center text-sm font-medium justify-center h-(--cell-size) gap-1.5",
      defaultClassNames.dropdowns,
    ),
    dropdown_root: cn(
      "relative has-focus:border-ring border border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md",
      defaultClassNames.dropdown_root,
    ),
    dropdown: cn(
      "absolute bg-popover inset-0 opacity-0",
      defaultClassNames.dropdown,
    ),
    table: cn("w-full border-collapse", defaultClassNames.table),
    weekdays: cn("flex", defaultClassNames.weekdays),
    weekday: cn(
      "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none",
      defaultClassNames.weekday,
    ),
    week: cn("flex w-full mt-2", defaultClassNames.week),
    week_number_header: cn(
      "select-none w-(--cell-size)",
      defaultClassNames.week_number_header,
    ),
    week_number: cn(
      "text-[0.8rem] select-none text-muted-foreground",
      defaultClassNames.week_number,
    ),
    day: cn(
      "relative w-full h-full p-0 text-center [&:last-child[data-selected=true]_button]:rounded-r-md group/day aspect-square select-none",
      defaultClassNames.day,
    ),
    day_button: cn(
      buttonVariants({ variant: "ghost" }),
      "size-8.5 p-0 font-normal aria-selected:opacity-100 w-full h-full",
      defaultClassNames.day_button,
    ),
    range_start: cn(
      "rounded-l-[1.5rem] bg-[var(--calendar-range)] text-[var(--calendar-range-text)]",
      defaultClassNames.range_start,
    ),
    range_middle: cn(
      "rounded-none bg-[var(--calendar-range)] text-[var(--calendar-range-text)]",
      defaultClassNames.range_middle,
    ),
    range_end: cn(
      "rounded-r-[1.5rem] bg-[var(--calendar-range)] text-[var(--calendar-range-text)]",
      defaultClassNames.range_end,
    ),
    day_selected:
      "bg-primary text-white dark:text-black dark:hover:!text-white",
    day_today: "text-red-600",
    day_outside: "opacity-50 aria-selected:opacity-40",
    day_range_middle:
      "aria-selected:bg-bg-secondary aria-selected:text-t-primary",
    day_hidden: "invisible",
  };

  const combinedClassNames = {
    ...baseClassNames,
    ...userClassNames,
  };

  return (
    <ReactDayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={combinedClassNames}
      components={
        {
          IconLeft: () => <ChevronLeft className="size-4" />,
          IconRight: () => <ChevronRight className="size-4" />,
        } as Partial<CustomComponents>
      }
      locale={enUS}
      {...props}
    />
  );
}

export { DayPicker };
