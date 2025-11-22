"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Plus, PlusCircle } from "lucide-react"
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"

import { useNotifications } from "@/components/notifications/Notification"
import { Button } from "@/components/ui/button"
import { ProgressBar } from "@/components/ui/progress-bar"
import { PROJECT_REFRESH_EVENT } from "@/constants/events"
import { useNavigationAbort } from "@/hooks/useNavigationAbort"
import {
  createProjectDepartment,
  deleteProjectDepartment,
  type ProjectDepartmentRecord,
  updateProjectDepartment,
} from "@/utils/projects/departments"
import {
  updateProjectMember,
  type ProjectMemberDetail,
  type ProjectMembershipSummary,
} from "@/utils/projects/api"
import {
  getCachedProjectDepartments,
  getCachedProjectMembers,
  getCachedProjectMembership,
  invalidateProjectDepartments,
  loadProjectDepartments,
  loadProjectMembers,
} from "@/utils/projects/prefetch"
import { getCachedProjectMetadata, loadProjectMetadata } from "@/utils/projects/metadata"
import { generatePastelColor, getContrastingTextColor } from "@/utils/colors"
import { PROJECT_ROLE } from "@/types/projects"
import BackButton from "@/components/navigation/BackButton"

import DepartmentCard from "./components/DepartmentCard"
import { SearchField } from "@/components/ui/search-field"
import { HeadOption } from "./types"

type ProjectDepartmentPageProps = {
  params: Promise<{
    projectId: string
  }>
}

type HeadCandidate = {
  username: string
  label: string
  departmentId: string | null
  memberId: string
  role: ProjectMemberDetail["role"]
}

