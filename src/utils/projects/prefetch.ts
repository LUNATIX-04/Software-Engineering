"use client"

import type { TaskRecord } from "@/app/projects/[projectId]/task/data"
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
} from "@/utils/projects/api"

export function loadProjectRecord(projectId: string) {
  return fetchProjectById(projectId)
}

export function getCachedProjectRecord(projectId: string) {
  return undefined
}

export function invalidateProjectRecord(projectId: string) {
  // no cache to invalidate
}

export function loadProjectMembers(projectId: string) {
  return fetchProjectMembers(projectId)
}

export function getCachedProjectMembers(projectId: string) {
  return undefined
}

export function invalidateProjectMembers(projectId: string) {
  // no cache to invalidate
}

export function loadProjectMembership(projectId: string) {
  return fetchProjectMembership(projectId)
}

export function getCachedProjectMembership(projectId: string) {
  return undefined
}

export function invalidateProjectMembership(projectId: string) {
  // no cache to invalidate
}

export function loadProjectDepartments(projectId: string) {
  return fetchProjectDepartments(projectId)
}

export function getCachedProjectDepartments(projectId: string) {
  return undefined
}

export function invalidateProjectDepartments(projectId: string) {
  // no cache to invalidate
}

export function loadProjectTasks(projectId: string) {
  return fetchProjectTasks(projectId)
}

export function getCachedProjectTasks(projectId: string) {
  return undefined
}

export function invalidateProjectTasks(projectId: string) {
  // no cache to invalidate
}

export function prefetchProjectBundle(projectId: string): Promise<void> {
  return Promise.resolve()
}

export function refreshProjectCache(projectId: string): Promise<void> {
  return Promise.resolve()
}
