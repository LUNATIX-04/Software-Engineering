"use client"

import { fetchProjectDepartments } from "@/utils/projects/departments"
import type { ProjectDepartmentRecord } from "@/utils/projects/departments"
import {
  fetchProjectById,
  fetchProjectMembers,
  fetchProjectMembership,
  fetchProjectTasks,
  type ProjectMemberDetail,
  type ProjectRecord,
  type ProjectMembershipSummary,
  type TaskListOptions,
  type TaskListResponse,
} from "@/utils/projects/api"

const DEFAULT_TASK_PREFETCH_PAGE_SIZE = 25
const CACHE_TTL_MS = 15 * 1000

type CacheMap<T> = Map<string, T>
type PromiseMap<T> = Map<string, Promise<T>>
type TimeMap = Map<string, number>

const projectCache: CacheMap<ProjectRecord | null> = new Map()
const projectPromises: PromiseMap<ProjectRecord | null> = new Map()
const projectCacheTimes: TimeMap = new Map()

const memberCache: CacheMap<ProjectMemberDetail[] | null> = new Map()
const memberPromises: PromiseMap<ProjectMemberDetail[] | null> = new Map()
const memberCacheTimes: TimeMap = new Map()

const membershipCache: CacheMap<ProjectMembershipSummary | null> = new Map()
const membershipPromises: PromiseMap<ProjectMembershipSummary | null> = new Map()
const membershipCacheTimes: TimeMap = new Map()

const departmentCache: CacheMap<ProjectDepartmentRecord[] | null> = new Map()
const departmentPromises: PromiseMap<ProjectDepartmentRecord[] | null> = new Map()
const departmentCacheTimes: TimeMap = new Map()

const taskCache: CacheMap<TaskListResponse> = new Map()
const taskPromises: PromiseMap<TaskListResponse> = new Map()
const taskCacheTimes: TimeMap = new Map()

type TaskListOptionsWithoutSignal = Omit<TaskListOptions, "signal">

function uniqueStrings(values: string[] | undefined) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b))
}

function normalizeTaskOptions(options?: TaskListOptionsWithoutSignal): TaskListOptions {
  const normalizedSearch = options?.search?.trim() || undefined
  const departmentIds = uniqueStrings(options?.departmentIds)
  const departmentNames = uniqueStrings(options?.departmentNames)
  const statuses = Array.from(new Set(options?.statuses ?? []))
  const scope = options?.scope
  const memberId = options?.memberId?.trim() || undefined
  const page = options?.page && Number.isFinite(options.page) ? Math.max(1, Math.trunc(options.page)) : undefined
  const pageSize = options?.pageSize && Number.isFinite(options.pageSize)
    ? Math.max(1, Math.trunc(options.pageSize))
    : undefined

  return {
    search: normalizedSearch,
    departmentIds,
    departmentNames,
    statuses,
    scope,
    memberId,
    page,
    pageSize,
  }
}

function buildTaskCacheKey(projectId: string, options?: TaskListOptionsWithoutSignal) {
  const normalized = normalizeTaskOptions(options)
  return [
    projectId,
    normalized.search ?? "",
    (normalized.departmentIds ?? []).join(","),
    (normalized.departmentNames ?? []).join(","),
    (normalized.statuses ?? []).join(","),
    normalized.scope ?? "",
    normalized.memberId ?? "",
    normalized.page ?? 0,
    normalized.pageSize ?? 0,
  ].join("|")
}

function resolveCached<T>(
  cache: CacheMap<T>,
  promises: PromiseMap<T>,
  times: TimeMap,
  key: string,
  fetcher: () => Promise<T>
) {
  const seenAt = times.get(key)
  if (cache.has(key) && seenAt && Date.now() - seenAt <= CACHE_TTL_MS) {
    return Promise.resolve(cache.get(key) as T)
  }
  const inFlight = promises.get(key)
  if (inFlight) {
    return inFlight
  }
  const promise = fetcher()
    .then((result) => {
      cache.set(key, result)
      times.set(key, Date.now())
      promises.delete(key)
      return result
    })
    .catch((error) => {
      promises.delete(key)
      throw error
    })
  promises.set(key, promise)
  return promise
}

export function loadProjectRecord(projectId: string) {
  return resolveCached(projectCache, projectPromises, projectCacheTimes, projectId, () =>
    fetchProjectById(projectId)
  )
}

