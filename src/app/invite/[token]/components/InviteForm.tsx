"use client"

import { Button } from "@/components/ui/button"
import type { MouseEventHandler } from "react"

export type InviteFormProps = {
  username: string
  onUsernameChange: (value: string) => void
  onJoin: MouseEventHandler<HTMLButtonElement>
  joining: boolean
}

export function InviteForm({ username, onUsernameChange, onJoin, joining }: InviteFormProps) {
  return (
    <div className="space-y-4">
      <div className="text-left">
        <label className="text-sm font-semibold text-[#2F2766]">Project Username</label>
        <input
          type="text"
          value={username}
          onChange={(event) => onUsernameChange(event.target.value)}
          className="mt-2 w-full rounded-2xl border-2 border-primary/30 bg-white px-4 py-2 text-base font-semibold text-[#2F2766] shadow-[0_2px_0_rgba(144,122,214,0.15)] focus:border-primary focus:outline-none"
          placeholder="How should the team see you?"
        />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          type="button"
          className="rounded-full bg-primary px-8 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90"
          disabled={joining}
          onClick={onJoin}
        >
          {joining ? "Joining…" : "Join Project"}
        </Button>
      </div>
    </div>
  )
}
