"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

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

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick()
      return
    }
    defaultBackHandler(router, fallbackHref)
  }, [fallbackHref, onClick, router])

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
        className="inline-flex size-12 items-center justify-center rounded-full border border-primary/20 bg-white text-primary shadow-sm transition hover:border-primary/40 hover:bg-primary/10 focus-visible:border-primary focus-visible:ring-0"
        aria-label={ariaLabel}
      >
        <ArrowLeft className="size-6" aria-hidden="true" />
      </Button>
    </div>
  )
}

export default BackButton
