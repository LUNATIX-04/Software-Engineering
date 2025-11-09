import type { Prisma } from "@prisma/client"

import { projectMembers } from "@/server/projects/db"
import type { ProjectMemberStatus, ProjectRole } from "@/types/projects"
import { PROJECT_MEMBER_STATUS, PROJECT_ROLE } from "@/types/projects"

type MembershipWithProject = Prisma.ProjectMemberGetPayload<{
  include: { project: true }
}>

type FetchOptions = {
  projectId: string
  userId: string
  includeProject?: boolean
}

async function fetchMembershipWithProject({ projectId, userId, includeProject = true }: FetchOptions) {
  return projectMembers.findFirst({
    where: {
      projectId,
      userId,
      status: PROJECT_MEMBER_STATUS.ACTIVE,
    },
    include: includeProject
      ? {
          project: true,
        }
      : undefined,
  })
}

export async function requireProjectMembership(
  projectId: string,
  userId: string,
  roles?: ProjectRole[]
) {
  const membership = await fetchMembershipWithProject({ projectId, userId })
  if (!membership || !membership.project) {
    throw new Error("not_found")
  }
  if (roles && !roles.includes(membership.role)) {
    throw new Error("forbidden")
  }
  return membership as MembershipWithProject
}

export async function ensureActiveMembership(projectId: string, userId: string) {
  const membership = await fetchMembershipWithProject({ projectId, userId, includeProject: false })
  if (!membership) {
    throw new Error("not_found")
  }
  return membership
}

export function canManageMembers(role: ProjectRole) {
  return role === PROJECT_ROLE.OWNER || role === PROJECT_ROLE.HEADER
}

export function canEditProject(role: ProjectRole) {
  return role === PROJECT_ROLE.OWNER
}

export function canInvite(role: ProjectRole) {
  return role === PROJECT_ROLE.OWNER || role === PROJECT_ROLE.HEADER
}
