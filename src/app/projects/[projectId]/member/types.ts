import type { MemberDepartment, MemberRole } from "@/components/projects/MemberCard"
import type { ProjectMemberDetail, ProjectMembershipSummary } from "@/utils/projects/api"

export type MemberRecord = {
  id: string
  name: string
  email: string | null
  role: MemberRole
  rawRole: ProjectMemberDetail["role"]
  department: MemberDepartment
  departmentId: string | null
  avatarUrl: string | null
  bio: string | null
  fullName: string | null
  lastSeenAt: string | null
}

export type RemoteDepartment = {
  id: string
  name: string
  color: string
  textColor: string
  order: number
  head: string | null
}