export default function ProjectDepartmentPage({ params }: ProjectDepartmentPageProps) {
  const { projectId } = React.use(params)
  const { notify } = useNotifications()
  const cachedDepartments = getCachedProjectDepartments(projectId)
  const cachedMembers = getCachedProjectMembers(projectId)
  const cachedMetadata = getCachedProjectMetadata(projectId)
  const cachedMembership = getCachedProjectMembership(projectId)
  const [membership, setMembership] = useState<ProjectMembershipSummary | null>(
    cachedMetadata?.membership ?? cachedMembership ?? null
  )
  const [membershipLoading, setMembershipLoading] = useState(
    cachedMetadata ? false : cachedMembership === undefined
  )
  const [members, setMembers] = useState<ProjectMemberDetail[]>(cachedMembers ?? [])
  const [membersError, setMembersError] = useState<string | null>(null)

  const [departments, setDepartments] = useState<ProjectDepartmentRecord[]>(cachedDepartments ?? [])
  const [loading, setLoading] = useState(cachedDepartments === undefined)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)
  const [updatingMap, setUpdatingMap] = useState<Record<string, boolean>>({})
  const [autoEditId, setAutoEditId] = useState<string | null>(null)
  const handleAutoEditComplete = useCallback(() => setAutoEditId(null), [])
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )
  const viewerRole = membership?.role ?? cachedMetadata?.role ?? null
  const viewerDepartmentId = membership?.departmentId ?? null
  const viewerUsername = membership?.username ?? null
  const canManageDepartments = viewerRole === PROJECT_ROLE.OWNER
  const showCreateDepartmentButton = membershipLoading || canManageDepartments

  const colorUpdateTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const pendingColors = useRef<Record<string, string>>({})
  const pendingScrollId = useRef<string | null>(null)
  const navigationAbortRef = useNavigationAbort(() => {
    Object.values(colorUpdateTimers.current).forEach((timer) => {
      clearTimeout(timer)
    })
    colorUpdateTimers.current = {}
  })
  const sortedDepartments = useCallback(
    (list: ProjectDepartmentRecord[]) =>
      [...list].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
    []
  )
  const applyPendingColors = useCallback((list: ProjectDepartmentRecord[]) => {
    return list.map((dept) => {
      const pendingColor = pendingColors.current[dept.id]
      return pendingColor
        ? { ...dept, color: pendingColor, textColor: getContrastingTextColor(pendingColor) }
        : dept
    })
  }, [])

  const loadDepartments = useCallback(async () => {
    if (navigationAbortRef.current) {
      return
    }
    const shouldShowLoading = getCachedProjectDepartments(projectId) === undefined
    if (shouldShowLoading) {
      setLoading(true)
    }
    setLoadError(null)
    try {
      const data = await loadProjectDepartments(projectId)
      if (navigationAbortRef.current) {
        return
      }
      setDepartments(applyPendingColors(sortedDepartments(data)))
    } catch (error) {
      console.error("Failed to load departments", error)
      const message =
        error instanceof Error ? error.message : "Unable to load project departments."
      if (!navigationAbortRef.current) {
        setLoadError(message)
        notify({
          title: "Load departments failed",
          description: message,
          variant: "destructive",
        })
      }
    } finally {
      if (shouldShowLoading && !navigationAbortRef.current) {
        setLoading(false)
      }
    }
  }, [applyPendingColors, navigationAbortRef, notify, projectId, sortedDepartments])

  const loadMembers = useCallback(async () => {
    if (!projectId || navigationAbortRef.current) {
      return
    }
    setMembersError(null)
    try {
      const data = await loadProjectMembers(projectId)
      if (navigationAbortRef.current) {
        return
      }
      setMembers(data)
    } catch (error) {
      console.error("Failed to load project members", error)
      if (!navigationAbortRef.current) {
        setMembersError("Unable to load members for head selection.")
      }
    }
  }, [navigationAbortRef, projectId])

  useEffect(() => {
    if (navigationAbortRef.current) {
      return
    }
    const cached = getCachedProjectDepartments(projectId)
    setDepartments(cached ? applyPendingColors(sortedDepartments(cached)) : [])
    setLoading(cached === undefined)
    loadDepartments()
  }, [applyPendingColors, loadDepartments, navigationAbortRef, projectId, sortedDepartments])

  useEffect(() => {
    if (navigationAbortRef.current) {
      return
    }
    const cached = getCachedProjectMembers(projectId)
    setMembers(cached ?? [])
    loadMembers()
  }, [loadMembers, navigationAbortRef, projectId])

  useEffect(() => {
    let active = true
    if (!projectId || navigationAbortRef.current) {
      setMembership(null)
      setMembershipLoading(false)
      return
    }
    const cached = getCachedProjectMetadata(projectId)
    if (cached) {
      setMembership(cached.membership)
      setMembershipLoading(false)
    } else {
      setMembershipLoading(true)
    }
    loadProjectMetadata(projectId)
      .then((metadata) => {
        if (!active || navigationAbortRef.current) return
        setMembership(metadata.membership)
      })
      .catch((error) => {
        console.error("Failed to load project metadata", error)
        if (active && !navigationAbortRef.current) {
          setMembership(null)
        }
      })
      .finally(() => {
        if (active && !navigationAbortRef.current) {
          setMembershipLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [navigationAbortRef, projectId])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    const handleProjectRefresh = (
      event: Event
    ) => {
      if (navigationAbortRef.current) {
        return
      }
      const detail = (
        event as CustomEvent<{ projectId?: string | null; source?: string; origin?: string }>
      ).detail
      if (detail?.projectId && detail.projectId !== projectId) {
        return
      }
      if (detail?.origin === "department-page") {
        return
      }
      if (
        detail?.source === "department-head" ||
        detail?.source === "department-order" ||
        detail?.source === "department-delete"
      ) {
        return
      }
      loadDepartments()
      loadMembers()
    }
    window.addEventListener(PROJECT_REFRESH_EVENT, handleProjectRefresh)
    return () => window.removeEventListener(PROJECT_REFRESH_EVENT, handleProjectRefresh)
  }, [loadDepartments, loadMembers, navigationAbortRef, projectId])

  useEffect(() => {
    return () => {
      Object.values(colorUpdateTimers.current).forEach((timer) => {
        clearTimeout(timer)
      })
    }
  }, [])

  useEffect(() => {
    if (!pendingScrollId.current) {
      return
    }
    const target = document.getElementById(`department-card-${pendingScrollId.current}`)
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" })
      pendingScrollId.current = null
    }
  }, [departments])

  const headCandidates = useMemo<HeadCandidate[]>(() => {
    const seen = new Set<string>()
    return members.reduce<HeadCandidate[]>((acc, member) => {
      if (!member.username || seen.has(member.username)) {
        return acc
      }
      seen.add(member.username)
      acc.push({
        username: member.username,
        label: member.username,
        departmentId: member.department?.id ?? null,
        memberId: member.id,
        role: member.role,
      })
      return acc
    }, [])
  }, [members])

  const headAssignments = useMemo(() => {
    const map = new Map<string, string>()
    departments.forEach((dept) => {
      if (dept.head) {
        map.set(dept.head, dept.id)
      }
    })
    return map
  }, [departments])

  const headLabelMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    headCandidates.forEach((candidate) => {
      map[candidate.username] = candidate.label
    })
    departments.forEach((dept) => {
      if (dept.head && !map[dept.head]) {
        map[dept.head] = dept.head
      }
    })
    return map
  }, [departments, headCandidates])

  const departmentHeadMap = useMemo(() => {
    return departments.reduce<Record<string, string | null>>((acc, dept) => {
      acc[dept.id] = dept.head ?? null
      return acc
    }, {})
  }, [departments])

  const viewerIsDepartmentHead = useMemo(() => {
    if (!viewerDepartmentId || !viewerUsername) {
      return false
    }
    return departmentHeadMap[viewerDepartmentId] === viewerUsername
  }, [departmentHeadMap, viewerDepartmentId, viewerUsername])

  const canControlHead = useCallback(
    (departmentId: string) =>
      viewerRole === PROJECT_ROLE.OWNER ||
      (viewerIsDepartmentHead && viewerDepartmentId === departmentId),
    [viewerDepartmentId, viewerIsDepartmentHead, viewerRole]
  )

  const departmentMemberCounts = useMemo(() => {
    return members.reduce<Record<string, number>>((acc, member) => {
      const deptId = member.department?.id
      if (!deptId) {
        return acc
      }
      acc[deptId] = (acc[deptId] ?? 0) + 1
      return acc
    }, {})
  }, [members])

  const getHeadOptionsForDepartment = useCallback(
    (departmentId: string) => {
      const options: HeadOption[] = [{ value: null, label: "Nothing" }]
      const seen = new Set<string>()
      headCandidates.forEach((candidate) => {
        if (!candidate.username || seen.has(candidate.username)) {
          return
        }
        if (candidate.departmentId !== departmentId) {
          return
        }
        const assignedDeptId = headAssignments.get(candidate.username)
        if (assignedDeptId && assignedDeptId !== departmentId) {
          return
        }
        options.push({ value: candidate.username, label: candidate.label })
        seen.add(candidate.username)
      })
      const currentHead = departments.find((dept) => dept.id === departmentId)?.head
      if (currentHead && !seen.has(currentHead)) {
        options.push({ value: currentHead, label: currentHead })
      }
      return options
    },
    [departments, headAssignments, headCandidates]
  )

  const headCandidateMap = useMemo(() => {
    const map = new Map<string, HeadCandidate>()
    headCandidates.forEach((candidate) => {
      map.set(candidate.username, candidate)
    })
    return map
  }, [headCandidates])

  const filteredDepartments = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return departments
    return departments.filter((dept) => {
      const haystack = [dept.name, dept.head ?? "", String(dept.memberCount)]
        .join(" ")
        .toLowerCase()
      return haystack.includes(normalized)
    })
  }, [departments, search])

  const setDepartmentUpdating = useCallback((departmentId: string, status: boolean) => {
    setUpdatingMap((prev) => {
      if (status) {
        return { ...prev, [departmentId]: true }
      }
      const next = { ...prev }
      delete next[departmentId]
      return next
    })
  }, [])

  const handleSelectHead = useCallback(
    async (departmentId: string, value: string | null) => {
      if (!canControlHead(departmentId)) {
        return
      }
      const nextHead = value ?? null
      const previous = departments.find((dept) => dept.id === departmentId)
      if (!previous || previous.head === nextHead) {
        return
      }

      const nextHeadCandidate = nextHead ? headCandidateMap.get(nextHead) : null
      if (nextHead && (!nextHeadCandidate || nextHeadCandidate.departmentId !== departmentId)) {
        notify({
          title: "Invalid head",
          description: "Select a member who belongs to this department.",
          variant: "destructive",
        })
        return
      }

      setDepartments((prev) =>
        prev.map((dept) => (dept.id === departmentId ? { ...dept, head: nextHead } : dept))
      )
      setDepartmentUpdating(departmentId, true)

      const selfUsername = membership?.username ?? null
      const selfWasHead = previous.head && previous.head === selfUsername
      const nextHeadIsSelf = nextHead && nextHead === selfUsername

      try {
        const updated = await updateProjectDepartment(projectId, departmentId, { head: nextHead })
        setDepartments((prev) =>
          prev.map((dept) => (dept.id === departmentId ? updated : dept))
        )
        notify({
          title: "Head updated",
          description: nextHead ? `"${nextHead}" is now the department head.` : "Head removed.",
          variant: "success",
        })
        const previousHeadUsername = previous.head ?? null
        const roleUpdates: Promise<unknown>[] = []
        const pendingRoleAdjustments: Array<{
          memberId: string
          role: ProjectMemberDetail["role"]
        }> = []
        if (previousHeadUsername && previousHeadUsername !== nextHead) {
          const previousCandidate = headCandidateMap.get(previousHeadUsername)
          if (
            previousCandidate &&
            previousCandidate.role === PROJECT_ROLE.HEADER &&
            previousCandidate.memberId
          ) {
            roleUpdates.push(
              updateProjectMember(projectId, {
                memberId: previousCandidate.memberId,
                role: PROJECT_ROLE.MEMBER,
              })
            )
            pendingRoleAdjustments.push({
              memberId: previousCandidate.memberId,
              role: PROJECT_ROLE.MEMBER,
            })
          }
        }
        if (
          nextHead &&
          nextHeadCandidate &&
          nextHeadCandidate.role !== PROJECT_ROLE.OWNER &&
          nextHeadCandidate.memberId
        ) {
          roleUpdates.push(
            updateProjectMember(projectId, {
              memberId: nextHeadCandidate.memberId,
              role: PROJECT_ROLE.HEADER,
            })
          )
          pendingRoleAdjustments.push({
            memberId: nextHeadCandidate.memberId,
            role: PROJECT_ROLE.HEADER,
          })
        }
        if (roleUpdates.length > 0) {
          await Promise.all(roleUpdates)
          if (pendingRoleAdjustments.length > 0) {
            const adjustmentMap = new Map<string, ProjectMemberDetail["role"]>()
            pendingRoleAdjustments.forEach((adjustment) => {
              adjustmentMap.set(adjustment.memberId, adjustment.role)
            })
            setMembers((prev) =>
              prev.map((member) => {
                const nextRole = adjustmentMap.get(member.id)
                if (!nextRole) {
                  return member
                }
                return {
                  ...member,
                  rawRole: nextRole,
                  role: nextRole,
                }
              })
            )
            if (selfUsername) {
              setMembership((prev) => {
                if (!prev) {
                  return prev
                }
                if (prev.role === PROJECT_ROLE.OWNER) {
                  return prev
                }
                if (selfWasHead && !nextHeadIsSelf) {
                  return { ...prev, role: PROJECT_ROLE.MEMBER }
                }
                if (!selfWasHead && nextHeadIsSelf) {
                  return { ...prev, role: PROJECT_ROLE.HEADER, departmentId: departmentId }
                }
                return prev
              })
            }
          }
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(PROJECT_REFRESH_EVENT, {
              detail: { projectId, source: "department-head" },
            })
          )
        }
      } catch (error) {
        console.error("Failed to update department head", error)
        setDepartments((prev) =>
          prev.map((dept) =>
            dept.id === departmentId ? { ...dept, head: previous.head } : dept
          )
        )
        notify({
          title: "Update failed",
          description: "Unable to update department head. Please try again.",
          variant: "destructive",
        })
      } finally {
        setDepartmentUpdating(departmentId, false)
      }
    },
    [canControlHead, departments, headCandidateMap, membership, notify, projectId, setDepartmentUpdating, setMembership]
  )

  const handleRenameDepartment = useCallback(
    async (departmentId: string, nextName: string) => {
      if (!canManageDepartments) {
        return false
      }
      const trimmed = nextName.trim()
      const previous = departments.find((dept) => dept.id === departmentId)
      if (!previous) {
        return false
      }
      if (trimmed.length === 0) {
        notify({
          title: "Name required",
          description: "Please provide a department name.",
          variant: "destructive",
        })
        return false
      }
      if (previous.name === trimmed) {
        return true
      }

      setDepartments((prev) =>
        prev.map((dept) => (dept.id === departmentId ? { ...dept, name: trimmed } : dept))
      )
      setDepartmentUpdating(departmentId, true)
      try {
        const updated = await updateProjectDepartment(projectId, departmentId, { name: trimmed })
        setDepartments((prev) =>
          prev.map((dept) => (dept.id === departmentId ? updated : dept))
        )
        return true
      } catch (error) {
        console.error("Failed to rename department", error)
        setDepartments((prev) =>
          prev.map((dept) =>
            dept.id === departmentId ? { ...dept, name: previous.name } : dept
          )
        )
        notify({
          title: "Rename failed",
          description: "Unable to update the department name. Please try again.",
          variant: "destructive",
        })
        return false
      } finally {
        setDepartmentUpdating(departmentId, false)
      }
    },
    [canManageDepartments, departments, notify, projectId, setDepartmentUpdating]
  )

  const handleDeleteDepartment = useCallback(
    async (departmentId: string) => {
      if (!canManageDepartments) {
        return
      }
      const target = departments.find((dept) => dept.id === departmentId)
      if (!target) {
        return
      }
      setDepartmentUpdating(departmentId, true)
      try {
        await deleteProjectDepartment(projectId, departmentId)
        setDepartments((prev) => prev.filter((dept) => dept.id !== departmentId))
        notify({
          title: "Department deleted",
          description: `"${target.name}" has been removed.`,
          variant: "info",
        })
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(PROJECT_REFRESH_EVENT, {
              detail: { projectId, source: "department-delete" },
            })
          )
        }
      } catch (error) {
        console.error("Failed to delete department", error)
        notify({
          title: "Delete failed",
          description: "Unable to delete the department. Please try again.",
          variant: "destructive",
        })
        throw error
      } finally {
        setDepartmentUpdating(departmentId, false)
      }
    },
    [canManageDepartments, departments, notify, projectId, setDepartmentUpdating]
  )

  const persistColorUpdate = useCallback(
    async (departmentId: string, color: string) => {
      if (!canManageDepartments) {
        return
      }
      setDepartmentUpdating(departmentId, true)
      try {
        const updated = await updateProjectDepartment(projectId, departmentId, { color })
        setDepartments((prev) =>
          prev.map((dept) => (dept.id === departmentId ? updated : dept))
        )
        delete pendingColors.current[departmentId]
        invalidateProjectDepartments(projectId)
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(PROJECT_REFRESH_EVENT, {
              detail: {
                projectId,
                source: "department-color",
                origin: "department-page",
                departmentId,
                color: updated.color,
                textColor: updated.textColor,
              },
            })
          )
        }
      } catch (error) {
        console.error("Failed to update department color", error)
        delete pendingColors.current[departmentId]
        notify({
          title: "Color update failed",
          description: "Unable to save the selected color. Please try again.",
          variant: "destructive",
        })
        loadDepartments()
      } finally {
        setDepartmentUpdating(departmentId, false)
      }
    },
    [canManageDepartments, invalidateProjectDepartments, loadDepartments, notify, projectId, setDepartmentUpdating]
  )

  const handleSelectColor = useCallback(
    (departmentId: string, color: string) => {
      if (!canManageDepartments) {
        return
      }
      setDepartments((prev) =>
        prev.map((dept) =>
          dept.id === departmentId
            ? { ...dept, color, textColor: getContrastingTextColor(color) }
            : dept
        )
      )
      pendingColors.current[departmentId] = color

      if (colorUpdateTimers.current[departmentId]) {
        clearTimeout(colorUpdateTimers.current[departmentId])
      }

      colorUpdateTimers.current[departmentId] = setTimeout(() => {
        delete colorUpdateTimers.current[departmentId]
        const latestColor = pendingColors.current[departmentId]
        if (!latestColor) {
          return
        }
        persistColorUpdate(departmentId, latestColor)
      }, 350)
    },
    [canManageDepartments, persistColorUpdate]
  )

  const handleCreateDepartment = useCallback(async () => {
    if (!canManageDepartments || creating) {
      return
    }
    const nextOrder =
      departments.reduce((max, dept) => Math.max(max, dept.order), -1) + 1
    setCreating(true)
    try {
      const created = await createProjectDepartment(projectId, {
        name: `Department ${departments.length + 1}`,
        color: generatePastelColor(),
      })
      const normalizedDepartment =
        created.order === nextOrder ? created : { ...created, order: nextOrder }
      pendingScrollId.current = created.id
      setAutoEditId(created.id)
      setDepartments((prev) => sortedDepartments([...prev, normalizedDepartment]))
      if (created.order !== nextOrder) {
        updateProjectDepartment(projectId, created.id, { order: nextOrder })
          .then((updated) =>
            setDepartments((prev) => prev.map((dept) => (dept.id === updated.id ? updated : dept)))
          )
          .catch((error) => {
            console.error("Failed to place new department at end", error)
          })
      }
      notify({
        title: "Department created",
        description: "Double-click the name to rename it anytime.",
        variant: "success",
      })
    } catch (error) {
      console.error("Failed to create department", error)
      const message =
        error instanceof Error ? error.message : "Unable to create department right now."
      notify({
        title: "Create department failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }, [canManageDepartments, creating, departments, notify, projectId, sortedDepartments])

  const persistDepartmentOrder = useCallback(
    async (orderedList: ProjectDepartmentRecord[]) => {
      if (!canManageDepartments) {
        return
      }
      const updates = orderedList
        .map((dept, index) => ({ id: dept.id, nextOrder: index, currentOrder: dept.order }))
        .filter(({ currentOrder, nextOrder }) => currentOrder !== nextOrder)
      if (updates.length === 0) {
        return
      }
      try {
        await Promise.all(
          updates.map(({ id, nextOrder }) => updateProjectDepartment(projectId, id, { order: nextOrder }))
        )
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(PROJECT_REFRESH_EVENT, {
              detail: { projectId, source: "department-order" },
            })
          )
        }
      } catch (error) {
        console.error("Failed to reorder departments", error)
        notify({
          title: "Reorder failed",
          description: "Unable to save the new department order. Please refresh and try again.",
          variant: "destructive",
        })
        loadDepartments()
      }
    },
    [canManageDepartments, loadDepartments, notify, projectId]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!canManageDepartments) {
        return
      }
      const { active, over } = event
      if (!over || active.id === over.id) {
        return
      }
      const activeId = String(active.id)
      const overId = String(over.id)
      setDepartments((prev) => {
        const oldIndex = prev.findIndex((dept) => dept.id === activeId)
        const newIndex = prev.findIndex((dept) => dept.id === overId)
        if (oldIndex === -1 || newIndex === -1) {
          return prev
        }
        const reordered = arrayMove(prev, oldIndex, newIndex)
        void persistDepartmentOrder(reordered)
        return reordered.map((dept, index) => ({
          ...dept,
          order: index,
        }))
      })
    },
    [canManageDepartments, persistDepartmentOrder]
  )

  return (
    <>
      <div className="asap-scroll page-fade w-full min-h-[calc(100vh-6.5rem)] px-[clamp(3.25rem,4vw,3.25rem)] pt-3">
        <div className="flex w-full flex-col items-start gap-4 lg:flex-row lg:items-start lg:gap-6">
          <BackButton dataCy="project-department-back-button" ariaLabel="Back to projects" />

          <div className="mx-auto mt-10 flex w-full max-w-full flex-1 flex-col gap-8 px-[clamp(1.5rem,3vw,3.5rem)] pb-10 page-slide">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <SearchField
                wrapperClassName="w-full max-w-md sm:mr-auto"
                placeholder="Search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                data-cy="department-search-input"
              />
              {showCreateDepartmentButton ? (
                <Button
                  type="button"
                  onClick={handleCreateDepartment}
                  disabled={creating || membershipLoading || !canManageDepartments}
                  data-cy="project-department-create-button"
                  className="inline-flex h-12 select-none items-center gap-2 rounded-full border border-primary/40 bg-white px-6 text-base font-semibold text-primary transition hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
                >
                  <PlusCircle className="size-5" aria-hidden="true" />
                  {creating ? "Creating…" : "Create Department"}
                </Button>
              ) : null}
            </header>
            {membersError ? (
              <p className="text-sm font-semibold text-destructive">{membersError}</p>
            ) : null}

            {loading ? (
              <div className="flex h-48 w-full flex-col items-center justify-center gap-3 rounded-[2.5rem] border-2 border-dashed border-primary/30 bg-white text-primary">
                <span className="text-base font-semibold">Loading departments…</span>
                <ProgressBar className="max-w-md" />
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-[2.5rem] border-2 border-destructive/40 bg-white px-8 py-10 text-center text-destructive">
                <p>{loadError}</p>
                <Button
                  type="button"
                  className="rounded-full px-6"
                  onClick={loadDepartments}
                  variant="default"
                  data-cy="project-department-retry-button"
                >
                  Try again
                </Button>
              </div>
            ) : (
              <section
                className="grid gap-8 mb-10 sm:grid-cols-2 lg:grid-cols-3 page-slide"
                data-project-id={projectId}
                aria-label="Departments"
              >
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={filteredDepartments.map((department) => department.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {filteredDepartments.map((department, index) => (
                      <div key={department.id}>
                        <DepartmentCard
                          dataCyIndex={index}
                          department={department}
                          memberCount={departmentMemberCounts[department.id] ?? department.memberCount}
                          headOptions={getHeadOptionsForDepartment(department.id)}
                          headLabelMap={headLabelMap}
                          onSelectHead={handleSelectHead}
                          onSelectColor={handleSelectColor}
                          onRename={handleRenameDepartment}
                          onDelete={handleDeleteDepartment}
                          autoEditId={autoEditId}
                          onAutoEditComplete={handleAutoEditComplete}
                          disabled={!canManageDepartments || Boolean(updatingMap[department.id])}
                          headControlsDisabled={
                            !canControlHead(department.id) || Boolean(updatingMap[department.id])
                          }
                          colorControlsDisabled={
                            !canManageDepartments || Boolean(updatingMap[department.id])
                          }
                          showManageControls={canManageDepartments}
                        />
                      </div>
                    ))}
                  </SortableContext>
                </DndContext>
                {canManageDepartments ? (
                  <AddDepartmentCard onClick={handleCreateDepartment} creating={creating} />
                ) : null}
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function AddDepartmentCard({
  onClick,
  creating,
}: {
  onClick: () => void
  creating: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={creating}
      data-cy="project-department-add-button"
      className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-4 rounded-[2.75rem] border-2 border-primary/30 bg-white/40 px-6 py-6 text-center text-primary shadow-[0_12px_0_rgba(144,122,214,0.15)] transition hover:border-primary hover:text-primary disabled:opacity-60"
    >
      <span className="flex size-14 items-center justify-center rounded-full border-2 border-current text-primary">
        <Plus className="size-6" />
      </span>
      <span className="text-xl font-semibold">
        {creating ? "Creating…" : "Add Department"}
      </span>
    </button>
  )
}
