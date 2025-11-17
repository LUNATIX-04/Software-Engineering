"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type TaskPageSizeSelectorProps = {
  pageSize: number
  pageSizeOptions: number[]
  totalCount: number
  onPageSizeChange: (size: number) => void
}

export default function TaskPageSizeSelector({
  pageSize,
  pageSizeOptions,
  totalCount,
  onPageSizeChange,
}: TaskPageSizeSelectorProps) {
  const [menuOpen, setMenuOpen] = React.useState(false)

  return (
    <div className="relative flex items-center gap-2 select-none text-sm font-medium text-primary flex-nowrap">
      <span className="whitespace-nowrap" data-cy="project-task-pages-label">
        Per page
      </span>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            data-cy="project-task-page-size-button"
            variant="outline"
            className={cn(
              menuOpen
                ? "inline-flex h-12 select-none items-center rounded-full border-2 border-primary bg-primary/10 px-4 text-sm font-semibold text-primary"
                : "inline-flex h-12 select-none items-center rounded-full border-2 border-primary/40 bg-white px-4 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/10"
            )}
          >
            {pageSize}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-32 rounded-2xl border border-primary/30 bg-background/95 p-2 text-sm text-primary shadow-[0_16px_30px_rgba(39,36,66,0.15)]"
        >
          {pageSizeOptions.map((sizeOption) => {
            const isActive = sizeOption === pageSize
            return (
              <DropdownMenuItem
                key={sizeOption}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2 font-semibold transition hover:bg-primary/10 focus:bg-primary/10 focus:text-primary",
                  isActive && "bg-primary/10 text-primary"
                )}
                onSelect={() => {
                  if (isActive) {
                    return
                  }
                  onPageSizeChange(sizeOption)
                }}
                data-cy={`project-task-page-size-option-${sizeOption}`}
              >
                <span data-cy={`project-task-page-size-label-${sizeOption}`}>{sizeOption}</span>
                {isActive ? <Check className="size-4" /> : null}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <div
        className={cn(
          "pointer-events-none absolute right-[-8rem] top-3/2 z-[500] max-w-[14rem] -translate-y-1/2 rounded-2xl border border-primary/30 bg-white/95 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary shadow-lg transition duration-200 ease-out",
          menuOpen && totalCount > 0 ? "opacity-100" : "opacity-0"
        )}
      >
        {totalCount > 0 ? `${totalCount} tasks` : ""}
      </div>
    </div>
  )
}
