"use client"

import { FocusEvent, KeyboardEvent, RefObject, useCallback, useEffect, useRef, useState } from "react"

export type UseMemberPaginationControlsProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  paginationRef: RefObject<HTMLDivElement>
}

export function useMemberPaginationControls({
  page,
  totalPages,
  onPageChange,
  paginationRef,
}: UseMemberPaginationControlsProps) {
  const [pageInput, setPageInput] = useState("1")
  const [pageHintVisible, setPageHintVisible] = useState(false)
  const pageHintTimeoutRef = useRef<number | null>(null)

  const pageHint = totalPages <= 1 ? "Only page 1" : `Pages 1–${totalPages}`

  useEffect(() => {
    setPageInput(String(page))
  }, [page])

  const clearPageHintTimeout = useCallback(() => {
    if (typeof window === "undefined") {
      return
    }
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
    if (typeof window === "undefined") {
      return
    }
    setPageHintVisible(true)
    clearPageHintTimeout()
    pageHintTimeoutRef.current = window.setTimeout(() => {
      setPageHintVisible(false)
      pageHintTimeoutRef.current = null
    }, 2000)
  }, [clearPageHintTimeout])

  useEffect(() => {
    if (!pageHintVisible) {
      return
    }

    const handlePointerDown = (event: Event) => {
      const target = event.target as Node | null
      if (!paginationRef.current?.contains(target)) {
        hidePageHint()
      } else {
        triggerPageHint()
      }
    }

    const handleFocusIn = (event: FocusEvent) => {
      if (!paginationRef.current?.contains(event.target as Node)) {
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
  }, [hidePageHint, pageHintVisible, paginationRef, triggerPageHint])

  useEffect(() => {
    return () => {
      clearPageHintTimeout()
    }
  }, [clearPageHintTimeout])

  const commitPageInput = useCallback(() => {
    if (!pageInput.trim()) {
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

  const handleContainerBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      const nextTarget = event.relatedTarget as HTMLElement | null
      if (!nextTarget || !paginationRef.current?.contains(nextTarget)) {
        hidePageHint()
      }
    },
    [hidePageHint, paginationRef]
  )

  const handlePageInputFocus = useCallback(() => {
    triggerPageHint()
  }, [triggerPageHint])

  const handlePageInputBlur = useCallback(() => {
    commitPageInput()
    hidePageHint()
  }, [commitPageInput, hidePageHint])

  const handlePageInputChange = useCallback(
    (value: string) => {
      const numericValue = value.replace(/[^0-9]/g, "")
      setPageInput(numericValue)
      triggerPageHint()
    },
    [triggerPageHint]
  )

  const handlePageInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        commitPageInput()
        triggerPageHint()
      }
    },
    [commitPageInput, triggerPageHint]
  )

  const handlePrevPage = useCallback(() => {
    triggerPageHint()
    onPageChange(Math.max(1, page - 1))
  }, [onPageChange, page, triggerPageHint])

  const handleNextPage = useCallback(() => {
    triggerPageHint()
    onPageChange(Math.min(totalPages, page + 1))
  }, [onPageChange, page, totalPages, triggerPageHint])

  const handleContainerFocus = triggerPageHint

  return {
    pageInput,
    pageHintVisible,
    pageHint,
    handlePrevPage,
    handleNextPage,
    handlePageInputChange,
    handlePageInputFocus,
    handlePageInputBlur,
    handlePageInputKeyDown,
    handleContainerFocus,
    handleContainerBlur,
  }
}
