import type { TaskRecord, TaskStatus } from "@/app/projects/[projectId]/task/data"
import type { ProjectMemberStatus, ProjectRole } from "@/types/projects"
export type { ProjectRole }
export type TaskScopeFilter = "assignee" | "assigner"

export type ProjectMembershipSummary = {
  id: string
  role: ProjectRole
  username: string
  departmentId: string | null
  status: ProjectMemberStatus
}

export type ProjectInviteRecord = {
  id: string
  token: string
  role: ProjectRole
  departmentId: string | null
  department?: {
    id: string
    name: string
  } | null
  expiresAt: string | null
  revokedAt: string | null
  createdAt: string
  maxUses: number | null
  useCount: number
}

export type ProjectMemberDetail = {
  id: string
  projectId: string
  userId: string
  role: ProjectRole
  username: string
  email: string | null
  fullName: string | null
  avatarUrl: string | null
  bio: string | null
  department: {
    id: string
    name: string
    color: string
    textColor: string
  } | null
  lastSeenAt: string | null
}

export type ProjectRecord = {
  id: string
  ownerId: string
  title: string
  description: string | null
  departments: string[]
  imageUrl: string | null
  createdAt: string
  updatedAt: string
  membership: ProjectMembershipSummary
  lastActivity?: string
}

export type ProjectInput = {
  title: string
  description: string | null
  departments: string[]
  imageUrl: string | null
}

export type TaskListOptions = {
  search?: string
  departmentNames?: string[]
  departmentIds?: string[]
  statuses?: TaskStatus[]
  scope?: TaskScopeFilter
  memberId?: string
  page?: number
  pageSize?: number
  signal?: AbortSignal
}

export type TaskListResponse = {
  tasks: TaskRecord[]
  page: number
  pageSize: number
  totalCount: number | null
  totalPages: number | null
}

async function handleJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await safeJson(response)
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return (await response.json()) as T
}

async function safeJson(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function fetchProjects(): Promise<ProjectRecord[]> {
  const response = await fetch("/api/projects", {
    method: "GET",
    cache: "no-store",
  })
  return handleJsonResponse<ProjectRecord[]>(response)
}

export async function fetchProjectById(id: string): Promise<ProjectRecord | null> {
  const response = await fetch(`/api/projects/${id}`, {
    method: "GET",
    cache: "no-store",
  })

  if (response.status === 404) {
    return null
  }

  return handleJsonResponse<ProjectRecord>(response)
}

export async function createProject(input: ProjectInput) {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  return handleJsonResponse<ProjectRecord>(response)
}

export async function updateProject(id: string, input: ProjectInput) {
  const response = await fetch(`/api/projects/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  return handleJsonResponse<ProjectRecord>(response)
}

export async function deleteProject(id: string) {
  const response = await fetch(`/api/projects/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const payload = await safeJson(response)
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : `Failed to delete project (status ${response.status})`
    throw new Error(message)
  }
}

export async function markProjectUsage(id: string) {
  await fetch(`/api/projects/${id}/usage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  })
}

export async function fetchProjectMembership(
  projectId: string
): Promise<ProjectMembershipSummary> {
  const response = await fetch(`/api/projects/${projectId}/membership`, {
    method: "GET",
    cache: "no-store",
  })

  return handleJsonResponse<ProjectMembershipSummary>(response)
}

export async function changeProjectUsername(projectId: string, username: string) {
  await fetch(`/api/projects/${projectId}/members/username`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username }),
  }).then(handleJsonResponse)
}

export async function leaveProject(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/members/leave`, {
    method: "POST",
  })

  if (!response.ok) {
    const payload = await safeJson(response)
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : `Failed to leave project (status ${response.status})`
    throw new Error(message)
  }
}

export async function fetchProjectInvites(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/invites`, {
    method: "GET",
    cache: "no-store",
  })
  return handleJsonResponse<ProjectInviteRecord[]>(response)
}

export async function createProjectInvite(
  projectId: string,
  input: {
    expiresAt?: string | null
    role?: ProjectRole
    departmentId?: string | null
    maxUses?: number | null
  }
) {
  const response = await fetch(`/api/projects/${projectId}/invites`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })
  return handleJsonResponse<ProjectInviteRecord>(response)
}

export async function deleteProjectInvite(projectId: string, inviteId: string) {
  const response = await fetch(`/api/projects/${projectId}/invites/${inviteId}`, {
    method: "DELETE",
  })
  if (!response.ok) {
    const payload = await safeJson(response)
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : `Failed to revoke invite (status ${response.status})`
    throw new Error(message)
  }
}

export async function fetchProjectMembers(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/members`, {
    method: "GET",
    cache: "no-store",
  })
  return handleJsonResponse<ProjectMemberDetail[]>(response)
}

