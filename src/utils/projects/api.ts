"use client"

export type ProjectRecord = {
  id: string
  ownerId: string
  title: string
  description: string | null
  departments: string[]
  imageUrl: string | null
  createdAt: string
  updatedAt: string
}

export type ProjectInput = {
  title: string
  description: string | null
  departments: string[]
  imageUrl: string | null
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
