"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DepartmentLayoutOption } from "@/types/preferences"
import type { ProjectMemberDetail } from "@/utils/projects/api"
import { SearchField } from "@/components/ui/search-field"

type ProjectOwnerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  departmentLayout: DepartmentLayoutOption
  ownerError: string | null
  ownerCandidates: ProjectMemberDetail[]
  ownerSelection: Set<string>
  selectedOwners: ProjectMemberDetail[]
  filteredOwnerCandidates: ProjectMemberDetail[]
  filteredSelectedOwners: ProjectMemberDetail[]
  ownerSearch: string
  selectedOwnersSearch: string
  ownersLoading: boolean
  ownersSaving: boolean
  toggleOwnerSelection: (memberId: string) => void
  handleSaveOwners: () => void
  setOwnerSearch: (value: string) => void
  setSelectedOwnersSearch: (value: string) => void
  mode?: "project" | "projects"
  title?: string
  description?: string
  subtitle?: string | null
}

export function ProjectOwnerDialog({
  open,
  onOpenChange,
  departmentLayout,
  ownerError,
  ownerCandidates,
  ownerSelection,
  selectedOwners,
  filteredOwnerCandidates,
  filteredSelectedOwners,
  ownerSearch,
  selectedOwnersSearch,
  ownersLoading,
  ownersSaving,
  toggleOwnerSelection,
  handleSaveOwners,
  setOwnerSearch,
  setSelectedOwnersSearch,
  mode = "project",
  title,
  description,
  subtitle,
}: ProjectOwnerDialogProps) {
  const defaultTitle = mode === "projects" ? "Change Projects Owners" : "Change Project Owners"
  const defaultDescription =
    mode === "projects"
      ? "Select one or more members to manage projects across your workspace."
      : "Select one or more members to act as project owners. Owners can manage every aspect of the project."
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-[2rem] border-2 border-primary/30 bg-white px-8 py-8 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#2F2766]">{title ?? defaultTitle}</DialogTitle>
          {subtitle ? (
            <p className="mt-1 text-sm font-semibold text-primary">{subtitle}</p>
          ) : null}
        </DialogHeader>
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            {description ?? defaultDescription}
          </p>
          {ownerError ? <p className="text-sm font-semibold text-destructive">{ownerError}</p> : null}
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Owners</p>
            </div>
            {selectedOwners.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-primary/30 bg-white px-4 py-5 text-sm text-muted-foreground">
                Choose members from the list below to make them owners.
              </div>
            ) : (
              <div className="rounded-3xl border border-primary/30 bg-white px-4 py-3">
                <div
                  className={cn(
                    "asap-scroll max-h-30 overflow-y-auto pr-2 [scrollbar-gutter:stable]",
                    departmentLayout === "compact" ? "flex flex-wrap gap-3" : "flex flex-col gap-3"
                  )}
                >
                  {filteredSelectedOwners.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-primary/30 bg-white px-4 py-5 text-sm text-muted-foreground">
                      No selected owners match your search.
                    </div>
                  ) : (
                    filteredSelectedOwners.map((owner) => (
                      <button
                        key={owner.id}
                        type="button"
                        onClick={() => toggleOwnerSelection(owner.id)}
                        className={cn(
                          "inline-flex min-w-0 items-center gap-2 rounded-full border-2 border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/10",
                          departmentLayout === "compact" ? "min-w-[9rem]" : "w-full"
                        )}
                      >
                        <span className="flex-1 truncate text-left">{owner.username}</span>
                        <X className="ml-2 size-4 shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Selected owners</p>
              <SearchField
                size="compact"
                wrapperClassName="w-full max-w-xs"
                value={ownerSearch}
                onChange={(event) => setOwnerSearch(event.target.value)}
                placeholder="Search username"
                className="pl-9 pr-3 text-sm font-semibold text-[#2F2766] placeholder:text-primary/40"
              />
            </div>
            <div className="asap-scroll [scrollbar-gutter:stable] max-h-40 space-y-3 overflow-y-auto pr-1">
              {ownersLoading ? (
                <p className="text-sm text-muted-foreground">Loading project members…</p>
              ) : ownerCandidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">This project does not have any members yet.</p>
              ) : filteredOwnerCandidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No members match your search.</p>
              ) : (
                filteredOwnerCandidates.map((candidate) => {
                  const isSelected = ownerSelection.has(candidate.id)
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => toggleOwnerSelection(candidate.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-2xl border border-primary/20 bg-white px-4 py-3 text-left text-sm font-semibold text-[#2F2766] transition hover:border-primary hover:bg-primary/5",
                        isSelected && "border-primary bg-primary/10"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold">{candidate.username}</span>
                        <span className="text-xs text-muted-foreground">{candidate.role}</span>
                      </div>
                      {isSelected ? <Check className="size-4 text-primary" /> : null}
                    </button>
                  )
                })
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-6 py-2 text-sm font-semibold"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              disabled={ownersSaving || ownerSelection.size === 0}
              onClick={handleSaveOwners}
            >
              {ownersSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
