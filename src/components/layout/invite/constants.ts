import { PROJECT_ROLE, type ProjectRole } from "@/types/projects"

type InviteExpiryOption =
  | "never"
  | "3m"
  | "5m"
  | "15m"
  | "1h"
  | "3h"
  | "12h"
  | "1d"
  | "7d"
  | "30d"
  | "custom"

const INVITE_EXPIRY_OPTIONS: Array<{ value: InviteExpiryOption; label: string }> = [
  { value: "never", label: "No expiry" },
  { value: "3m", label: "3 minutes" },
  { value: "5m", label: "5 minutes" },
  { value: "15m", label: "15 minutes" },
  { value: "1h", label: "1 hour" },
  { value: "3h", label: "3 hours" },
  { value: "12h", label: "12 hours" },
  { value: "1d", label: "1 day" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "1 month" },
]

const INVITE_EXPIRY_PRESETS_MS: Record<Exclude<InviteExpiryOption, "never">, number> = {
  "3m": 3 * 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "3h": 3 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  custom: 0,
}

type InviteRoleOptionKey = "member" | "header" | "owner" | "ownerHead"
type InviteRoleOption = {
  key: InviteRoleOptionKey
  role: ProjectRole
  label: string
  requiresOwner: boolean
  headExclusive: boolean
}

const INVITE_ROLE_OPTIONS: InviteRoleOption[] = [
  { key: "member", role: PROJECT_ROLE.MEMBER, label: "Member", requiresOwner: false, headExclusive: false },
  { key: "header", role: PROJECT_ROLE.HEADER, label: "Header", requiresOwner: false, headExclusive: true },
  { key: "owner", role: PROJECT_ROLE.OWNER, label: "Project Owner", requiresOwner: true, headExclusive: false },
  {
    key: "ownerHead",
    role: PROJECT_ROLE.OWNER,
    label: "Header (Project Owner)",
    requiresOwner: true,
    headExclusive: true,
  },
]

export type { InviteExpiryOption, InviteRoleOption, InviteRoleOptionKey }
export { INVITE_EXPIRY_OPTIONS, INVITE_EXPIRY_PRESETS_MS, INVITE_ROLE_OPTIONS }
