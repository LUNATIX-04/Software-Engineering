"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type TaskDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskTitle?: string
  deleting: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function TaskDeleteDialog({
  open,
  onOpenChange,
  taskTitle,
  deleting,
  onConfirm,
  onCancel,
}: TaskDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-background border-2 border-primary/30 rounded-[2rem] px-6 py-8 text-center shadow-xl max-w-md mx-auto">
        <AlertDialogTitle className="text-2xl font-semibold text-foreground">
          Are you sure?
          <br />
          <span className="mt-2 block">
            You want to delete this task? <br />
            <span className="mt-5 block">"{taskTitle ?? ""}"</span>
          </span>
        </AlertDialogTitle>
        <AlertDialogFooter className="mt-6 flex justify-center gap-20 w-auto mx-auto">
          <AlertDialogCancel
            className="rounded-full bg-secondary border-none px-9 py-5 text-lg font-semibold text-secondary-foreground shadow-none transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            onClick={onCancel}
            disabled={deleting}
            data-cy="project-task-delete-cancel"
          >
            No
          </AlertDialogCancel>
          <AlertDialogAction
            className="rounded-full bg-primary px-9 py-5 text-lg font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            onClick={onConfirm}
            disabled={deleting}
            data-cy="project-task-delete-confirm"
          >
            {deleting ? "Deleting…" : "Yes"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
