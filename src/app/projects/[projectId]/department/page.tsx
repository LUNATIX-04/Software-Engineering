"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  ChevronDown,
  GripVertical,
  Palette,
  Plus,
  PlusCircle,
  Search,
  Trash2,
  Wand2,
} from "lucide-react"
import { HexColorPicker } from "react-colorful"
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { useNotifications } from "@/components/notifications/Notification"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { TOOLTIP_DELAY_DURATION_MS } from "@/constants/ui"
import {
  DEFAULT_DEPARTMENT_COLORS,
  DEFAULT_DEPARTMENT_TEXT_COLOR,
} from "@/constants/departments"
import { PROJECT_REFRESH_EVENT } from "@/constants/events"
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
  loadProjectDepartments,
  loadProjectMembers,
  loadProjectMembership,
} from "@/utils/projects/prefetch"
import { generatePastelColor, getContrastingTextColor } from "@/utils/colors"
import { PROJECT_ROLE } from "@/types/projects"
import { cn } from "@/lib/utils"

const CARD_TEXT_COLOR = DEFAULT_DEPARTMENT_TEXT_COLOR
const QUICK_COLOR_OPTIONS = [
  { label: "Red", value: "#FFB3B3" },
  { label: "Orange", value: "#FFC9A9" },
  { label: "Yellow", value: "#FFE6A7" },
  { label: "Green", value: "#93E8B9" },
  { label: "Light Green", value: "#CFF7C4" },
  { label: "Sky", value: "#B7E5FF" },
  { label: "Blue", value: "#A9C7FF" },
  { label: "Purple", value: "#CDB4FF" },
  { label: "Pink", value: "#FFB8E2" },
  { label: "Gray", value: "#D9DEE8" },
  { label: "White", value: "#FFFFFF" },
  { label: "Black", value: "#1E1E1E" },
] as const

type ProjectDepartmentPageProps = {
  params: Promise<{
    projectId: string
  }>
}

