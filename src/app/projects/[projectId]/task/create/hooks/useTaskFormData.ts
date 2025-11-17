"use client"

import { useCallback, useEffect, useState } from "react"
import type { TaskAssigneeOption, TaskFormValues } from "@/components/tasks"

type TaskFormMemberResponse = {
  id: string
  username: string
  fullName: string | null
  role: string
  department: {
    id: string
    name: string
    color: string
    textColor: string
  } | null
}

export function useTaskFormData(projectId?: string) {
  const [memberOptions, setMemberOptions] = useState<TaskAssigneeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!projectId) {
      setMemberOptions([])
      setError("Unable to load task form data")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        cache: "no-store",
      })

      if (response.status === 404) {
        throw new Error("Not found")
      }
      if (!response.ok) {
        throw new Error("Failed to load form data")
      }

      const members = (await response.json()) as TaskFormMemberResponse[]
      setMemberOptions(
        members.map((member) => ({
          id: member.id,
          label: member.username || member.fullName || "Member",
          username: member.username,
          fullName: member.fullName,
          role: member.role,
          departmentName: member.department?.name ?? null,
          departmentColor: member.department?.color ?? null,
          departmentTextColor: member.department?.textColor ?? null,
        }))
      )
    } catch (error) {
      console.error(error)
      setError("Unable to load task form data")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void load()
  }, [load])

  return { memberOptions, loading, error, reload: load }
}

export async function createProjectTask(
  projectId: string,
  values: TaskFormValues
): Promise<void> {
  const response = await fetch(`/api/projects/${projectId}/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(values),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message =
      typeof payload?.error === "string" ? payload.error : "Failed to create task"
    throw new Error(message)
  }
}
