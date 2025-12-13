"use client"

import { useEffect, useRef } from "react"

import { NAVIGATION_ABORT_EVENT } from "@/constants/events"

export function dispatchNavigationAbortEvent() {
  if (typeof window === "undefined") {
    return
  }
  window.dispatchEvent(new Event(NAVIGATION_ABORT_EVENT))
}

export function useNavigationAbort(onAbort?: () => void) {
  const abortedRef = useRef(false)

  useEffect(() => {
    const handleAbort = () => {
      abortedRef.current = true
      onAbort?.()
    }

    window.addEventListener(NAVIGATION_ABORT_EVENT, handleAbort)
    return () => {
      window.removeEventListener(NAVIGATION_ABORT_EVENT, handleAbort)
    }
  }, [onAbort])

  return abortedRef
}
