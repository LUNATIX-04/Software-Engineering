"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type TaskPaginationControlsProps = {
  page: number
  totalPages: number
  onPageChange: (nextPage: number) => void
}

export default function TaskPaginationControls({
  page,
  totalPages,
  onPageChange,
}: TaskPaginationControlsProps) {
  const [pageInput, setPageInput] = useState(String(page))
  const [pageHintVisible, setPageHintVisible] = useState(false)
  const paginationControlsRef = useRef<HTMLDivElement | null>(null)
  const pageHintTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    setPageInput(String(page))
  }, [page])

  const clearPageHintTimeout = useCallback(() => {
    if (pageHintTimeoutRef.current) {
      window.clearTimeout(pageHintTimeoutRef.current)
      pageHintTimeoutRef.current = null
    }
  }, [])

  const hidePageHint = useCallback(() => {
    clearPageHintTimeout()
    setPageHintVisible(false)
  }, [clearPageHintTimeout])

  const triggerPageHint = useCallback(() => {
    setPageHintVisible(true)
    clearPageHintTimeout()
    pageHintTimeoutRef.current = window.setTimeout(() => {
      setPageHintVisible(false)
      pageHintTimeoutRef.current = null
    }, 2000)
  }, [clearPageHintTimeout])

  const commitPageInput = useCallback(() => {
    if (pageInput.trim().length === 0) {
      setPageInput(String(page))
      return
    }
    const parsed = Number(pageInput)
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > totalPages) {
      setPageInput(String(page))
      return
    }
    onPageChange(parsed)
  }, [page, pageInput, totalPages, onPageChange])

  useEffect(() => {
    if (!pageHintVisible) {
      return
    }

    const handlePointerDown = (event: Event) => {
      if (!paginationControlsRef.current?.contains(event.target as Node)) {
        hidePageHint()
      } else {
        triggerPageHint()
      }
    }

    const handleFocusIn = (event: FocusEvent) => {
      if (!paginationControlsRef.current?.contains(event.target as Node)) {
        hidePageHint()
      } else {
        triggerPageHint()
      }
    }

    const pointerEventName =
      typeof window !== "undefined" && "PointerEvent" in window ? "pointerdown" : "mousedown"

    document.addEventListener(pointerEventName, handlePointerDown as EventListener)
    document.addEventListener("focusin", handleFocusIn)

    return () => {
      document.removeEventListener(pointerEventName, handlePointerDown as EventListener)
      document.removeEventListener("focusin", handleFocusIn)
    }
  }, [hidePageHint, pageHintVisible, triggerPageHint])

  useEffect(() => {
    return () => {
      clearPageHintTimeout()
    }
  }, [clearPageHintTimeout])

  const pageHint = totalPages <= 1 ? "Only page 1" : `Pages 1–${totalPages}`

  if (totalPages <= 0) {
    return null
  }

  return (
    <div
      ref={paginationControlsRef}
      className="mt-auto mb-10 flex select-none items-center justify-center gap-4 pt-4"
      onFocus={triggerPageHint}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget as HTMLElement | null
        if (!nextTarget || !paginationControlsRef.current?.contains(nextTarget)) {
          hidePageHint()
        }
      }}
    >
      <Button
        type="button"
        variant="ghost"
        data-cy="project-task-pagination-prev"
        onClick={() => {
          triggerPageHint()
          onPageChange(Math.max(1, page - 1))
        }}
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
          data-cy="project-task-pagination-input"
          inputMode="numeric"
          value={pageInput}
          onFocus={triggerPageHint}
          onBlur={() => {
            commitPageInput()
            hidePageHint()
          }}
          onChange={(event) => {
            const numericValue = event.target.value.replace(/[^0-9]/g, "")
            setPageInput(numericValue)
            triggerPageHint()
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitPageInput()
              triggerPageHint()
            }
          }}
          className="w-16 select-text rounded-full border-2 border-primary/40 bg-white px-3 py-2 text-center text-base font-semibold text-primary shadow-sm focus:border-primary focus:outline-none"
          aria-describedby="project-page-hint"
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        data-cy="project-task-pagination-next"
        onClick={() => {
          triggerPageHint()
          onPageChange(Math.min(totalPages, page + 1))
        }}
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