export async function fetchProjectTasks(
  projectId: string,
  options?: TaskListOptions
): Promise<TaskListResponse> {
  const searchParams = new URLSearchParams()

  if (options?.search?.trim()) {
    searchParams.set("search", options.search.trim())
  }

  ;(options?.departmentIds ?? []).forEach((id) => searchParams.append("departmentId", id))
  ;(options?.departmentNames ?? []).forEach((name) => searchParams.append("departmentName", name))
  ;(options?.statuses ?? []).forEach((status) => searchParams.append("status", status))

  if (options?.scope) {
    searchParams.set("scope", options.scope)
  }

  if (options?.memberId) {
    searchParams.set("memberId", options.memberId)
  }

  if (options?.page && Number.isFinite(options.page)) {
    searchParams.set("page", String(Math.max(1, Math.trunc(options.page))))
  }

  if (options?.pageSize && Number.isFinite(options.pageSize)) {
    searchParams.set("pageSize", String(Math.max(1, Math.trunc(options.pageSize))))
  }

  const querySuffix = searchParams.toString()
  const response = await fetch(
    `/api/projects/${projectId}/tasks${querySuffix.length > 0 ? `?${querySuffix}` : ""}`,
    {
      method: "GET",
      cache: "no-store",
      signal: options?.signal,
    }
  )

  const payload = await handleJsonResponse<TaskRecord[]>(response)

  const parseHeaderNumber = (value: string | null) => {
    if (!value) return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  const pageHeader = parseHeaderNumber(response.headers.get("x-page"))
  const pageSizeHeader = parseHeaderNumber(response.headers.get("x-page-size"))
  const totalCountHeader = parseHeaderNumber(response.headers.get("x-total-count"))
  const totalPagesHeader = parseHeaderNumber(response.headers.get("x-total-pages"))

  const resolvedPage = pageHeader ?? options?.page ?? 1
  const resolvedPageSize = Math.max(
    1,
    pageSizeHeader ?? options?.pageSize ?? (payload.length > 0 ? payload.length : 1)
  )
  const resolvedTotalCount = totalCountHeader ?? payload.length
  const resolvedTotalPages =
    totalPagesHeader ??
    (resolvedTotalCount && resolvedPageSize
      ? Math.max(1, Math.ceil(resolvedTotalCount / resolvedPageSize))
      : 1)

  return {
    tasks: payload,
    page: resolvedPage,
    pageSize: resolvedPageSize,
    totalCount: resolvedTotalCount,
    totalPages: resolvedTotalPages,
  }
}

export async function updateProjectMember(
  projectId: string,
  input: { memberId: string; role?: ProjectRole; departmentId?: string | null }
) {
  const response = await fetch(`/api/projects/${projectId}/members`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })
  return handleJsonResponse<{ success: boolean }>(response)
}

export async function updateProjectOwners(projectId: string, ownerIds: string[]) {
  const response = await fetch(`/api/projects/${projectId}/owners`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ownerIds }),
  })
  if (!response.ok) {
    const payload = await safeJson(response)
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : `Failed to update project owners (status ${response.status})`
    throw new Error(message)
  }
}

export async function kickProjectMember(projectId: string, memberId: string) {
  const response = await fetch(`/api/projects/${projectId}/members`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ memberId }),
  })
  if (!response.ok) {
    const payload = await safeJson(response)
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : `Failed to remove project member (status ${response.status})`
    throw new Error(message)
  }
}