export function getCachedProjectRecord(projectId: string) {
  const ts = projectCacheTimes.get(projectId)
  return ts && Date.now() - ts <= CACHE_TTL_MS ? projectCache.get(projectId) : undefined
}

export function invalidateProjectRecord(projectId: string) {
  projectCache.delete(projectId)
  projectPromises.delete(projectId)
  projectCacheTimes.delete(projectId)
}

export function loadProjectMembers(projectId: string) {
  return resolveCached(memberCache, memberPromises, memberCacheTimes, projectId, () =>
    fetchProjectMembers(projectId)
  )
}

export function getCachedProjectMembers(projectId: string) {
  const ts = memberCacheTimes.get(projectId)
  return ts && Date.now() - ts <= CACHE_TTL_MS ? memberCache.get(projectId) : undefined
}

export function invalidateProjectMembers(projectId: string) {
  memberCache.delete(projectId)
  memberPromises.delete(projectId)
  memberCacheTimes.delete(projectId)
}

export function loadProjectMembership(projectId: string) {
  return resolveCached(
    membershipCache,
    membershipPromises,
    membershipCacheTimes,
    projectId,
    () => fetchProjectMembership(projectId)
  )
}

export function getCachedProjectMembership(projectId: string) {
  const ts = membershipCacheTimes.get(projectId)
  return ts && Date.now() - ts <= CACHE_TTL_MS ? membershipCache.get(projectId) : undefined
}

export function invalidateProjectMembership(projectId: string) {
  membershipCache.delete(projectId)
  membershipPromises.delete(projectId)
  membershipCacheTimes.delete(projectId)
}

export function loadProjectDepartments(projectId: string) {
  return resolveCached(
    departmentCache,
    departmentPromises,
    departmentCacheTimes,
    projectId,
    () => fetchProjectDepartments(projectId)
  )
}

export function getCachedProjectDepartments(projectId: string) {
  const ts = departmentCacheTimes.get(projectId)
  return ts && Date.now() - ts <= CACHE_TTL_MS ? departmentCache.get(projectId) : undefined
}

export function invalidateProjectDepartments(projectId: string) {
  departmentCache.delete(projectId)
  departmentPromises.delete(projectId)
  departmentCacheTimes.delete(projectId)
}

export function loadProjectTasks(
  projectId: string,
  options?: TaskListOptions
): Promise<TaskListResponse> {
  const { signal, ...restOptions } = options ?? {}
  const cacheKey = buildTaskCacheKey(projectId, restOptions)
  return resolveCached(taskCache, taskPromises, taskCacheTimes, cacheKey, () =>
    fetchProjectTasks(projectId, { ...normalizeTaskOptions(restOptions), signal })
  )
}

export function getCachedProjectTasks(projectId: string, options?: TaskListOptionsWithoutSignal) {
  const key = buildTaskCacheKey(projectId, options)
  const ts = taskCacheTimes.get(key)
  return ts && Date.now() - ts <= CACHE_TTL_MS ? taskCache.get(key) : undefined
}

export function invalidateProjectTasks(projectId: string) {
  Array.from(taskCache.keys()).forEach((key) => {
    if (key.startsWith(`${projectId}|`)) {
      taskCache.delete(key)
      taskPromises.delete(key)
      taskCacheTimes.delete(key)
    }
  })
}

export function prefetchProjectBundle(
  projectId: string,
  options?: { taskPage?: number; taskPageSize?: number }
): Promise<void> {
  if (!projectId) {
    return Promise.resolve()
  }
  const taskOptions: TaskListOptions = {
    page: options?.taskPage ?? 1,
    pageSize: options?.taskPageSize ?? DEFAULT_TASK_PREFETCH_PAGE_SIZE,
  }

  return Promise.allSettled([
    loadProjectRecord(projectId),
    loadProjectMembership(projectId),
    loadProjectDepartments(projectId),
    loadProjectMembers(projectId),
    loadProjectTasks(projectId, taskOptions),
  ]).then(() => undefined)
}

export function refreshProjectCache(projectId: string): Promise<void> {
  invalidateProjectRecord(projectId)
  invalidateProjectMembership(projectId)
  invalidateProjectDepartments(projectId)
  invalidateProjectMembers(projectId)
  invalidateProjectTasks(projectId)
  return prefetchProjectBundle(projectId)
}
