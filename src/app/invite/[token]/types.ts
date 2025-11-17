export type InvitePayload = {
  id: string
  project: {
    id: string
    title: string
  }
  role: string
  departmentId: string | null
  departmentName?: string | null
  expiresAt: string | null
}
