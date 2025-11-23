"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const LINK_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi
const URL_ONLY_PATTERN = /^(https?:\/\/[^\s]+|www\.[^\s]+)$/i

const isUrlSegment = (value: string) => URL_ONLY_PATTERN.test(value)

const normalizeUrl = (value: string) => {
  if (value.startsWith("http")) {
    return value
  }
  return `https://${value}`
}

type LinkifiedTextProps = {
  value?: string | null
  className?: string
}

export function LinkifiedText({ value, className }: LinkifiedTextProps) {
  const segments = React.useMemo(() => {
    if (!value) {
      return []
    }
    const parts = value.split(LINK_PATTERN)
    return parts.filter((part) => part !== undefined && part !== null && part !== "")
  }, [value])

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [pendingHref, setPendingHref] = React.useState<string | null>(null)
  const [pendingLabel, setPendingLabel] = React.useState<string>("")

  const handleLinkTrigger = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, href: string, label: string) => {
      event.preventDefault()
      setPendingHref(href)
      setPendingLabel(label)
      setDialogOpen(true)
    },
    []
  )

  const resetDialogState = React.useCallback(() => {
    setPendingHref(null)
    setPendingLabel("")
  }, [])

  const handleDialogOpenChange = React.useCallback(
    (open: boolean) => {
      setDialogOpen(open)
      if (!open) {
        window.setTimeout(() => {
          resetDialogState()
        }, 200)
      }
    },
    [resetDialogState]
  )

  const handleConfirmNavigation = React.useCallback(() => {
    handleDialogOpenChange(false)
    if (pendingHref && typeof window !== "undefined") {
      window.setTimeout(() => {
        window.open(pendingHref!, "_blank")
      }, 0)
    }
  }, [pendingHref, handleDialogOpenChange])

  if (segments.length === 0) {
    return <span className={className}>{value ?? ""}</span>
  }

  return (
    <>
      <span className={className}>
      {segments.map((segment, index) => {
        if (!segment) {
          return null
        }
        const isUrl = isUrlSegment(segment)
        if (isUrl) {
          const href = normalizeUrl(segment)
          return (
            <a
              key={`${segment}-${index}`}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="asap-read-link"
              onClick={(event) => handleLinkTrigger(event, href, segment)}
            >
              {segment}
            </a>
          )
        }
        return (
          <React.Fragment key={`text-${segment}-${index}`}>
            {segment}
          </React.Fragment>
        )
      })}
      </span>
      <AlertDialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <AlertDialogContent className="rounded-[2rem] border-2 border-primary/30 px-8 py-8 text-center shadow-[0_20px_40px_rgba(63,52,120,0.25)]">
          <AlertDialogTitle className="text-lg font-semibold text-[var(--task-hero-text)]">
            Follow this link?
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-4 text-base text-[var(--task-subtle-text)]">
            <span className="font-semibold text-[var(--primary)]">{pendingLabel}</span>
          </AlertDialogDescription>
          <AlertDialogFooter className="mt-8 flex w-full flex-row justify-end gap-4">
            <AlertDialogCancel
              className="rounded-full border-none bg-secondary px-8 py-3 text-base font-semibold text-secondary-foreground shadow-none transition hover:bg-secondary/80"
              disabled={!dialogOpen}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-primary px-8 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-80"
              onClick={handleConfirmNavigation}
            >
              Open link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
