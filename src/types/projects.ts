export const PROJECT_ROLES = ["OWNER", "HEADER", "MEMBER"] as const
export type ProjectRole = typeof PROJECT_ROLES[number]
export const PROJECT_ROLE = {
  OWNER: "OWNER",
  HEADER: "HEADER",
  MEMBER: "MEMBER",
} as const satisfies Record<ProjectRole, ProjectRole>

export const PROJECT_MEMBER_STATUSES = ["ACTIVE", "INVITED"] as const
export type ProjectMemberStatus = typeof PROJECT_MEMBER_STATUSES[number]
export const PROJECT_MEMBER_STATUS = {
  ACTIVE: "ACTIVE",
  INVITED: "INVITED",
} as const satisfies Record<ProjectMemberStatus, ProjectMemberStatus>
