"use client"

import { useCallback, useEffect, useState } from "react"
import type { TaskAssigneeOption, TaskFormValues } from "@/components/tasks"
import type { ProjectDepartmentRecord } from "@/utils/projects/departments"
import { fetchProjectDepartments } from "@/utils/projects/departments"

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

function buildAssigneeOptions(
  members: TaskFormMemberResponse[],
  departments: ProjectDepartmentRecord[],
): TaskAssigneeOption[] {
  const departmentHeadMap = departments.reduce<Record<string, string | null>>((acc, dept) => {
    acc[dept.id] = dept.head ?? null
    return acc
  }, {})

  return members.map((member) => {
    const department = member.department
    const departmentId = department?.id ?? null
    const headUsername = departmentId ? departmentHeadMap[departmentId] ?? null : null
    const isDepartmentHead = Boolean(headUsername) && headUsername === member.username

    let roleLabel: string | null
    if (member.role === "OWNER") {
      roleLabel = isDepartmentHead ? "Header (Project Owner)" : "Member (Project Owner)"
    } else if (member.role === "HEADER") {
      roleLabel = "Header"
    } else if (member.role === "MEMBER") {
      roleLabel = "Member"
    } else {
      roleLabel = member.role
    }

    return {
      id: member.id,
      label: member.username || member.fullName || "Member",
      username: member.username,
      fullName: member.fullName,
      role: member.role,
      departmentName: department?.name ?? null,
      departmentColor: department?.color ?? null,
      departmentTextColor: department?.textColor ?? null,
      roleLabel,
    }
  })
}

export function useTaskFormData(projectId?: string) {
  const [memberOptions, setMemberOptions] = useState<TaskAssigneeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    if (!projectId) {
      setMemberOptions([])
      setError("Unable to load task form data")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setNotFound(false)

    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        cache: "no-store",
      })

      if (response.status === 404) {
        setNotFound(true)
        throw new Error("Not found")
      }
      if (!response.ok) {
        throw new Error("Failed to load form data")
      }

      const [members, departments] = await Promise.all([
        response.json() as Promise<TaskFormMemberResponse[]>,
        fetchProjectDepartments(projectId),
      ])

      setMemberOptions(buildAssigneeOptions(members, departments))
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

  return { memberOptions, loading, error, reload: load, notFound }
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

