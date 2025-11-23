"use client"

import Image from "next/image"
import { UserRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { LinkifiedText } from "@/components/linkified-text"
import { PROJECT_ROLE } from "@/types/projects"

import type { MemberRecord } from "../types"
import type { ProjectMembershipSummary } from "@/utils/projects/api"

export type MemberDetailDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberTarget: MemberRecord | null
  membership: ProjectMembershipSummary | null
  usernameValue: string
  bioValue: string
  detailError: string | null
  detailSaving: boolean
  onUsernameChange: (value: string) => void
  onBioChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}

export function MemberDetailDialog({
  open,
  onOpenChange,
  memberTarget,
  membership,
  usernameValue,
  bioValue,
  detailError,
  detailSaving,
  onUsernameChange,
  onBioChange,
  onSave,
  onCancel,
}: MemberDetailDialogProps) {
  const isSelf = memberTarget?.id === membership?.id

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-[2.5rem] border-2 border-primary/30 bg-white px-8 py-10 text-left shadow-[0_20px_40px_rgba(72,68,110,0.2)]">
        <DialogHeader className="">
          <DialogTitle className="text-2xl -mt-5 font-bold text-task-hero">
            {isSelf ? "My Info" : "Member Info"}
          </DialogTitle>
        </DialogHeader>
        {memberTarget ? (
          <div className="-mt-1 flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-primary/20 bg-primary/5">
                {memberTarget.avatarUrl ? (
                  <Image
                    src={memberTarget.avatarUrl}
                    alt={`${memberTarget.name} avatar`}
                    width={96}
                    height={96}
                    className="size-full object-cover"
                    data-cy="member-detail-avatar"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-[#D9C9FF] text-primary">
                    <UserRound className="size-8" />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <div className="text-lg mt-2 font-semibold text-task-hero">
                    {isSelf ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={usernameValue}
                          data-cy="project-member-detail-username-input"
                          onChange={(event) => onUsernameChange(event.target.value)}
                          className="h-12 w-full rounded-full border-2 border-primary/30 bg-white px-4 text-sm font-semibold text-task-hero shadow-[0_4px_0_rgba(144,122,214,0.15)] focus:border-primary focus:outline-none"
                          placeholder="Project username"
                        />
                      </div>
                    ) : (
                      memberTarget.name
                    )}
                  </div>
                  <p className="text-sm font-semibold  text-primary/70">
                    <span className="text-foreground/40">Department : </span>
                    {memberTarget.department}
                  </p>
                  {memberTarget.rawRole !== PROJECT_ROLE.MEMBER ? (
                    <p className="text-sm font-semibold  text-primary/70">
                      <span className="text-foreground/40">Role : </span>
                      {memberTarget.role}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {memberTarget.email ? (
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">Email</p>
                  <p className="text-sm text-[var(--task-hero-text)]">{memberTarget.email}</p>
                </div>
              ) : null}
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">About me</p>
              {isSelf ? (
                <div className="textarea-surface group/textarea -mt-2 overflow-hidden rounded-[1rem]">
                  <Textarea
                    value={bioValue}
                    onChange={(event) => onBioChange(event.target.value)}
                    placeholder="Share a short bio"
                    data-cy="project-member-detail-bio-input"
                    className="project-detail-scroll min-h-[8rem] w-full resize-y rounded-[inherit] border-none bg-transparent px-5 py-3 text-sm font-semibold shadow-none focus-visible:outline-none focus-visible:ring-0"
                    rows={4}
                  />
                </div>
                ) : (
                  <div className="rounded-2xl -mt-2 border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-task-hero whitespace-pre-line break-words break-all">
                    <div className="asap-scroll max-h-[10rem] overflow-y-auto">
                      <LinkifiedText
                        value={memberTarget.bio?.length ? memberTarget.bio : "No bio provided."}
                        className="break-words break-all"
                      />
                    </div>
                  </div>
                )}
            </div>
            {isSelf ? (
              <div className="space-y-3">
                {detailError ? (
                  <p className="text-sm font-semibold text-destructive">{detailError}</p>
                ) : null}
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    data-cy="project-member-detail-cancel"
                    className="rounded-full px-6 py-2 text-sm font-semibold"
                    onClick={onCancel}
                    disabled={detailSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    data-cy="project-member-detail-save"
                    className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                    disabled={detailSaving}
                    onClick={onSave}
                  >
                    {detailSaving ? "Saving…" : "Save Changes"}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
