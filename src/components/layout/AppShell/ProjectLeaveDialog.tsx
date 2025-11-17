"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type ProjectLeaveDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string | null
  titleLoading: boolean
  loading: boolean
  error: string | null
  onConfirm: () => void
}

export function ProjectLeaveDialog({
  open,
  onOpenChange,
  title,
  titleLoading,
  loading,
  error,
  onConfirm,
}: ProjectLeaveDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-[2rem] border-2 border-primary/30 px-8 py-10 text-center shadow-xl">
        <AlertDialogTitle className="text-2xl font-semibold text-foreground">
          Are you sure? <br /> You want to leave this project? <br />
          <br />
          <span className="block min-h-[1.5rem] break-words break-all px-2 text-primary">
            {titleLoading ? "Loading project details…" : title ? `"${title}"` : ""}
          </span>
        </AlertDialogTitle>
        {error ? <p className="mt-4 text-sm font-semibold text-destructive">{error}</p> : null}
        <AlertDialogFooter className="mt-8 flex w-full flex-row justify-end gap-4">
          <AlertDialogCancel
            className="rounded-full border-none bg-secondary px-8 py-3 text-base font-semibold text-secondary-foreground shadow-none transition hover:bg-secondary/80"
            disabled={loading}
          >
            Stay
          </AlertDialogCancel>
          <AlertDialogAction
            className="rounded-full bg-primary px-8 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-80"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Leaving…" : "Leave"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
