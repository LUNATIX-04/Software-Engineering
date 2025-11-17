"use client"

import { Button } from "@/components/ui/button"
import type { MouseEventHandler } from "react"

export type InviteStatusProps = {
  message: string
  variant?: "destructive" | "muted"
  onRetry?: MouseEventHandler<HTMLButtonElement>
}

export function InviteStatus({ message, variant = "muted", onRetry }: InviteStatusProps) {
  const colors = variant === "destructive" ? "text-destructive" : "text-primary"
  return (
    <div className="space-y-4">
      <p className={`text-lg font-semibold ${colors}`}>{message}</p>
      {onRetry ? (
        <Button type="button" variant="outline" className="rounded-full px-6 py-2" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  )
}
