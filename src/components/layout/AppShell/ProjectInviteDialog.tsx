"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { INVITE_EXPIRY_OPTIONS, INVITE_ROLE_OPTIONS } from "@/components/layout/invite/constants"
import { ProjectInvitesState } from "../hooks/useProjectInvites"
import { PROJECT_ROLE } from "@/types/projects"
import { Check, ChevronDown } from "lucide-react"

type ProjectInviteDialogProps = {
  manager: ProjectInvitesState
  viewerDepartmentId: string | null
  viewerRole: PROJECT_ROLE | null
  isHeaderViewer: boolean
}

export function ProjectInviteDialog({
  manager,
  viewerDepartmentId,
  viewerRole,
  isHeaderViewer,
}: ProjectInviteDialogProps) {
  const {
    inviteDialogOpen,
    closeInviteDialog,
    inviteExpiry,
    setInviteExpiry,
    inviteRoleKey,
    inviteDepartmentId,
    inviteDepartments,
    inviteDepartmentsLoading,
    inviteDepartmentsError,
    inviteMaxUses,
    inviteMaxUsesCustom,
    inviteSaving,
    inviteRoleOption,
    inviteRoleHeadExclusive,
    availableInviteDepartments,
    canCustomizeInviteMaxUses,
    inviteError,
    headlessDepartmentAvailable,
    invites,
    invitesLoading,
    handleCreateInviteLink,
    handleCopyInvite,
    handleDeleteInviteLink,
  } = manager

  return (
    <Dialog open={inviteDialogOpen} onOpenChange={closeInviteDialog}>
      <DialogContent className="max-w-2xl rounded-[2rem] border-2 border-primary/30 bg-white px-8 py-8 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#2F2766]">Invite teammates</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-[#2F2766]">Link expiry</label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="inline-flex h-11 w-full min-w-[12rem] flex-1 items-center justify-between rounded-full border-2 border-primary/30 bg-white px-4 text-sm font-semibold text-[#2F2766]"
                    data-cy="project-invite-expiry-trigger"
                  >
                    <span>
                      {INVITE_EXPIRY_OPTIONS.find((option) => option.value === inviteExpiry)?.label ??
                        "Select expiry"}
                    </span>
                    <ChevronDown className="size-4 text-primary/70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="member-filter-scroll w-60 rounded-3xl border border-primary/30 bg-white px-2 py-2 text-sm font-semibold text-[#2F2766] shadow-[0_12px_30px_rgba(72,68,110,0.15)]"
                >
                  {INVITE_EXPIRY_OPTIONS.map((option) => {
                    const isActive = option.value === inviteExpiry
                    return (
                      <DropdownMenuItem
                        data-cy={`project-invite-expiry-option-${option.value}`}
                        key={option.value}
                        onSelect={() => setInviteExpiry(option.value)}
                        className="flex items-center justify-between rounded-2xl px-3 py-2 focus:bg-primary/10 focus:text-primary"
                      >
                        <span>{option.label}</span>
                        {isActive ? <Check className="size-4 text-primary" /> : null}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                type="button"
                className="h-11 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:w-auto"
                disabled={inviteSaving}
                onClick={handleCreateInviteLink}
                data-cy="project-invite-generate-link"
              >
                {inviteSaving ? "Generating…" : "Generate link"}
              </Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#2F2766]">Invite role</label>
              {isHeaderViewer ? (
                <div className="inline-flex h-11 w-full select-none items-center justify-between rounded-full border-2 border-primary/30 bg-white px-4 text-sm font-semibold text-[#2F2766]">
                  <span>Member</span>
                  <ChevronDown className="size-4 text-primary/30" />
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="inline-flex h-11 w-full items-center justify-between rounded-full border-2 border-primary/30 bg-white px-4 text-sm font-semibold text-[#2F2766]"
                      data-cy="project-invite-role-trigger"
                    >
                      <span>{inviteRoleOption.label}</span>
                      <ChevronDown className="size-4 text-primary/70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-60 max-h-64 overflow-y-auto rounded-3xl border border-primary/30 bg-white px-2 py-2 text-sm font-semibold text-[#2F2766] shadow-[0_12px_30px_rgba(72,68,110,0.15)]"
                  >
                    {INVITE_ROLE_OPTIONS.filter(
                      (option) => !(option.headExclusive && !headlessDepartmentAvailable)
                    ).map((option) => {
                      const disabled =
                        option.requiresOwner && viewerRole !== PROJECT_ROLE.OWNER
                      const isActive = inviteRoleKey === option.key
                      return (
                        <DropdownMenuItem
                          data-cy={`project-invite-role-option-${option.key}`}
                          key={option.key}
                          disabled={disabled}
                          onSelect={(event) => {
                            if (disabled) {
                              event.preventDefault()
                              return
                            }
                            manager.setInviteRoleKey(option.key)
                          }}
                          className="flex items-center justify-between rounded-2xl px-3 py-2 hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary disabled:opacity-50"
                        >
                          <span>{option.label}</span>
                          {isActive ? <Check className="size-4 text-primary" /> : null}
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#2F2766]">Department</label>
              {inviteDepartmentsLoading ? (
                <div className="text-xs text-muted-foreground">Loading departments…</div>
              ) : inviteDepartmentsError ? (
                <div className="text-xs text-destructive">{inviteDepartmentsError}</div>
              ) : inviteRoleHeadExclusive && availableInviteDepartments.length === 0 ? (
                <div className="text-xs text-muted-foreground">All departments already have a head.</div>
              ) : (
                <>
                  {isHeaderViewer ? (
                    <div className="inline-flex h-11 w-full select-none items-center justify-between rounded-full border-2 border-primary/30 bg-white px-4 text-sm font-semibold text-[#2F2766]">
                      <span>
                        {viewerDepartmentId
                          ? inviteDepartments.find((dept) => dept.id === viewerDepartmentId)?.name ??
                            "Department"
                          : "No department"}
                      </span>
                      <ChevronDown className="size-4 text-primary/30" />
                    </div>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="inline-flex h-11 w-full items-center justify-between rounded-full border-2 border-primary/30 bg-white px-4 text-sm font-semibold text-[#2F2766]"
                          data-cy="project-invite-department-trigger"
                        >
                          <span>
                            {inviteDepartmentId
                              ? inviteDepartments.find((dept) => dept.id === inviteDepartmentId)?.name ??
                                "Department"
                              : "No department"}
                          </span>
                          <ChevronDown className="size-4 text-primary/70" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-60 rounded-3xl border border-primary/30 bg-white px-2 py-2 text-sm font-semibold text-[#2F2766] shadow-[0_12px_30px_rgba(72,68,110,0.15)]"
                      >
                        {inviteRoleHeadExclusive ? null : (
                          <DropdownMenuItem
                            data-cy="project-invite-department-option-none"
                            onSelect={() => manager.setInviteDepartmentId(null)}
                            className="flex items-center justify-between rounded-2xl px-3 py-2 hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary"
                          >
                            <span>No department</span>
                            {!inviteDepartmentId ? (
                              <Check className="size-4 text-primary" />
                            ) : null}
                          </DropdownMenuItem>
                        )}
                        {availableInviteDepartments.map((dept) => {
                          const isActive = inviteDepartmentId === dept.id
                          return (
                            <DropdownMenuItem
                              data-cy={`project-invite-department-option-${dept.id}`}
                              key={dept.id}
                              onSelect={() => manager.setInviteDepartmentId(dept.id)}
                              className="flex items-center justify-between rounded-2xl px-3 py-2 hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary"
                            >
                              <span>{dept.name}</span>
                              {isActive ? <Check className="size-4 text-primary" /> : null}
                            </DropdownMenuItem>
                          )
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-semibold text-[#2F2766]">Max uses</label>
            {canCustomizeInviteMaxUses ? (
              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex items-center gap-3 rounded-full border-2 border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-[#2F2766]">
                    <span>Custom limit</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={inviteMaxUsesCustom}
                      onClick={() => manager.setInviteMaxUsesCustom((prev) => !prev)}
                      className={cn(
                        "relative inline-flex h-8 w-16 items-center rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                        inviteMaxUsesCustom ? "border-primary bg-primary/20" : "border-primary bg-primary"
                      )}
                      data-cy="project-invite-max-uses-toggle"
                    >
                      <span
                        className={cn(
                          "inline-block h-6 w-6 rounded-full bg-white shadow transition-all",
                          inviteMaxUsesCustom ? "translate-x-1" : "translate-x-[2rem]"
                        )}
                      />
                    </button>
                    <span>Unlimited</span>
                  </div>
                  {inviteMaxUsesCustom ? (
                    <input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={inviteMaxUses}
                      onChange={(event) =>
                        manager.setInviteMaxUses(event.target.value.replace(/[^0-9]/g, ""))
                      }
                      className="h-11 w-full rounded-full border-2 border-primary/30 bg-white px-4 text-sm font-semibold text-[#2F2766] shadow-[0_2px_0_rgba(144,122,214,0.15)] focus:border-primary focus-visible:outline-none sm:max-w-[9rem]"
                      placeholder="10"
                      data-cy="project-invite-max-uses-input"
                    />
                  ) : (
                    <p className="text-xs w-40 text-muted-foreground">
                      Unlimited invites until you delete the link manually.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Header invites are single-use and delete themselves after joining.
              </p>
            )}
          </div>
          {inviteError ? (
            <p className="text-sm font-semibold text-destructive" data-cy="project-invite-error">
              {inviteError}
            </p>
          ) : null}
          <div
            className="asap-scroll [scrollbar-gutter:stable] max-h-50 space-y-3 overflow-y-auto pr-1"
            data-cy="project-invite-list"
          >
            {invitesLoading ? (
              <p className="text-sm text-muted-foreground">Loading invite links…</p>
            ) : invites.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No invite links yet. Generate one to start inviting your team.
              </p>
            ) : (
              invites.map((invite) => {
                const baseUrl = typeof window === "undefined" ? "" : window.location.origin
                const inviteUrl = `${baseUrl}/invite/${invite.token}`
                const expiryLabel = invite.expiresAt
                  ? `Expires ${new Date(invite.expiresAt).toLocaleString()}`
                  : "No expiry"
                const isOwnerHeadInvite =
                  invite.role === PROJECT_ROLE.OWNER && Boolean(invite.departmentId)
                const roleLabel =
                  invite.role === PROJECT_ROLE.OWNER
                    ? isOwnerHeadInvite
                      ? "Header (Project Owner)"
                      : "Project Owner"
                    : invite.role === PROJECT_ROLE.HEADER
                      ? "Header"
                      : "Member"
                const departmentLabel = invite.department?.name ?? "No department"
                return (
                  <div
                    key={invite.id}
                    className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-[#2F2766]"
                    data-cy={`project-invite-row-${invite.id}`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold break-all">{inviteUrl}</p>
                        <p className="text-xs text-muted-foreground">{expiryLabel}</p>
                        <p className="text-xs text-muted-foreground">Role: {roleLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          Department: {departmentLabel}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-full px-4 py-2 text-xs font-semibold"
                          onClick={() => handleCopyInvite(invite.token)}
                          data-cy={`project-invite-copy-${invite.id}`}
                        >
                          Copy
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="rounded-full px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteInviteLink(invite.id)}
                          data-cy={`project-invite-remove-${invite.id}`}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
