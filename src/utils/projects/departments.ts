"use client"

export type ProjectDepartmentRecord = {
  id: string
  projectId: string
  name: string
  color: string
  textColor: string
  head: string | null
  memberCount: number
  order: number
  createdAt: string
  updatedAt: string
}

export type CreateProjectDepartmentInput = {
  name: string
  color?: string
  textColor?: string
}

export type UpdateProjectDepartmentInput = Partial<{
  name: string
  head: string | null
  memberCount: number
  color: string
  textColor: string
  order: number
}>

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

export async function fetchProjectDepartments(
  projectId: string
): Promise<ProjectDepartmentRecord[]> {
  const response = await fetch(`/api/projects/${projectId}/departments`, {
    method: "GET",
    cache: "no-store",
  })
  return handleJsonResponse<ProjectDepartmentRecord[]>(response)
}

export async function createProjectDepartment(
  projectId: string,
  input: CreateProjectDepartmentInput
): Promise<ProjectDepartmentRecord> {
  const response = await fetch(`/api/projects/${projectId}/departments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })
  return handleJsonResponse<ProjectDepartmentRecord>(response)
}

export async function updateProjectDepartment(
  projectId: string,
  departmentId: string,
  input: UpdateProjectDepartmentInput
): Promise<ProjectDepartmentRecord> {
  const response = await fetch(`/api/projects/${projectId}/departments/${departmentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })
  return handleJsonResponse<ProjectDepartmentRecord>(response)
}

export async function deleteProjectDepartment(projectId: string, departmentId: string) {
  const response = await fetch(`/api/projects/${projectId}/departments/${departmentId}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const payload = await safeJson(response)
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : `Failed to delete department (status ${response.status})`
    throw new Error(message)
  }
}
