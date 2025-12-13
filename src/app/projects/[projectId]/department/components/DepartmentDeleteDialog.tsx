"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export type DepartmentDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  departmentName: string
  onConfirm: () => void
  deleting: boolean
  dataCySuffix?: string
}

export default function DepartmentDeleteDialog({
  open,
  onOpenChange,
  departmentName,
  onConfirm,
  deleting,
  dataCySuffix,
}: DepartmentDeleteDialogProps) {
  const suffix = dataCySuffix ?? ""
  const buildDataCy = (base: string) => `${base}${suffix}`

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-[2rem] border-2 border-primary/30 px-8 py-10 text-center shadow-xl">
        <AlertDialogTitle className="text-2xl font-semibold text-foreground">
          Are you sure? <br /> You want to delete this department? <br />
          <br />
          <span className="block break-words break-all px-2 text-primary">
            "{departmentName}"
          </span>
        </AlertDialogTitle>
        <AlertDialogFooter className="mt-8 flex w-full flex-row gap-6 justify-between">
          <AlertDialogCancel
            className="rounded-full border-none bg-secondary px-8 py-3 text-base font-semibold text-secondary-foreground shadow-none transition hover:bg-secondary/80"
            data-cy={buildDataCy("department-delete-cancel")}
          >
            No
          </AlertDialogCancel>
          <AlertDialogAction
            className="rounded-full bg-primary px-8 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90"
            onClick={onConfirm}
            disabled={deleting}
            data-cy={buildDataCy("department-delete-confirm")}
          >
            {deleting ? "Deleting…" : "Yes"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
