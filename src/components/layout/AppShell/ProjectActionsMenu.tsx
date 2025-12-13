"use client"

import { useCallback } from "react"
import { Link2, LogOut, MoreHorizontal, PencilLine, RefreshCcw, Trash2, UserPen } from "lucide-react"
import type { AppRouterInstance } from "next/navigation"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import type { ProjectMembershipSummary } from "@/utils/projects/api"
import { cn } from "@/lib/utils"
import { PROJECT_REFRESH_EVENT } from "@/constants/events"
import { PROJECT_ROLE } from "@/types/projects"

export type ProjectActionsMenuProps = {
  activeProjectId: string | null
  projectActionsOpen: boolean
  projectMembership: ProjectMembershipSummary | null
  promptProjectDelete: (projectId: string) => void
  router: AppRouterInstance
  setLeaveDialogOpen: (open: boolean) => void
  setOwnerDialogOpen: (open: boolean) => void
  setPendingUsername: (value: string) => void
  setProjectActionsOpen: (open: boolean) => void
  setUsernameDialogOpen: (open: boolean) => void
  openInviteDialog: () => void
  onRefresh?: () => void
}

export function ProjectActionsMenu({
  activeProjectId,
  projectActionsOpen,
  projectMembership,
  promptProjectDelete,
  router,
  setLeaveDialogOpen,
  setOwnerDialogOpen,
  setPendingUsername,
  setProjectActionsOpen,
  setUsernameDialogOpen,
  openInviteDialog,
  onRefresh,
}: ProjectActionsMenuProps) {
  if (!activeProjectId) {
    return null
  }

  const role = (projectMembership?.role ?? "MEMBER") as PROJECT_ROLE
  const canInviteMembers = role === PROJECT_ROLE.OWNER || role === PROJECT_ROLE.HEADER
  const canEditThisProject = role === PROJECT_ROLE.OWNER
  const canDeleteThisProject = role === PROJECT_ROLE.OWNER
  const canChangeOwner = role === PROJECT_ROLE.OWNER
  const canChangeUsername = Boolean(projectMembership)

  const handleRefresh = useCallback(() => {
    setProjectActionsOpen(false)
    if (onRefresh) {
      onRefresh()
      return
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(PROJECT_REFRESH_EVENT, {
          detail: { projectId: activeProjectId ?? null },
        })
      )
    } else {
      router.refresh()
    }
  }, [activeProjectId, onRefresh, router, setProjectActionsOpen])

  return (
    <DropdownMenu modal={false} onOpenChange={setProjectActionsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "card-menu-trigger size-8 mr-3 rounded-full border transition-colors duration-200 cursor-pointer focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-transparent focus-visible:outline-none flex items-center justify-center",
            projectActionsOpen
              ? "text-primary card-menu-shadow bg-card-menu"
              : "border-transparent text-button-foreground-on-nav !bg-transparent hover:border-primary/30 hover:bg-card-menu active:border-primary/30 active:bg-card-menu"
          )}
          aria-label="Project actions"
          aria-pressed={projectActionsOpen}
        >
          <MoreHorizontal className={projectActionsOpen ? "size-5 text-primary" : "size-5 text-current"} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="dropdown-surface w-48 rounded-3xl border-none bg-button-background p-2 text-button-foreground"
      >
        {canInviteMembers ? (
          <DropdownMenuItem
            data-cy="project-actions-invite-link"
            className="rounded-2xl px-4 py-3 text-sm font-semibold transition hover:bg-button-hover-background-on-nav"
            onSelect={() => {
              setProjectActionsOpen(false)
              openInviteDialog()
            }}
          >
            <span className="inline-flex items-center gap-2">
              <Link2 className="size-4 text-current" />
              Invite Link
            </span>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          data-cy="project-actions-refresh"
          className="rounded-2xl px-4 py-3 text-sm font-semibold transition hover:bg-button-hover-background-on-nav"
          onSelect={handleRefresh}
        >
          <span className="inline-flex items-center gap-2">
            <RefreshCcw className="size-4 text-current" />
            Refresh
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          data-cy="project-actions-change-username"
          className="rounded-2xl px-4 py-3 text-sm font-semibold transition hover:bg-button-hover-background-on-nav"
          disabled={!canChangeUsername}
          onSelect={() => {
            if (!projectMembership) {
              return
            }
            setPendingUsername(projectMembership.username ?? "")
            setUsernameDialogOpen(true)
          }}
        >
          <span className="inline-flex items-center gap-2">
            <UserPen className="size-4 text-current" />
            Change Username
          </span>
        </DropdownMenuItem>
        {canEditThisProject ? (
          <DropdownMenuItem
            data-cy="project-actions-edit"
            className="rounded-2xl px-4 py-3 text-sm font-semibold transition hover:bg-button-hover-background-on-nav"
            onSelect={() => {
              if (activeProjectId) {
                router.push(`/projects/${activeProjectId}/edit`)
              }
            }}
          >
            <span className="inline-flex items-center gap-2">
              <PencilLine className="size-4 text-current" />
              Edit Project
            </span>
          </DropdownMenuItem>
        ) : null}
        {canChangeOwner ? (
          <DropdownMenuItem
            data-cy="project-actions-change-owner"
            className="rounded-2xl px-4 py-3 text-sm font-semibold transition hover:bg-button-hover-background-on-nav"
            onSelect={() => {
              setProjectActionsOpen(false)
            setOwnerDialogOpen(true)
          }}
        >
          <span className="inline-flex items-center gap-2">
            <UserPen className="size-4 text-current" />
            Change Project Owner
          </span>
        </DropdownMenuItem>
      ) : null}
      {canDeleteThisProject ? (
          <DropdownMenuItem
            data-cy="project-actions-delete"
            className="rounded-2xl px-4 py-3 text-sm font-semibold transition hover:bg-destructive/10 focus:bg-destructive/10"
            onSelect={(event) => {
              event.preventDefault()
              event.stopPropagation()
              if (!activeProjectId) {
                return
              }
              setProjectActionsOpen(false)
              promptProjectDelete(activeProjectId)
            }}
          >
            <span className="inline-flex items-center gap-2 text-destructive font-semibold">
              <Trash2 className="size-4 text-current" />
              Delete Project
            </span>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          data-cy="project-actions-leave"
          className="rounded-2xl px-4 py-3 text-sm font-semibold transition hover:bg-button-hover-background-on-nav"
          onSelect={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setProjectActionsOpen(false)
            setLeaveDialogOpen(true)
          }}
        >
          <span className="inline-flex items-center gap-2">
            <LogOut className="size-4 text-current" />
            Leave Project
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
