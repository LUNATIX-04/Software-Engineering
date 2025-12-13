import { PROJECT_ROLE, type ProjectMembershipSummary } from "@/types/projects"
import { getCachedProjectMembership, loadProjectMembership } from "@/utils/projects/prefetch"

export type ProjectMetadata = {
  membership: ProjectMembershipSummary | null
  role: PROJECT_ROLE | null
  isOwner: boolean
  isHeader: boolean
}

const metadataCache = new Map<string, ProjectMetadata>()
const metadataPromises = new Map<string, Promise<ProjectMetadata>>()

function normalizeMetadata(membership: ProjectMembershipSummary | null): ProjectMetadata {
  const role = membership?.role ?? null
  return {
    membership,
    role,
    isOwner: role === PROJECT_ROLE.OWNER,
    isHeader: role === PROJECT_ROLE.HEADER,
  }
}

export function getCachedProjectMetadata(projectId: string): ProjectMetadata | null {
  const cached = metadataCache.get(projectId)
  if (cached) return cached
  const membership = getCachedProjectMembership(projectId) ?? null
  if (!membership) {
    return null
  }
  const normalized = normalizeMetadata(membership)
  metadataCache.set(projectId, normalized)
  return normalized
}

export async function loadProjectMetadata(projectId: string): Promise<ProjectMetadata> {
  if (metadataCache.has(projectId)) {
    return metadataCache.get(projectId) as ProjectMetadata
  }
  if (metadataPromises.has(projectId)) {
    return metadataPromises.get(projectId) as Promise<ProjectMetadata>
  }

  const promise = loadProjectMembership(projectId)
    .then((membership) => {
      const normalized = normalizeMetadata(membership ?? null)
      metadataCache.set(projectId, normalized)
      return normalized
    })
    .catch(() => {
      const normalized = normalizeMetadata(null)
      metadataCache.set(projectId, normalized)
      return normalized
    })
    .finally(() => {
      metadataPromises.delete(projectId)
    })

  metadataPromises.set(projectId, promise)
  return promise
}
