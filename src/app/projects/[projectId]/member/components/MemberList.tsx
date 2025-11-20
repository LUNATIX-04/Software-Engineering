"use client"

import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { TOOLTIP_DELAY_DURATION_MS } from "@/constants/ui"

import { MemberCard } from "@/components/projects/MemberCard"
import { ProgressBar } from "@/components/ui/progress-bar"

import type { MemberRecord } from "../types"
import type { MemberDepartment, MemberRole } from "@/components/projects/MemberCard"
import type { ProjectMembershipSummary } from "@/utils/projects/api"

export type MemberListProps = {
  membership: ProjectMembershipSummary | null
  membersLoading: boolean
  membersError: string | null
  paginatedMembers: MemberRecord[]
  onRoleChange: (memberId: string, role: MemberRole) => void
  kickingMemberId: string | null
  departmentStyles: Record<string, { background: string; text: string }>
  departmentHeadMap: Record<string, string | null>
  resolveDepartmentOptions: (member: MemberRecord) => MemberDepartment[] | undefined
  handleSetMemberDepartment: (memberId: string, departmentLabel: MemberDepartment) => void
  requestKickMember: (member: MemberRecord) => void
  openMemberDetails: (member: MemberRecord) => void
  canEditMember: (member: MemberRecord) => boolean
  canKickMemberTarget: (member: MemberRecord) => boolean
}

export function MemberList({
  membership,
  membersLoading,
  membersError,
  paginatedMembers,
  onRoleChange,
  kickingMemberId,
  departmentStyles,
  departmentHeadMap,
  resolveDepartmentOptions,
  handleSetMemberDepartment,
  requestKickMember,
  openMemberDetails,
  canEditMember,
  canKickMemberTarget,
}: MemberListProps) {
  if (membersError) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-6 py-4 text-sm text-destructive">
        {membersError}
      </div>
    )
  }

  if (membersLoading) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-5 text-center text-sm text-primary">
        <span className="text-base font-semibold">Loading members…</span>
        <ProgressBar />
      </div>
    )
  }

  if (paginatedMembers.length === 0) {
    return (
      <div className="rounded-[3rem] border-2 border-dashed border-primary/40 bg-white/70 px-6 py-12 text-center text-sm font-semibold text-primary">
        No members match your filters.
      </div>
    )
  }

  return (
    <>
      {paginatedMembers.map((member, index) => {
        const isReadOnly = !canEditMember(member)
        const memberDepartmentOptions = resolveDepartmentOptions(member)
        const departmentHeadUsername =
          member.departmentId && departmentHeadMap[member.departmentId]
            ? departmentHeadMap[member.departmentId]
            : null
        const isDepartmentHead =
          Boolean(departmentHeadUsername) && departmentHeadUsername === member.name
        const roleLabel =
          isDepartmentHead && member.rawRole === "OWNER"
            ? "Header (Project Owner)"
            : member.role
        const isSelf = member.id === membership?.id
        const canKickThisMember = canKickMemberTarget(member)
        return (
          <div key={member.id}>
            <Tooltip delayDuration={TOOLTIP_DELAY_DURATION_MS}>
              <TooltipTrigger asChild>
                <div className="w-full page-slide">
                  <MemberCard
                    dataCyIndex={index}
                    name={member.name}
                    email={member.email}
                    avatarUrl={member.avatarUrl}
                    role={member.role}
                    roleLabel={roleLabel}
                    roleOptions={isReadOnly ? undefined : (member.rawRole === "OWNER" ? [] : ["Header", "Member"])}
                    onRoleSelect={
                      isReadOnly || member.rawRole === "OWNER"
                        ? undefined
                        : (role) => onRoleChange(member.id, role)
                    }
                    department={member.department}
                    availableDepartments={isReadOnly ? undefined : memberDepartmentOptions}
                    onDepartmentSelect={
                      isReadOnly || !memberDepartmentOptions
                        ? undefined
                        : (department) => handleSetMemberDepartment(member.id, department)
                    }
                    readOnly={isReadOnly}
                    departmentColors={departmentStyles}
                    onKick={canKickThisMember && !isSelf ? () => requestKickMember(member) : undefined}
                    kickDisabled={kickingMemberId === member.id}
                    onClick={() => openMemberDetails(member)}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>
                Click to view member details
              </TooltipContent>
            </Tooltip>
          </div>
        )
      })}
    </>
  )
}
