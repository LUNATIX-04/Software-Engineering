"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Check, Link2, X } from "lucide-react"

import type { ProjectDepartmentRecord } from "@/utils/projects/departments"
import type { ProjectInviteRecord } from "@/utils/projects/api"
import type { InviteRoleOption } from "./constants"
import type { ProjectInvitesState } from "@/components/layout/hooks/useProjectInvites"

type InviteDialogProps = ProjectInvitesState & {
  hasOwnerInvitePermissions: boolean
}

export function InviteDialog({
  inviteDialogOpen,
  closeInviteDialog,
  invites,
  invitesLoading,
  inviteError,
  inviteExpiry,
  setInviteExpiry,
  inviteRoleKey,
  setInviteRoleKey,
  inviteDepartmentId,
  setInviteDepartmentId,
  inviteDepartments,
  inviteDepartmentsLoading,
  inviteDepartmentsError,
  inviteMaxUses,
  setInviteMaxUses,
  inviteMaxUsesCustom,
  setInviteMaxUsesCustom,
  inviteSaving,
  inviteExpiryMenuOpen,
  setInviteExpiryMenuOpen,
  inviteRoleMenuOpen,
  setInviteRoleMenuOpen,
  inviteDepartmentMenuOpen,
  setInviteDepartmentMenuOpen,
  inviteRoleOption,
  availableInviteDepartments,
  inviteRoleHeadExclusive,
  canCustomizeInviteMaxUses,
  headlessDepartmentAvailable,
  handleCreateInviteLink,
  handleCopyInvite,
  handleDeleteInviteLink,
}: InviteDialogProps) {
  return (
    <Dialog open={inviteDialogOpen} onOpenChange={closeInviteDialog}>
      <DialogContent className="max-w-2xl rounded-[2rem] border-2 border-primary/30 bg-white px-8 py-8 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#2F2766]">Invite teammates</DialogTitle>
        </DialogHeader>
        ...
      </DialogContent>
    </Dialog>
  )
}
