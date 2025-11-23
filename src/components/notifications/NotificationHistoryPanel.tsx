"use client"

import { useEffect, useMemo, useRef } from "react"
import { X } from "lucide-react"

import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useNotifications, type NotificationVariant } from "./Notification"

const VARIANT_DECOR: Record<NotificationVariant, string> = {
  success: "bg-[color:var(--notify-success-bg)]/20 text-[color:var(--notify-success-bg)]",
  info: "bg-[color:var(--notify-info-bg)]/20 text-[color:var(--notify-info-bg)]",
  warning: "bg-[color:var(--notify-warning-bg)]/20 text-[color:var(--notify-warning-bg)]",
  destructive: "bg-[color:var(--notify-destructive-bg)]/20 text-[color:var(--notify-destructive-bg)]",
}

type NotificationHistoryPanelProps = {
  open: boolean
  onClose: () => void
  triggerRef?: React.RefObject<HTMLElement | null>
}

const formatTimestamp = (value: string) => {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
      hour12: false,
    }).format(new Date(value))
  } catch {
    return ""
  }
}

export function NotificationHistoryPanel({
  open,
  onClose,
  triggerRef,
}: NotificationHistoryPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const { history, removeHistoryEntry, clearHistory } = useNotifications()
  const router = useRouter()
  const reversed = useMemo(() => [...history].reverse(), [history])

  useEffect(() => {
    if (!open) {
      return
    }
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        !(triggerRef?.current?.contains(target) || triggerRef?.current === target)
      ) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      return
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  return (
    <div
      ref={panelRef}
      className={cn(
        "fixed top-[clamp(3.75rem,5.5vw,4.75rem)] right-[clamp(0.5rem,1vw,1.5rem)] z-[80] w-[min(26rem,90vw)] max-h-[100vh] rounded-[2rem] border border-border bg-card shadow-2xl transition-transform duration-300 ease-out overflow-hidden",
        open ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
      )}
      role="region"
      aria-label="Notification history"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">History</p>
          <p className="text-base font-semibold">Notifications</p>
        </div>
        <div className="flex items-center gap-2">
          {history.length > 0 ? (
            <button
              type="button"
              onClick={clearHistory}
              className="text-sm font-semibold text-destructive transition hover:text-foreground hover:bg-destructive/5 rounded-full px-3 py-1"
            >
              Clear all
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border/60 bg-background/80 p-2 text-muted-foreground transition hover:text-foreground"
            aria-label="Close notification history"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>
      <div className=" max-h-[calc(80vh-4rem)] overflow-y-auto dialog-scroll overflow-x-hidden space-y-0">
        {reversed.length === 0 ? (
          <div className="px-6 py-8 text-sm text-muted-foreground">No notifications yet.</div>
        ) : (
          reversed.map((entry) => (
            <article
              key={entry.id}
              className="border-b border-border px-6 py-4 last:border-b-0"
            >
                <div className="flex w-full items-start gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-current/30 text-sm font-semibold",
                      VARIANT_DECOR[entry.variant]
                    )}
                    aria-hidden
                  >
                    {entry.variant[0].toUpperCase()}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground break-words">{entry.title}</p>
                    {entry.description ? (
                      <p className="text-xs text-muted-foreground max-w-[min(16rem,calc(100%-2rem))] break-words whitespace-pre-line">
                        {entry.description}
                      </p>
                    ) : null}
                  </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                  {entry.href ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        router.push(entry.href!)
                      }}
                      className="text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                    >
                      View task
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeHistoryEntry(entry.id)}
                      className="text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </article>
          ))
        )}
      </div>
    </div>
  )
}
