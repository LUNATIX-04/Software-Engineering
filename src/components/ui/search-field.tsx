"use client"

import * as React from "react"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type SearchFieldProps = React.ComponentPropsWithoutRef<typeof Input> & {
  wrapperClassName?: string
  iconClassName?: string
  size?: "default" | "compact"
}

export function SearchField({
  wrapperClassName,
  iconClassName,
  className,
  size = "default",
  ...props
}: SearchFieldProps) {
  const baseInputClass = size === "compact"
    ? "w-full h-11 rounded-full border-2 border-primary/40 bg-white py-2 !pl-10 pr-4 text-sm text-foreground placeholder:text-primary/60 focus:border-primary focus:outline-none"
    : "w-full h-12 rounded-full border-2 border-primary/40 bg-white py-3 pl-12 pr-4 text-sm text-foreground placeholder:text-primary/60 focus:border-primary focus:outline-none"

  const iconPositionClass = size === "compact" ? "left-3" : "left-4"

  return (
    <div className={cn("relative w-full", wrapperClassName)}>
      <Search
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-primary/60",
          iconPositionClass,
          iconClassName
        )}
      />
      <Input {...props} className={cn(baseInputClass, className)} />
    </div>
  )
}
