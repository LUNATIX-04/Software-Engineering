"use client"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

import type { MemberRecord } from "../types"

export type MemberKickDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: MemberRecord | null
  kickingMemberId: string | null
  error: string | null
  onConfirm: () => void
}

export function MemberKickDialog({
  open,
  onOpenChange,
  target,
  kickingMemberId,
  error,
  onConfirm,
}: MemberKickDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-[2rem] border-2 border-primary/30 px-8 py-10 text-center shadow-xl">
        <AlertDialogTitle className="text-2xl font-semibold text-foreground">
          Are you sure? <br /> You want to remove this member? <br />
          <br />
          <span className="block min-h-[1.5rem] break-words break-all px-2 text-primary">
            {target?.name ? `"${target.name}"` : ""}
          </span>
        </AlertDialogTitle>
        {error ? <p className="mt-4 text-sm font-semibold text-destructive">{error}</p> : null}
        <AlertDialogFooter className="mt-8 flex w-full flex-row justify-end gap-4">
          <AlertDialogCancel className="rounded-full border-none bg-secondary px-8 py-3 text-base font-semibold text-secondary-foreground shadow-none transition hover:bg-secondary/80" data-cy="project-member-kick-cancel">
            No
          </AlertDialogCancel>
          <AlertDialogAction
            className="rounded-full bg-primary px-8 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-80"
            onClick={onConfirm}
            disabled={kickingMemberId === target?.id}
            data-cy="project-member-kick-confirm"
          >
            {kickingMemberId === target?.id ? "Removing…" : "Yes"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
