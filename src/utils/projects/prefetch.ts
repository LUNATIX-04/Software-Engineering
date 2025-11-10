"use client"

import type { TaskRecord } from "@/app/projects/[projectId]/task/data"
import {
  fetchProjectDepartments,
} from "@/utils/projects/departments"
import type { ProjectDepartmentRecord } from "@/utils/projects/departments"
import {
  fetchProjectById,
  fetchProjectMembers,
  fetchProjectMembership,
  fetchProjectTasks,
  type ProjectMemberDetail,
  type ProjectRecord,
  type ProjectMembershipSummary,
} from "@/utils/projects/api"

type CacheEntry<T> = {
  promise: Promise<T>
  value?: T
}

type Fetcher<T> = {
  load: (key: string, fetcher: () => Promise<T>) => Promise<T>
  peek: (key: string) => T | undefined
  invalidate: (key: string) => void
}

function createFetcher<T>(): Fetcher<T> {
  const store = new Map<string, CacheEntry<T>>()

  const load = (key: string, fetcher: () => Promise<T>) => {
    const existing = store.get(key)
    if (existing) {
      return existing.promise
    }
    const promise = fetcher().then(
      (value) => {
        const entry = store.get(key)
        if (entry) {
          entry.value = value
          entry.promise = Promise.resolve(value)
        }
        return value
      },
      (error) => {
        store.delete(key)
        throw error
      }
    )
    store.set(key, { promise })
    return promise
  }

  const peek = (key: string) => store.get(key)?.value

  const invalidate = (key: string) => {
    store.delete(key)
  }

  return { load, peek, invalidate }
}

const projectFetcher = createFetcher<ProjectRecord | null>()
const membersFetcher = createFetcher<ProjectMemberDetail[]>()
const membershipFetcher = createFetcher<ProjectMembershipSummary>()
const departmentsFetcher = createFetcher<ProjectDepartmentRecord[]>()
const tasksFetcher = createFetcher<TaskRecord[]>()

export function loadProjectRecord(projectId: string) {
  return projectFetcher.load(projectId, () => fetchProjectById(projectId))
}

export function getCachedProjectRecord(projectId: string) {
  return projectFetcher.peek(projectId)
}

export function invalidateProjectRecord(projectId: string) {
  projectFetcher.invalidate(projectId)
}

export function loadProjectMembers(projectId: string) {
  return membersFetcher.load(projectId, () => fetchProjectMembers(projectId))
}

export function getCachedProjectMembers(projectId: string) {
  return membersFetcher.peek(projectId)
}

export function invalidateProjectMembers(projectId: string) {
  membersFetcher.invalidate(projectId)
}

export function loadProjectMembership(projectId: string) {
  return membershipFetcher.load(projectId, () => fetchProjectMembership(projectId))
}

export function getCachedProjectMembership(projectId: string) {
  return membershipFetcher.peek(projectId)
}

export function invalidateProjectMembership(projectId: string) {
  membershipFetcher.invalidate(projectId)
}

export function loadProjectDepartments(projectId: string) {
  return departmentsFetcher.load(projectId, () => fetchProjectDepartments(projectId))
}

export function getCachedProjectDepartments(projectId: string) {
  return departmentsFetcher.peek(projectId)
}

export function invalidateProjectDepartments(projectId: string) {
  departmentsFetcher.invalidate(projectId)
}

export function loadProjectTasks(projectId: string) {
  return tasksFetcher.load(projectId, () => fetchProjectTasks(projectId))
}

export function getCachedProjectTasks(projectId: string) {
  return tasksFetcher.peek(projectId)
}

export function invalidateProjectTasks(projectId: string) {
  tasksFetcher.invalidate(projectId)
}

export function prefetchProjectBundle(projectId: string): Promise<void> {
  if (!projectId) {
    return Promise.resolve()
  }
  return Promise.all([
    loadProjectRecord(projectId).catch(() => null),
    loadProjectMembers(projectId).catch(() => []),
    loadProjectMembership(projectId).catch(() => null),
    loadProjectDepartments(projectId).catch(() => []),
    loadProjectTasks(projectId).catch(() => []),
  ])
    .then(() => undefined)
    .catch(() => undefined)
}

export function refreshProjectCache(projectId: string): Promise<void> {
  if (!projectId) {
    return Promise.resolve()
  }
  invalidateProjectRecord(projectId)
  invalidateProjectMembers(projectId)
  invalidateProjectMembership(projectId)
  invalidateProjectDepartments(projectId)
  invalidateProjectTasks(projectId)
  return prefetchProjectBundle(projectId)
}
