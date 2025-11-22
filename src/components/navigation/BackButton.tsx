"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { NAVIGATION_ABORT_EVENT } from "@/constants/events"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type BackButtonProps = {
  onClick?: () => void
  fallbackHref?: string
  ariaLabel?: string
  dataCy?: string
  className?: string
}

function defaultBackHandler(router: ReturnType<typeof useRouter>, fallbackHref: string) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back()
    return
  }
  router.push(fallbackHref)
}

export function BackButton({
  onClick,
  fallbackHref = "/projects",
  ariaLabel = "Back",
  dataCy,
  className,
}: BackButtonProps) {
  const router = useRouter()
  const dispatchNavigationAbort = useCallback(() => {
    if (typeof window === "undefined") {
      return
    }
    window.dispatchEvent(new Event(NAVIGATION_ABORT_EVENT))
  }, [])

  const handleClick = useCallback(() => {
    dispatchNavigationAbort()
    if (onClick) {
      onClick()
      return
    }
    defaultBackHandler(router, fallbackHref)
  }, [dispatchNavigationAbort, fallbackHref, onClick, router])

  return (
    <div
      className={cn(
        "sticky top-1 z-10 -ml-3 flex flex-shrink-0 items-start justify-start lg:-mt-0",
        className
      )}
    >
      <Button
        type="button"
        variant="ghost"
        data-cy={dataCy}
        onClick={handleClick}
        className="back-button inline-flex size-12 items-center justify-center rounded-full border shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--back-button-text)]/35"
        aria-label={ariaLabel}
      >
        <ArrowLeft className="size-6" aria-hidden="true" />
      </Button>
    </div>
  )
}

export default BackButton