type HeadOption = {
  value: string | null
  label: string
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
  const router = useRouter()
  const { notify } = useNotifications()
  const cachedDepartments = getCachedProjectDepartments(projectId)
  const cachedMembers = getCachedProjectMembers(projectId)
  const cachedMembership = getCachedProjectMembership(projectId)
  const [membership, setMembership] = useState<ProjectMembershipSummary | null>(
    cachedMembership ?? null
  )
  const [membershipLoading, setMembershipLoading] = useState(
    cachedMembership === undefined
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
  const viewerRole = membership?.role ?? null
  const viewerDepartmentId = membership?.departmentId ?? null
  const viewerUsername = membership?.username ?? null
  const canManageDepartments = viewerRole === PROJECT_ROLE.OWNER

  const colorUpdateTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const pendingColors = useRef<Record<string, string>>({})
  const pendingScrollId = useRef<string | null>(null)
  const sortedDepartments = useCallback(
    (list: ProjectDepartmentRecord[]) =>
      [...list].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
    []
  )

  const loadDepartments = useCallback(async () => {
    const shouldShowLoading = getCachedProjectDepartments(projectId) === undefined
    if (shouldShowLoading) {
      setLoading(true)
    }
    setLoadError(null)
    try {
      const data = await loadProjectDepartments(projectId)
      setDepartments(sortedDepartments(data))
    } catch (error) {
      console.error("Failed to load departments", error)
      const message =
        error instanceof Error ? error.message : "Unable to load project departments."
      setLoadError(message)
      notify({
        title: "Load departments failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      if (shouldShowLoading) {
        setLoading(false)
      }
    }
  }, [notify, projectId, sortedDepartments])

  const loadMembers = useCallback(async () => {
    if (!projectId) {
      return
    }
    setMembersError(null)
    try {
      const data = await loadProjectMembers(projectId)
      setMembers(data)
    } catch (error) {
      console.error("Failed to load project members", error)
      setMembersError("Unable to load members for head selection.")
    }
  }, [projectId])

  useEffect(() => {
    const cached = getCachedProjectDepartments(projectId)
    setDepartments(cached ? sortedDepartments(cached) : [])
    setLoading(cached === undefined)
    loadDepartments()
  }, [projectId, loadDepartments])

  useEffect(() => {
    const cached = getCachedProjectMembers(projectId)
    setMembers(cached ?? [])
    loadMembers()
  }, [projectId, loadMembers])

  useEffect(() => {
    let active = true
    if (!projectId) {
      setMembership(null)
      setMembershipLoading(false)
      return
    }
    const cached = getCachedProjectMembership(projectId)
    const shouldShowLoading = cached === undefined
    setMembership(cached ?? null)
    setMembershipLoading(shouldShowLoading)
    loadProjectMembership(projectId)
      .then((data) => {
        if (!active) {
          return
        }
        setMembership(data)
      })
      .catch((error) => {
        console.error("Failed to load membership", error)
        if (active) {
          setMembership(null)
        }
      })
      .finally(() => {
        if (!active) {
          return
        }
        if (shouldShowLoading) {
          setMembershipLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [projectId])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    const handleProjectRefresh = (
      event: Event
    ) => {
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
  }, [loadDepartments, loadMembers, projectId])

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
    [canManageDepartments, loadDepartments, notify, projectId, setDepartmentUpdating]
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
    setCreating(true)
    try {
      const created = await createProjectDepartment(projectId, {
        name: `Department ${departments.length + 1}`,
        color: generatePastelColor(),
      })
      pendingScrollId.current = created.id
      setAutoEditId(created.id)
      setDepartments((prev) => sortedDepartments([...prev, created]))
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
  }, [canManageDepartments, creating, departments.length, notify, projectId, sortedDepartments])

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

  const handleBackClick = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
      return
    }
    router.push("/projects")
  }, [router])

  return (
    <>
      <div className="asap-scroll w-full min-h-[calc(100vh-6.5rem)] px-[clamp(3.25rem,4vw,3.25rem)] pt-3">
        <div className="flex w-full max-w-7xl flex-col items-start gap-4 lg:flex-row lg:items-start lg:gap-6">
          <div className="sticky top-1 z-10 -ml-3 flex flex-shrink-0 items-start justify-start lg:-mt-0">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBackClick}
              className="inline-flex size-12 items-center justify-center rounded-full border border-primary/20 bg-white text-primary shadow-sm transition hover:border-primary/40 hover:bg-primary/10 focus-visible:border-primary focus-visible:ring-0"
              aria-label="Back to projects"
            >
              <ArrowLeft className="size-6" aria-hidden="true" />
            </Button>
          </div>

          <div className="mx-auto mt-10 flex w-full max-w-7xl flex-1 flex-col gap-10 px-[clamp(1.5rem,3vw,3.5rem)]">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full max-w-md sm:mr-auto">
                <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-primary/60" />
                <input
                  type="text"
                  placeholder="Search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-full border-2 border-primary/40 bg-white py-3 pl-12 pr-4 text-base text-foreground placeholder:text-primary/60 focus:border-primary focus:outline-none"
                  data-cy="department-search-input"
                />
              </div>
              {canManageDepartments ? (
                <Button
                  type="button"
                  onClick={handleCreateDepartment}
                  disabled={creating}
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
              <div className="flex h-48 w-full items-center justify-center rounded-[2.5rem] border-2 border-dashed border-primary/30 bg-white text-primary">
                Loading departments…
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-[2.5rem] border-2 border-destructive/40 bg-white px-8 py-10 text-center text-destructive">
                <p>{loadError}</p>
                <Button
                  type="button"
                  className="rounded-full px-6"
                  onClick={loadDepartments}
                  variant="default"
                >
                  Try again
                </Button>
              </div>
            ) : (
              <section
                className="grid gap-8 mb-10 sm:grid-cols-2 lg:grid-cols-3"
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
                    {filteredDepartments.map((department) => (
                      <DepartmentCard
                        key={department.id}
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

type DepartmentCardProps = {
  department: ProjectDepartmentRecord
  memberCount?: number
  headOptions: HeadOption[]
  headLabelMap: Record<string, string>
  onSelectHead: (departmentId: string, value: string | null) => void
  onSelectColor: (departmentId: string, color: string) => void
  onRename: (departmentId: string, name: string) => Promise<boolean>
  onDelete: (departmentId: string) => Promise<void>
  autoEditId?: string | null
  onAutoEditComplete?: () => void
  disabled?: boolean
  headControlsDisabled?: boolean
  colorControlsDisabled?: boolean
  showManageControls?: boolean
}

function DepartmentCard({
  department,
  memberCount,
  headOptions,
  headLabelMap,
  onSelectHead,
  onSelectColor,
  onRename,
  onDelete,
  autoEditId,
  onAutoEditComplete,
  disabled,
  headControlsDisabled,
  colorControlsDisabled,
  showManageControls = true,
}: DepartmentCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: department.id,
    disabled,
  })
  const [headMenuOpen, setHeadMenuOpen] = useState(false)
  const [colorMenuOpen, setColorMenuOpen] = useState(false)
  const [colorMode, setColorMode] = useState<"presets" | "custom">("presets")
  const [previewColor, setPreviewColor] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(department.name)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function blendColorWithWhite(hexColor: string, blendFactor: number) {
  const sanitized = hexColor.replace("#", "")
  if (sanitized.length !== 6) return hexColor
  const r = parseInt(sanitized.slice(0, 2), 16)
  const g = parseInt(sanitized.slice(2, 4), 16)
  const b = parseInt(sanitized.slice(4, 6), 16)
  const mix = (c: number) => Math.round(c + (255 - c) * blendFactor)
  return `#${[mix(r), mix(g), mix(b)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`
}
  useEffect(() => {
    if (headControlsDisabled) {
      setHeadMenuOpen(false)
    }
  }, [headControlsDisabled])

  useEffect(() => {
    if (!colorMenuOpen) {
      setPreviewColor(null)
    }
  }, [colorMenuOpen])

  const displayColor = previewColor ?? department.color
  const innerTone = useMemo(() => blendColorWithWhite(displayColor, 0.35), [displayColor])

  const textColor = department.textColor || CARD_TEXT_COLOR
  const currentHeadLabel =
    department.head && headLabelMap[department.head]
      ? headLabelMap[department.head]
      : department.head ?? "Nothing"

  useEffect(() => {
    setNameDraft(department.name)
  }, [department.name])

  useEffect(() => {
    if (editingName) {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    }
  }, [editingName])

  useEffect(() => {
    if (autoEditId && autoEditId === department.id) {
      setEditingName(true)
      onAutoEditComplete?.()
    }
  }, [autoEditId, department.id, onAutoEditComplete])

  const handleRename = useCallback(async () => {
    if (disabled) {
      return
    }
    const success = await onRename(department.id, nameDraft)
    if (success) {
      setEditingName(false)
    }
  }, [department.id, disabled, nameDraft, onRename])

  const handleRenameCancel = useCallback(() => {
    setNameDraft(department.name)
    setEditingName(false)
  }, [department.name])

  const handleConfirmDelete = useCallback(async () => {
    setDeleting(true)
    try {
      await onDelete(department.id)
      setDeleteDialogOpen(false)
    } catch {
      // keep dialog open to allow retry
    } finally {
      setDeleting(false)
    }
  }, [department.id, onDelete])

  return (
    <article
      ref={(node) => {
        setNodeRef(node)
        cardRef.current = node as HTMLDivElement | null
      }}
      id={`department-card-${department.id}`}
      className="relative flex flex-col gap-6 rounded-[2.75rem] border-2 border-primary/30 bg-white px-6 py-6 shadow-[0_12px_0_rgba(144,122,214,0.15)] transition-shadow hover:shadow-[0_18px_0_rgba(144,122,214,0.2)]"
      style={{
        backgroundColor: displayColor,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.9 : 1,
      }}
    >
      {showManageControls ? (
        <button
          type="button"
          className="absolute left-4 top-4 inline-flex size-9 items-center justify-center rounded-full border border-white/40 bg-white/70 text-primary shadow-sm transition hover:bg-white disabled:opacity-60"
          aria-label="Reorder department"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      ) : null}
      {showManageControls ? (
        <button
          type="button"
          className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full border border-white/40 bg-white/70 text-primary shadow-sm transition hover:bg-white disabled:opacity-60"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={disabled}
          aria-label={`Delete ${department.name}`}
        >
          <Trash2 className="size-4" />
        </button>
      ) : null}
      <Tooltip delayDuration={TOOLTIP_DELAY_DURATION_MS}>
        <TooltipTrigger asChild>
          <header
            className="group px-6 text-center text-xl font-semibold"
            style={{ color: textColor, cursor: disabled ? "default" : "text" }}
            onDoubleClick={() => {
              if (!disabled) {
                setEditingName(true)
              }
            }}
          >
            {editingName ? (
              <Input
                ref={nameInputRef}
                value={nameDraft}
                maxLength={128}
                onChange={(event) => setNameDraft(event.target.value)}
                onBlur={handleRename}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    handleRename()
                  } else if (event.key === "Escape") {
                    event.preventDefault()
                    handleRenameCancel()
                  }
                }}
                className="mx-auto w-full max-w-[calc(100%-3.5rem)] rounded-full border-primary/40 bg-white text-center text-base font-semibold text-primary"
              />
            ) : (
              <span className="mx-auto block max-w-[calc(100%-3.5rem)] break-all break-words whitespace-normal">
                {department.name}
              </span>
            )}
          </header>
        </TooltipTrigger>
        {!editingName && !disabled && (
          <TooltipContent side="top" sideOffset={6}>
            Double-click to rename
          </TooltipContent>
        )}
      </Tooltip>
      <div
        className="flex flex-col gap-4 rounded-[2rem] border-2 border-primary/30 px-5 py-5"
        style={{ backgroundColor: innerTone }}
      >
        <div className="text-sm font-semibold" style={{ color: textColor }}>
          <span>Head :</span>
          <DropdownMenu open={headControlsDisabled ? false : headMenuOpen} onOpenChange={(open) => {
            if (headControlsDisabled) {
              setHeadMenuOpen(false)
              return
            }
            setHeadMenuOpen(open)
          }}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="mt-2 flex w-full select-none items-center justify-between rounded-full border-2 border-primary/30 bg-white px-4 py-2 text-base font-medium text-primary shadow-[0_6px_0_rgba(144,122,214,0.2)] focus:outline-none disabled:opacity-60"
                disabled={headControlsDisabled}
              >
                <span className={cn(currentHeadLabel === "Nothing" && "text-[#1E1E1E]")}>
                  {currentHeadLabel}
                </span>
                <ChevronDown className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-48 rounded-3xl border border-primary/40 bg-white px-3 py-2 text-sm font-semibold text-primary shadow-[0_10px_30px_rgba(72,68,110,0.2)]"
            >
              {headOptions.map((headOption) => {
                const isActive = headOption.value === department.head
                return (
                  <DropdownMenuItem
                    key={headOption.value ?? "none"}
                    onSelect={(event) => {
                      if (headControlsDisabled) {
                        event.preventDefault()
                        return
                      }
                      onSelectHead(department.id, headOption.value)
                      setHeadMenuOpen(false)
                    }}
                    className={cn(
                      "flex items-center justify-between rounded-2xl px-3 py-2 focus:bg-primary/10 focus:text-primary",
                      headOption.value === null && "text-[#1E1E1E] focus:text-[#1E1E1E]"
                    )}
                  >
                    <span>{headOption.label}</span>
                    {isActive ? <Check className="size-4 text-primary" /> : null}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-sm font-medium text-center" style={{ color: textColor }}>
          Number of Member : {memberCount ?? department.memberCount}
        </p>

        <DropdownMenu
          open={colorControlsDisabled ? false : colorMenuOpen}
          onOpenChange={(open) => {
            if (colorControlsDisabled) {
              setColorMenuOpen(false)
              return
            }
        if (colorControlsDisabled) {
          return
        }
        setColorMenuOpen(open)
        if (!open) {
          setColorMode("presets")
        }
      }}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full select-none items-center justify-between rounded-full border-2 border-primary/30 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-[0_6px_0_rgba(144,122,214,0.2)] transition hover:border-primary disabled:opacity-60"
              disabled={colorControlsDisabled}
            >
              <span className="inline-flex items-center gap-2">
                <Palette className="size-4" />
                Select Color
              </span>
              <span
                className="size-6 rounded-full border-2 border-primary/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                style={{ backgroundColor: department.color }}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            side="top"
            className="w-64 max-h-[24rem] overflow-y-auto rounded-3xl border border-primary/30 bg-white p-4 text-sm font-semibold text-primary shadow-[0_16px_30px_rgba(72,68,110,0.2)]"
          >
            <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-primary/70">
              <span className="inline-flex items-center gap-1">
                {colorMode === "presets" ? (
                  <Palette className="size-3.5" />
                ) : (
                  <Wand2 className="size-3.5" />
                )}
                {colorMode === "presets" ? "Quick Colors" : "Custom Color"}
              </span>
              <button
                type="button"
                className="rounded-full border border-transparent px-3 py-1 text-[0.7rem] font-semibold text-primary transition hover:border-primary/30 hover:bg-primary/5"
                onClick={() => setColorMode((mode) => (mode === "presets" ? "custom" : "presets"))}
              >
                {colorMode === "presets" ? (
                  <span className="inline-flex items-center gap-1">
                    <Wand2 className="size-3.5" />
                    Custom
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Palette className="size-3.5" />
                    Palette
                  </span>
                )}
              </button>
            </div>
            {colorMode === "presets" ? (
              <div className="flex flex-wrap gap-2">
                {QUICK_COLOR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="flex size-10 items-center justify-center rounded-2xl border-2 border-primary/20 text-[0.65rem] font-semibold transition hover:border-primary"
                    style={{ backgroundColor: option.value }}
                    onMouseEnter={() => setPreviewColor(option.value)}
                    onMouseLeave={() => setPreviewColor(null)}
                    onFocus={() => setPreviewColor(option.value)}
                    onBlur={() => setPreviewColor(null)}
                    onClick={() => {
                      if (disabled) {
                        return
                      }
                      onSelectColor(department.id, option.value)
                      setColorMenuOpen(false)
                    }}
                    aria-label={`Select ${option.label}`}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2 rounded-2xl border border-primary/20 bg-white/60 p-3 max-h-[18rem] overflow-auto">
                <div className="rounded-2xl bg-white p-2">
                  <HexColorPicker
                    color={department.color}
                    onChange={(color) => onSelectColor(department.id, color)}
                    style={{ width: "100%", height: "160px" }}
                  />
                </div>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showManageControls ? (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="rounded-[2rem] border-2 border-primary/30 px-8 py-10 text-center shadow-xl">
            <AlertDialogTitle className="text-2xl font-semibold text-foreground">
              Are you sure? <br /> You want to delete this department? <br />
              <br />
              <span className="block break-words break-all px-2 text-primary">
                "{department.name}"
              </span>
            </AlertDialogTitle>
            <AlertDialogFooter className="mt-8 flex w-full flex-row gap-6 justify-between">
              <AlertDialogCancel className="rounded-full border-none bg-secondary px-8 py-3 text-base font-semibold text-secondary-foreground shadow-none transition hover:bg-secondary/80">
                No
              </AlertDialogCancel>
              <AlertDialogAction
                className="rounded-full bg-primary px-8 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Yes"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </article>
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
