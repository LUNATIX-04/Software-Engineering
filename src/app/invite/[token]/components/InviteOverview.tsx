"use client"

import { PROJECT_ROLE } from "@/types/projects"
import type { InvitePayload } from "../types"

export type InviteOverviewProps = {
  invite: InvitePayload
}

export function InviteOverview({ invite }: InviteOverviewProps) {
  const isOwnerHead = invite.role === PROJECT_ROLE.OWNER && Boolean(invite.departmentId)
  const roleLabel =
    invite.role === PROJECT_ROLE.OWNER
      ? isOwnerHead
        ? "Header (Project Owner)"
        : "Project Owner"
      : invite.role === PROJECT_ROLE.HEADER
        ? "Header"
        : "Member"

  return (
    <div>
      <p className="text-sm uppercase tracking-[0.2em] text-primary/70">Project Invitation</p>
      <h1 className="mt-2 text-3xl font-bold text-[#2F2766]">{invite.project.title}</h1>
      <p className="mt-1 text-base text-muted-foreground">
        Role: <span className="font-semibold text-primary">{roleLabel}</span>
        <br />
        Department: {invite.departmentName ? (
          <span className="font-semibold text-primary">{invite.departmentName}</span>
        ) : (
          "No Department"
        )}
      </p>
      {invite.expiresAt ? (
        <p className="text-xs text-muted-foreground">
          Expires on {new Date(invite.expiresAt).toLocaleString()}
        </p>
      ) : null}
    </div>
  )
}
