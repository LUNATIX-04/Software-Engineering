"use client"

import { FocusEvent, KeyboardEvent, RefObject } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type MemberPaginationControlsProps = {
  paginationRef: RefObject<HTMLDivElement>
  page: number
  totalPages: number
  pageInput: string
  pageHint: string
  pageHintVisible: boolean
  onPrev: () => void
  onNext: () => void
  onPageInputChange: (value: string) => void
  onPageInputFocus: () => void
  onPageInputBlur: () => void
  onPageInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onContainerFocus: () => void
  onContainerBlur: (event: FocusEvent<HTMLDivElement>) => void
}

export function MemberPaginationControls({
  paginationRef,
  page,
  totalPages,
  pageInput,
  pageHint,
  pageHintVisible,
  onPrev,
  onNext,
  onPageInputChange,
  onPageInputFocus,
  onPageInputBlur,
  onPageInputKeyDown,
  onContainerFocus,
  onContainerBlur,
}: MemberPaginationControlsProps) {
  return (
    <div
      ref={paginationRef}
      className="mt-auto mb-20 flex select-none items-center justify-center gap-4 pt-4"
      onFocus={onContainerFocus}
      onBlur={onContainerBlur}
    >
      <Button
        type="button"
        variant="ghost"
        data-cy="project-member-pagination-prev"
        onClick={onPrev}
        disabled={page === 1}
        className={cn(
          "inline-flex size-10 select-none items-center justify-center rounded-full border-2 border-primary/40 bg-primary text-lg text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-95",
          page === 1 && "bg-primary/30 text-primary/90 border-primary/20 cursor-not-allowed"
        )}
      >
        &#9664;
      </Button>
      <div className="relative flex flex-col items-center gap-1">
        <span
          aria-hidden="true"
          className={cn(
            "absolute -top-8 whitespace-nowrap rounded-full border border-primary/30 bg-white px-3 py-1 text-xs font-medium text-primary shadow-sm transition-all duration-200 ease-out",
            pageHintVisible
              ? "pointer-events-auto opacity-100 translate-y-0 scale-100"
              : "pointer-events-none opacity-0 -translate-y-1 scale-95"
          )}
        >
          {pageHint}
        </span>
        <span id="project-page-hint" className="sr-only">
          {pageHint}
        </span>
        <input
          id="project-page-input"
          type="text"
          data-cy="project-member-pagination-input"
          inputMode="numeric"
          value={pageInput}
          onFocus={onPageInputFocus}
          onBlur={onPageInputBlur}
          onChange={(event) => onPageInputChange(event.target.value)}
          onKeyDown={onPageInputKeyDown}
          className="w-16 select-text rounded-full border-2 border-primary/40 bg-white px-3 py-2 text-center text-base font-semibold text-primary shadow-sm focus:border-primary focus:outline-none"
          aria-describedby="project-page-hint"
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        data-cy="project-member-pagination-next"
        onClick={onNext}
        disabled={page === totalPages}
        className={cn(
          "inline-flex size-10 select-none items-center justify-center rounded-full border-2 border-primary/40 bg-primary text-lg text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-95",
          page === totalPages &&
            "bg-primary/30 text-primary/90 border-primary/20 cursor-not-allowed"
        )}
      >
        &#9654;
      </Button>
    </div>
  )
}
