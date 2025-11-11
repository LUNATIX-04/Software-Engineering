"use client"

import * as React from "react"
import { useCallback, useRef, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, Filter, Search, UserRound, X } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { TOOLTIP_DELAY_DURATION_MS } from "@/constants/ui"

import { useNotifications } from "@/components/notifications/Notification"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MemberCard,
  type MemberDepartment,
  type MemberRole,
  type SelectableMemberDepartment,
} from "@/components/projects/MemberCard"
import { cn } from "@/lib/utils"
import {
  ADD_DEPARTMENT_LABEL,
  DEFAULT_DEPARTMENT_COLORS,
  DEFAULT_DEPARTMENT_TEXT_COLOR,
} from "@/constants/departments"
import { PROJECT_REFRESH_EVENT } from "@/constants/events"
import {
  kickProjectMember,
  updateProjectMember,
  changeProjectUsername,
  type ProjectMemberDetail,
  type ProjectMembershipSummary,
} from "@/utils/projects/api"
import { isRemovalError } from "@/utils/projects/removal"
import type { ProjectDepartmentRecord } from "@/utils/projects/departments"
import { updateProjectDepartment } from "@/utils/projects/departments"
import {
  getCachedProjectDepartments,
  getCachedProjectMembers,
  getCachedProjectMembership,
  loadProjectDepartments,
  loadProjectMembers,
  loadProjectMembership,
} from "@/utils/projects/prefetch"
import { PROJECT_ROLE } from "@/types/projects"

type MemberRecord = {
  id: string
  name: string
  email: string | null
  role: MemberRole
  rawRole: ProjectMemberDetail["role"]
  department: MemberDepartment
  departmentId: string | null
  avatarUrl: string | null
  bio: string | null
  fullName: string | null
  lastSeenAt: string | null
}

// Share the same department catalog as the Department page so colors & labels stay in sync.
type RemoteDepartment = {
  id: string
  name: string
  color: string
  textColor: string
  order: number
  head: string | null
}

const normalizeMemberDepartments = (departments: ProjectDepartmentRecord[]): RemoteDepartment[] =>
  departments.map((dept) => ({
    id: dept.id,
    name: dept.name,
    color: dept.color,
    textColor: dept.textColor,
    order: dept.order,
    head: dept.head ?? null,
  }))

const BASE_PAGE_SIZE_OPTIONS = [3, 9, 18, 36, 64, 96, 136, 172]
const ROLE_LABEL_MAP = {
  OWNER: "Project Owner",
  HEADER: "Header",
  MEMBER: "Member",
} as const satisfies Record<ProjectMemberDetail["role"], MemberRole>
const AVAILABLE_ROLES: MemberRole[] = ["Project Owner", "Header", "Member"]

const normalizeMembers = (members: ProjectMemberDetail[]): MemberRecord[] =>
  members.map((member) => ({
    id: member.id,
    name: member.username,
    email: member.email,
    role: ROLE_LABEL_MAP[member.role] ?? "Member",
    rawRole: member.role,
    department: member.department?.name ?? ADD_DEPARTMENT_LABEL,
    departmentId: member.department?.id ?? null,
    avatarUrl: member.avatarUrl,
    bio: member.bio,
    fullName: member.fullName,
    lastSeenAt: member.lastSeenAt,
  }))

type ProjectMemberPageProps = {
  params: Promise<{
    projectId: string
  }>
}

export default function ProjectMemberPage({ params }: ProjectMemberPageProps) {
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
  const [members, setMembers] = useState<MemberRecord[]>(
    cachedMembers ? normalizeMembers(cachedMembers) : []
  )
  const [membersLoading, setMembersLoading] = useState(cachedMembers === undefined)
  const [membersError, setMembersError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filterActionOpen, setFilterActionOpen] = useState(false)
  const [activeDepartments, setActiveDepartments] = useState<SelectableMemberDepartment[]>([])
  const [activeRoles, setActiveRoles] = useState<MemberRole[]>([])
  const [remoteDepartments, setRemoteDepartments] = useState<RemoteDepartment[]>(
    cachedDepartments ? normalizeMemberDepartments(cachedDepartments) : []
  )
  const [departmentsLoading, setDepartmentsLoading] = useState(
    cachedDepartments === undefined
  )
  const [departmentsError, setDepartmentsError] = useState<string | null>(null)
  const redirectToProjects = useCallback(() => {
    notify({
      title: "Removed",
      description: "You are no longer part of this project.",
      variant: "destructive",
    })
    router.replace("/projects")
  }, [notify, router])

  const departmentStyles = useMemo(() => {
    if (remoteDepartments.length === 0) {
      return Object.entries(DEFAULT_DEPARTMENT_COLORS).reduce<Record<string, { background: string; text: string }>>(
        (acc, [name, color]) => {
          acc[name] = { background: color, text: DEFAULT_DEPARTMENT_TEXT_COLOR }
          return acc
        },
        {}
      )
    }
    return remoteDepartments.reduce<Record<string, { background: string; text: string }>>((acc, dept) => {
      acc[dept.name] = { background: dept.color, text: dept.textColor }
      return acc
    }, {})
  }, [remoteDepartments])

  const departmentOptions = useMemo(() => {
    const ordered = [...remoteDepartments].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    const unique = ordered.map((dept) => dept.name).filter((name, index, array) => array.indexOf(name) === index)
    if (!unique.includes(ADD_DEPARTMENT_LABEL)) {
      unique.push(ADD_DEPARTMENT_LABEL)
    }
    return unique
  }, [remoteDepartments])
  const viewerDepartmentName = useMemo(() => {
    if (!membership?.departmentId) {
      return null
    }
    const match = remoteDepartments.find((dept) => dept.id === membership.departmentId)
    return match?.name ?? null
  }, [membership?.departmentId, remoteDepartments])
  const departmentHeadMap = useMemo(() => {
    return remoteDepartments.reduce<Record<string, string | null>>((acc, dept) => {
      acc[dept.id] = dept.head ?? null
      return acc
    }, {})
  }, [remoteDepartments])
  const viewerDepartmentId = membership?.departmentId ?? null
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(
    BASE_PAGE_SIZE_OPTIONS[1] ?? BASE_PAGE_SIZE_OPTIONS[0]
  )
  const [pageInput, setPageInput] = useState("1")
  const [pageHintVisible, setPageHintVisible] = useState(false)
  const paginationControlsRef = useRef<HTMLDivElement | null>(null)
  const pageHintTimeoutRef = useRef<number | null>(null)
  const [pageSizeMenuOpen, setPageSizeMenuOpen] = useState(false)
  const [kickingMemberId, setKickingMemberId] = useState<string | null>(null)
  const [kickDialogOpen, setKickDialogOpen] = useState(false)
  const [kickTarget, setKickTarget] = useState<MemberRecord | null>(null)
  const [kickError, setKickError] = useState<string | null>(null)
  const [memberDetailDialogOpen, setMemberDetailDialogOpen] = useState(false)
  const [memberDetailTarget, setMemberDetailTarget] = useState<MemberRecord | null>(null)
  const [detailUsername, setDetailUsername] = useState("")
  const [detailBio, setDetailBio] = useState("")
  const [detailSaving, setDetailSaving] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)


  const fetchDepartments = useCallback(async () => {
    if (!projectId) {
      return
    }
    const shouldShowLoading = getCachedProjectDepartments(projectId) === undefined
    if (shouldShowLoading) {
      setDepartmentsLoading(true)
    }
    try {
      setDepartmentsError(null)
      const response = await loadProjectDepartments(projectId)
      const normalized = normalizeMemberDepartments(response).sort(
        (a, b) => a.order - b.order || a.name.localeCompare(b.name)
      )
      setRemoteDepartments(normalized)
    } catch (error) {
      console.error(error)
      if (isRemovalError(error)) {
        redirectToProjects()
        return
      }
      setDepartmentsError("Unable to load project departments")
    } finally {
      if (shouldShowLoading) {
        setDepartmentsLoading(false)
      }
    }
  }, [projectId, redirectToProjects])

  const loadMembers = useCallback(async () => {
    if (!projectId) {
      return
    }
    setMembersLoading(true)
    setMembersError(null)
    try {
      const remoteMembers = await loadProjectMembers(projectId)
      const normalized = normalizeMembers(remoteMembers)
      setMembers(normalized)
    } catch (error) {
      console.error("Failed to load members", error)
      if (isRemovalError(error)) {
        redirectToProjects()
        return
      }
      setMembersError("Unable to load members right now.")
    } finally {
      setMembersLoading(false)
    }
  }, [projectId, redirectToProjects])

  useEffect(() => {
    const cached = getCachedProjectMembers(projectId)
    setMembers(cached ? normalizeMembers(cached) : [])
    setMembersLoading(cached === undefined)
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
          if (isRemovalError(error)) {
            redirectToProjects()
          }
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
  }, [projectId, redirectToProjects])

  const filteredMembers = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    const hasDepartmentFilters = activeDepartments.length > 0
    const hasRoleFilters = activeRoles.length > 0

    const filtered = members.filter((member) => {
      const isDepartmentHead =
        Boolean(member.departmentId) &&
        departmentHeadMap[member.departmentId ?? ""] === member.name
      const matchesDepartment =
        !hasDepartmentFilters ||
        activeDepartments.includes(member.department as SelectableMemberDepartment)
      if (!matchesDepartment) {
        return false
      }
      const matchesRole =
        !hasRoleFilters ||
        activeRoles.some((role) => {
          if (role === member.role) {
            return true
          }
          if (role === "Header" && member.rawRole === "OWNER" && isDepartmentHead) {
            return true
          }
          return false
        })
      if (!matchesRole) {
        return false
      }
      if (!normalized) {
        return true
      }
      const haystack = [member.name, member.email ?? "", member.role, member.department]
        .join(" ")
        .toLowerCase()
      return haystack.includes(normalized)
    })
    return filtered.sort((a, b) => {
      const deptA = (a.department ?? "").toLowerCase()
      const deptB = (b.department ?? "").toLowerCase()
      if (deptA !== deptB) {
        return deptA.localeCompare(deptB)
      }
      const nameA = (a.name ?? "").toLowerCase()
      const nameB = (b.name ?? "").toLowerCase()
      return nameA.localeCompare(nameB)
    })
  }, [activeDepartments, activeRoles, departmentHeadMap, members, search])

  const totalPages = useMemo(() => {
    if (filteredMembers.length === 0) {
      return 1
    }
    return Math.max(1, Math.ceil(filteredMembers.length / pageSize))
  }, [filteredMembers.length, pageSize])

  const pageSizeOptions = useMemo(() => {
    const totalMembers = filteredMembers.length || members.length
    if (totalMembers === 0) {
      return BASE_PAGE_SIZE_OPTIONS.slice(0, 1)
    }
    const maxAllowed =
      BASE_PAGE_SIZE_OPTIONS.find((option) => option >= totalMembers) ??
      BASE_PAGE_SIZE_OPTIONS[BASE_PAGE_SIZE_OPTIONS.length - 1]
    return BASE_PAGE_SIZE_OPTIONS.filter((option) => option <= maxAllowed)
  }, [filteredMembers.length, members.length])

  useEffect(() => {
    setPage(1)
  }, [search, activeDepartments, activeRoles])

  useEffect(() => {
    const cached = getCachedProjectDepartments(projectId)
    const normalized = cached
      ? normalizeMemberDepartments(cached).sort(
          (a, b) => a.order - b.order || a.name.localeCompare(b.name)
        )
      : []
    setRemoteDepartments(normalized)
    setDepartmentsLoading(cached === undefined)
    fetchDepartments()
  }, [projectId, fetchDepartments])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    const handleProjectRefresh = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          projectId?: string | null
          origin?: string
          source?: string
          departmentId?: string
          color?: string
          textColor?: string
        }>
      ).detail
      if (detail?.projectId && detail.projectId !== projectId) {
        return
      }
      if (detail?.origin === "member-page") {
        return
      }
      if (detail?.source === "department-color" && detail.departmentId) {
        setRemoteDepartments((prev) =>
          prev.map((dept) =>
            dept.id === detail.departmentId
              ? {
                  ...dept,
                  color: detail.color ?? dept.color,
                  textColor: detail.textColor ?? dept.textColor,
                }
              : dept
          )
        )
        return
      }
      fetchDepartments()
      loadMembers()
    }
    window.addEventListener(PROJECT_REFRESH_EVENT, handleProjectRefresh)
    return () => window.removeEventListener(PROJECT_REFRESH_EVENT, handleProjectRefresh)
  }, [fetchDepartments, loadMembers, projectId])

  useEffect(() => {
    setActiveDepartments((prev) => prev.filter((dept) => departmentOptions.includes(dept)))
  }, [departmentOptions])

  useEffect(() => {
    if (pageSizeOptions.length === 0) {
      return
    }
    if (!pageSizeOptions.includes(pageSize)) {
      const fallbackSize = pageSizeOptions[pageSizeOptions.length - 1]
      setPageSize(fallbackSize)
      setPage(1)
    }
  }, [pageSizeOptions, pageSize])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  useEffect(() => {
    setPageInput(String(page))
  }, [page])

  const paginatedMembers = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    return filteredMembers.slice(startIndex, startIndex + pageSize)
  }, [filteredMembers, page, pageSize])

  const clearPageHintTimeout = useCallback(() => {
    if (pageHintTimeoutRef.current) {
      window.clearTimeout(pageHintTimeoutRef.current)
      pageHintTimeoutRef.current = null
    }
  }, [])

  const hidePageHint = useCallback(() => {
    clearPageHintTimeout()
    setPageHintVisible(false)
  }, [clearPageHintTimeout])

  const triggerPageHint = useCallback(() => {
    if (typeof window === "undefined") {
      return
    }
    setPageHintVisible(true)
    clearPageHintTimeout()
    pageHintTimeoutRef.current = window.setTimeout(() => {
      setPageHintVisible(false)
      pageHintTimeoutRef.current = null
    }, 2000)
  }, [clearPageHintTimeout])

  useEffect(() => {
    if (!pageHintVisible) {
      return
    }

    const handlePointerDown = (event: Event) => {
      if (!paginationControlsRef.current?.contains(event.target as Node)) {
        hidePageHint()
      } else {
        triggerPageHint()
      }
    }

    const handleFocusIn = (event: FocusEvent) => {
      if (!paginationControlsRef.current?.contains(event.target as Node)) {
        hidePageHint()
      } else {
        triggerPageHint()
      }
    }

    const pointerEventName =
      typeof window !== "undefined" && "PointerEvent" in window ? "pointerdown" : "mousedown"

    document.addEventListener(pointerEventName, handlePointerDown as EventListener)
    document.addEventListener("focusin", handleFocusIn)

    return () => {
      document.removeEventListener(pointerEventName, handlePointerDown as EventListener)
      document.removeEventListener("focusin", handleFocusIn)
    }
  }, [hidePageHint, pageHintVisible, triggerPageHint])

  useEffect(() => {
    return () => {
      clearPageHintTimeout()
    }
  }, [clearPageHintTimeout])

  const handleRemoveDepartmentFilter = (label: SelectableMemberDepartment) => {
    setActiveDepartments((prev) => prev.filter((item) => item !== label))
  }

  const handleRemoveRoleFilter = (role: MemberRole) => {
    setActiveRoles((prev) => prev.filter((item) => item !== role))
  }

  const handleResetFilters = () => {
    setActiveDepartments([])
    setActiveRoles([])
  }

  const canEditMember = useCallback(
    (member: MemberRecord) => {
      if (!membership) {
        return false
      }
      if (member.rawRole === "OWNER" && membership.role !== "OWNER") {
        return false
      }
      return membership.role === "OWNER"
    },
    [membership]
  )

  const resolveDepartmentOptions = useCallback(
    (member: MemberRecord) => {
      if (!membership) {
        return undefined
      }
      if (membership.role === "OWNER") {
        return departmentOptions
      }
      if (membership.role === "HEADER" && viewerDepartmentName && canEditMember(member)) {
        return [viewerDepartmentName]
      }
      return undefined
    },
    [canEditMember, departmentOptions, membership, viewerDepartmentName]
  )

  const canKickMemberTarget = useCallback(
    (member: MemberRecord) => {
      if (!membership) {
        return false
      }
      if (member.id === membership.id) {
        return false
      }
      if (membership.role === "OWNER") {
        return true
      }
      if (
        membership.role === "HEADER" &&
        membership.departmentId &&
        member.departmentId === membership.departmentId &&
        member.rawRole !== "OWNER"
      ) {
        return true
      }
      return false
    },
    [membership]
  )

  const handleKickMember = useCallback(
    async (member: MemberRecord) => {
      if (!projectId || !membership) {
        return false
      }
      if (!canKickMemberTarget(member)) {
        setKickError("You can only remove members within your department.")
        return false
      }
      setMembersError(null)
      setKickingMemberId(member.id)
      try {
        await kickProjectMember(projectId, member.id)
        setMembers((prev) => prev.filter((item) => item.id !== member.id))
        void fetchDepartments()
        notify({
          title: "Member removed",
          description: `${member.name} has been removed from the project.`,
          variant: "info",
        })
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(PROJECT_REFRESH_EVENT, {
              detail: {
                projectId,
                source: "member-kick",
                origin: "member-page",
              },
            })
          )
        }
        return true
      } catch (error) {
        console.error("Failed to remove project member", error)
        const raw = error instanceof Error ? error.message : "Unable to remove this member."
        setKickError(raw)
        notify({ title: "Remove failed", description: raw, variant: "destructive" })
        return false
      } finally {
        setKickingMemberId(null)
      }
    },
    [canKickMemberTarget, fetchDepartments, membership, notify, projectId]
  )

  const requestKickMember = useCallback((member: MemberRecord) => {
    setKickTarget(member)
    setKickError(null)
    setKickDialogOpen(true)
  }, [])

  const openMemberDetails = useCallback((member: MemberRecord) => {
    setMemberDetailTarget(member)
    setDetailUsername(member.name)
    setDetailBio(member.bio ?? "")
    setDetailError(null)
    setMemberDetailDialogOpen(true)
  }, [])

  const handleKickDialogOpenChange = useCallback((open: boolean) => {
    setKickDialogOpen(open)
    if (!open) {
      setKickTarget(null)
      setKickError(null)
      setKickingMemberId(null)
    }
  }, [])

  const confirmKickMember = useCallback(async () => {
    if (!kickTarget) {
      return
    }
    const success = await handleKickMember(kickTarget)
    if (success) {
      setKickDialogOpen(false)
      setKickTarget(null)
      setKickError(null)
    }
  }, [handleKickMember, kickTarget])

  const handleMemberDetailClose = useCallback(
    (open: boolean) => {
      setMemberDetailDialogOpen(open)
      if (!open) {
        setMemberDetailTarget(null)
        setDetailError(null)
        setDetailSaving(false)
      }
    },
    []
  )

  const handleSaveSelfDetails = useCallback(async () => {
    if (!projectId || !memberDetailTarget || memberDetailTarget.id !== membership?.id) {
      return
    }
    const previousUsername = memberDetailTarget.name
    const departmentId = memberDetailTarget.departmentId ?? membership?.departmentId ?? null
    const nextUsername = detailUsername.trim()
    const nextBio = detailBio.trim()
    if (!nextUsername) {
      setDetailError("Username cannot be empty.")
      return
    }
    setDetailSaving(true)
    setDetailError(null)
    try {
      if (nextUsername !== memberDetailTarget.name) {
        await changeProjectUsername(projectId, nextUsername)
      }
      if ((memberDetailTarget.bio ?? "") !== nextBio) {
        const response = await fetch("/api/account/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bio: nextBio }),
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          const errorMessage =
            typeof payload?.error === "string"
              ? payload.error
              : "Unable to update About Me right now."
          throw new Error(errorMessage)
        }
      }
      setMembers((prev) =>
        prev.map((member) =>
          member.id === memberDetailTarget.id
            ? { ...member, name: nextUsername, bio: nextBio }
            : member
        )
      )
      setMemberDetailTarget((prev) =>
        prev ? { ...prev, name: nextUsername, bio: nextBio } : prev
      )
      setMembership((prev) => (prev ? { ...prev, username: nextUsername } : prev))
      if (departmentId) {
        setRemoteDepartments((prev) =>
          prev.map((dept) =>
            dept.id === departmentId && dept.head === previousUsername
              ? { ...dept, head: nextUsername }
              : dept
          )
        )
      }
      notify({
        title: "Profile updated",
        description: "Your project username and bio were updated.",
        variant: "success",
      })
      setMemberDetailDialogOpen(false)
    } catch (error) {
      console.error("Failed to update member details", error)
      const raw = error instanceof Error ? error.message : "Unable to update your profile."
      setDetailError(raw)
    } finally {
      setDetailSaving(false)
    }
  }, [
    detailBio,
    detailUsername,
    memberDetailTarget,
    membership?.id,
    notify,
    projectId,
    setMembership,
    setRemoteDepartments,
  ])

  const handleToggleDepartmentFilter = (
    department: SelectableMemberDepartment,
    nextChecked: boolean
  ) => {
    setActiveDepartments((prev) => {
      if (nextChecked) {
        if (prev.includes(department)) {
          return prev
        }
        return [...prev, department]
      }
      return prev.filter((item) => item !== department)
    })
  }

  const handleToggleRoleFilter = (role: MemberRole, nextChecked: boolean) => {
    setActiveRoles((prev) => {
      if (nextChecked) {
        if (prev.includes(role)) {
          return prev
        }
        return [...prev, role]
      }
      return prev.filter((item) => item !== role)
    })
  }

  const handleBackClick = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
      return
    }
    router.push("/projects")
  }, [router])

  const handleSetMemberDepartment = useCallback(
    async (memberId: string, departmentLabel: MemberDepartment) => {
      if (!projectId) {
        return
      }
      const previous = members.find((member) => member.id === memberId)
      if (!previous) {
        return
      }
      const trimmedLabel = departmentLabel.trim()
      if (previous.department === trimmedLabel) {
        return
      }
      const resolvedDepartment =
        trimmedLabel === ADD_DEPARTMENT_LABEL
          ? null
          : remoteDepartments.find((dept) => dept.name === trimmedLabel) ?? null
      if (trimmedLabel !== ADD_DEPARTMENT_LABEL && !resolvedDepartment) {
        notify({
          title: "Department not found",
          description: "Please choose a valid department.",
          variant: "destructive",
        })
        return
      }
      const nextDepartmentId = resolvedDepartment?.id ?? null
      const wasDepartmentHead =
        Boolean(previous.departmentId) &&
        departmentHeadMap[previous.departmentId ?? ""] === previous.name
      const shouldDemoteHeader = previous.rawRole === PROJECT_ROLE.HEADER

      const optimisticMember: MemberRecord = {
        ...previous,
        department: trimmedLabel,
        departmentId: nextDepartmentId,
        rawRole: shouldDemoteHeader ? PROJECT_ROLE.MEMBER : previous.rawRole,
        role: shouldDemoteHeader ? ROLE_LABEL_MAP[PROJECT_ROLE.MEMBER] : previous.role,
      }

      setMembers((prev) =>
        prev.map((member) => (member.id === memberId ? optimisticMember : member))
      )
      try {
        await updateProjectMember(projectId, {
          memberId,
          departmentId: trimmedLabel === ADD_DEPARTMENT_LABEL ? null : nextDepartmentId,
          role: shouldDemoteHeader ? PROJECT_ROLE.MEMBER : undefined,
        })
        if (wasDepartmentHead && previous.departmentId) {
          await updateProjectDepartment(projectId, previous.departmentId, { head: null })
          fetchDepartments()
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(PROJECT_REFRESH_EVENT, {
              detail: {
                projectId,
                source: "member-department-change",
                origin: "member-page",
              },
            })
          )
        }
      } catch (error) {
        console.error("Failed to update member department", error)
        setMembers((prev) =>
          prev.map((member) => (member.id === memberId ? previous : member))
        )
        notify({
          title: "Update failed",
          description: "Unable to change the member department right now.",
          variant: "destructive",
        })
      }
    },
    [departmentHeadMap, fetchDepartments, members, notify, projectId, remoteDepartments]
  )

  const pageHint =
  totalPages <= 1 ? "Only page 1" : `Pages 1–${totalPages}`

  const commitPageInput = useCallback(() => {
    if (!pageInput.trim()) {
      setPageInput(String(page))
      return
    }
    const parsed = Number(pageInput)
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > totalPages) {
      setPageInput(String(page))
      return
    }
    setPage(parsed)
  }, [page, pageInput, totalPages])

  const backAriaLabel = projectId
    ? `Back to members for project ${projectId}`
    : "Back to members"

  const containerMinHeight = "calc(100dvh - 5.5rem)"
  const cardListMaxHeight = "calc(100dvh - 18rem)"

  const filterCount = (activeDepartments.length || 0) + (activeRoles.length || 0)

  return (
    <div className="mx-auto overflow-hidden w-full px-[clamp(3.25rem,4vw,3.25rem)] pt-3">
      <div className="flex w-full max-w-7xl flex-col items-start gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="sticky top-1 z-10 -ml-0.1 flex flex-shrink-0 items-start justify-start lg:-mt-0">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBackClick}
            className="inline-flex size-12 items-center justify-center rounded-full border border-primary/20 bg-white text-primary shadow-sm transition hover:border-primary/40 hover:bg-primary/10 focus-visible:border-primary focus-visible:ring-0"
            aria-label={backAriaLabel}
          >
            <ArrowLeft className="size-6" aria-hidden="true" />
          </Button>
        </div>
        
        <div className="mx-auto mt-10 flex w-full max-w-10xl flex-1 flex-col gap-8 px-[clamp(1.5rem,3vw,3.5rem)]"
          style={{ minHeight: containerMinHeight }}
        >
          <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-full max-w-xs">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary/60" />
                <input
                  aria-label="Search members"
                  placeholder="Search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-full border-2 border-primary/40 bg-white/90 py-3 pl-12 pr-30 text-sm text-[#2F2766] placeholder:text-primary/60 focus:border-primary focus:outline-none"
                />
              </div>
              <DropdownMenu open={filterActionOpen} onOpenChange={setFilterActionOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "select-none inline-flex h-12 w-[8rem] items-center gap-2 rounded-full px-6 text-base font-semibold focus:outline-none",
                      filterCount > 0 ? "" : "justify-center",
                      filterActionOpen
                        ? "border-primary bg-button-hover-background text-primary-foreground"
                        : "border-primary/40 bg-button-background text-button-foreground transition hover:border-primary hover:bg-button-hover-background hover:text-primary-foreground"
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Filter className="size-4" />
                      Filter
                    </span>
                    {filterCount > 0 ? (
                      <span className="ml-auto inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-primary/90 px-1 text-xs font-bold text-primary-foreground">
                        {filterCount}
                      </span>
                    ) : null}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-60 overflow-hidden rounded-3xl border border-primary/40 bg-white text-sm font-semibold text-primary shadow-[0_10px_30px_rgba(72,68,110,0.2)]"
                >
                  <div className="member-filter-scroll max-h-[22rem] overflow-y-auto px-2 py-2">
                    <div className="flex items-center justify-between px-3 py-1.5">
                      <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-primary/60">
                        Filters
                      </DropdownMenuLabel>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          setFilterActionOpen(false)
                        }}
                        className="rounded-full p-1 text-primary/60 transition hover:bg-primary/10 hover:text-primary focus:outline-none"
                        aria-label="Close department filters"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <DropdownMenuSeparator className="my-1 bg-primary/20" />
                    <DropdownMenuLabel className="px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-primary/60">
                      Roles
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="my-1 bg-primary/10" />
                    {AVAILABLE_ROLES.map((role) => (
                      <DropdownMenuCheckboxItem
                        key={role}
                        checked={activeRoles.includes(role)}
                        onCheckedChange={(checked) => handleToggleRoleFilter(role, Boolean(checked))}
                        onSelect={(event) => event.preventDefault()}
                        className="rounded-2xl px-3 py-2 pr-10 text-foreground focus:bg-primary/10 focus:text-primary [&>span:first-child]:left-auto [&>span:first-child]:right-3"
                      >
                        {role}
                      </DropdownMenuCheckboxItem>
                    ))}
                    <DropdownMenuSeparator className="my-1 bg-primary/20" />
                    <DropdownMenuLabel className="px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-primary/60">
                      Departments
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="my-1 bg-primary/10" />
              {departmentOptions.map((department) => (
                <DropdownMenuCheckboxItem
                  key={department}
                  checked={activeDepartments.includes(department)}
                  onCheckedChange={(checked) =>
                    handleToggleDepartmentFilter(department, Boolean(checked))
                  }
                  onSelect={(event) => event.preventDefault()}
                  className={cn(
                    "rounded-2xl px-3 py-2 pr-10 focus:bg-primary/10 focus:text-primary [&>span:first-child]:left-auto [&>span:first-child]:right-3",
                    department === ADD_DEPARTMENT_LABEL ? "text-primary/80" : "text-foreground"
                  )}
                >
                  <span className="block max-w-[20rem] truncate">{department}</span>
                </DropdownMenuCheckboxItem>
              ))}
                    <DropdownMenuSeparator className="my-1 bg-primary/20" />
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault()
                        handleResetFilters()
                      }}
                      className="rounded-2xl px-3 py-2 text-primary/70 focus:bg-primary/10 focus:text-primary"
                    >
                      Reset filters
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {departmentsError ? (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs font-semibold text-destructive">
                {departmentsError}
              </div>
            ) : null}
            {departmentsLoading ? (
              <span className="text-xs font-semibold uppercase tracking-wide text-primary/60">
                Updating departments...
              </span>
            ) : null}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-end gap-3 sm:w-auto">
              <div className="relative flex items-center gap-2 select-none text-sm font-medium text-primary">
                <span>Per page</span>
                <DropdownMenu onOpenChange={setPageSizeMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={
                        pageSizeMenuOpen
                          ? "inline-flex h-12 select-none items-center rounded-full border-2 border-primary bg-primary/10 px-4 text-sm font-semibold text-primary"
                          : "inline-flex h-12 select-none items-center rounded-full border-2 border-primary/40 bg-white px-4 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/10"
                      }
                    >
                      {pageSize}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-32 rounded-2xl border border-primary/30 bg-background/95 p-2 text-sm text-primary shadow-[0_16px_30px_rgba(39,36,66,0.15)]"
                  >
                    {pageSizeOptions.map((sizeOption) => {
                      const isActive = sizeOption === pageSize
                      return (
                        <DropdownMenuItem
                          key={sizeOption}
                          className={cn(
                            "flex items-center justify-between rounded-xl px-3 py-2 font-semibold transition hover:bg-primary/10 focus:bg-primary/10 focus:text-primary",
                            isActive && "bg-primary/10 text-primary"
                          )}
                          onSelect={() => {
                            if (isActive) {
                              return
                            }
                            setPageSize(sizeOption)
                            setPage(1)
                          }}
                        >
                          <span>{sizeOption}</span>
                          {isActive ? <Check className="size-4" /> : null}
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
                <div
                  className={cn(
                    "pointer-events-none absolute right-[0rem] bottom-8 z-[500] max-w-[30rem] -translate-y-1/2 rounded-2xl border border-primary/30 bg-white/95 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary shadow-lg transition duration-200 ease-out whitespace-nowrap",
                    pageSizeMenuOpen && filteredMembers.length > 0
                      ? "opacity-100"
                      : "opacity-0"
                  )}
                >
                  {filteredMembers.length > 0 ? `${filteredMembers.length} members` : ""}
                </div>
              </div>
            </div>
          </div>
          </section>

        <div className="flex flex-1 min-h-0 flex-col">
          <div className="-mr-3 -mt-5 flex-1">
            <div
              className="projects-scroll [scrollbar-gutter:stable] flex h-full flex-col space-y-3 px-0.5 py-4"
              style={{ maxHeight: cardListMaxHeight }}
            >
              {membersError ? (
                <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-6 py-4 text-sm text-destructive">
                  {membersError}
                </div>
              ) : null}
              {membersLoading ? (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 px-6 py-5 text-sm text-primary">
                  Loading members…
                </div>
              ) : (
            <>
            {paginatedMembers.map((member) => {
              const isReadOnly = !canEditMember(member)
              const memberDepartmentOptions = resolveDepartmentOptions(member)
              const departmentHeadUsername =
                member.departmentId && departmentHeadMap[member.departmentId]
                  ? departmentHeadMap[member.departmentId]
                  : null
              const isDepartmentHead =
                Boolean(departmentHeadUsername) && departmentHeadUsername === member.name
              const roleLabel =
                isDepartmentHead && member.rawRole === "OWNER"
                  ? "Header (Project Owner)"
                  : member.role
              const isSelf = member.id === membership?.id
              const canKickThisMember = canKickMemberTarget(member)
              return (
                <Tooltip key={member.id} delayDuration={TOOLTIP_DELAY_DURATION_MS}>
                  <TooltipTrigger asChild>
                    <div className="w-full">
                      <MemberCard
                        name={member.name}
                        email={member.email}
                        avatarUrl={member.avatarUrl}
                        role={member.role}
                        roleLabel={roleLabel}
                        department={member.department}
                        availableDepartments={isReadOnly ? undefined : memberDepartmentOptions}
                        onDepartmentSelect={
                          isReadOnly || !memberDepartmentOptions
                            ? undefined
                            : (department) => handleSetMemberDepartment(member.id, department)
                        }
                        readOnly={isReadOnly}
                        departmentColors={departmentStyles}
                        onKick={canKickThisMember && !isSelf ? () => requestKickMember(member) : undefined}
                        kickDisabled={kickingMemberId === member.id}
                        onClick={() => openMemberDetails(member)}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={6}>
                    Click to view member details
                  </TooltipContent>
                </Tooltip>
              )
            })}
                  {paginatedMembers.length === 0 ? (
                    <div className="rounded-[3rem] border-2 border-dashed border-primary/40 bg-white/70 px-6 py-12 text-center text-sm font-semibold text-primary">
                      No members match your filters.
                    </div>
                  ) : null}
                </>
              )}
            </div>
            </div>
            <Dialog open={memberDetailDialogOpen} onOpenChange={handleMemberDetailClose}>
              <DialogContent className="max-w-2xl rounded-[2.5rem] border-2 border-primary/30 bg-white px-8 py-10 text-left shadow-[0_20px_40px_rgba(72,68,110,0.2)]">
                <DialogHeader className="">
                  <DialogTitle className="text-2xl -mt-5 font-bold text-[#2F2766]">
                    {memberDetailTarget?.id === membership?.id ? "My Info" : "Member Info"}
                  </DialogTitle>
                </DialogHeader>
                {memberDetailTarget ? (
                  <div className="-mt-1 flex flex-col gap-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-primary/20 bg-primary/5">
                        {memberDetailTarget.avatarUrl ? (
                          <Image
                            src={memberDetailTarget.avatarUrl}
                            alt={`${memberDetailTarget.name} avatar`}
                            width={96}
                            height={96}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center bg-[#D9C9FF] text-primary">
                            <UserRound className="size-8" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-3">
                        <div className="flex flex-col gap-1">
                          <div className="text-lg mt-2 font-semibold text-[#2F2766]">
                            {(memberDetailTarget.id === membership?.id ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={detailUsername}
                                  onChange={(event) => setDetailUsername(event.target.value)}
                                  className="h-12 w-full rounded-full border-2 border-primary/30 bg-white px-4 text-sm font-semibold text-[#2F2766] shadow-[0_4px_0_rgba(144,122,214,0.15)] focus:border-primary focus:outline-none"
                                  placeholder="Project username"
                                />
                              </div>
                            ) : null) ?? memberDetailTarget.name}
                          </div>
                          <p className="text-sm font-semibold  text-primary/70">
                              <span className="text-foreground/40">Department : </span>{memberDetailTarget.department}
                            </p>
                            <p className="text-sm font-semibold  text-primary/70">
                               <span className="text-foreground/40">Role : </span>{memberDetailTarget.role}
                            </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                    {memberDetailTarget.email ? (
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">
                          Email
                        </p>
                        <p className="text-sm text-[var(--task-hero-text)]">
                          {memberDetailTarget.email}
                        </p>
                      </div>
                    ) : null}
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">
                        About me
                      </p>
                      {memberDetailTarget.id === membership?.id ? (
                        <div className="group/textarea -mt-2 overflow-hidden rounded-[1rem] border-2 border-primary/40 bg-white/80 transition-[box-shadow,border-color] focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(0,0,0,0.12)]">
                          <Textarea
                            value={detailBio}
                            onChange={(event) => setDetailBio(event.target.value)}
                            placeholder="Share a short bio"
                            className="project-detail-scroll min-h-[8rem] w-full resize-y rounded-[inherit] border-none bg-transparent px-5 py-3 text-sm font-semibold text-[#2F2766] placeholder:text-primary/60 shadow-none focus-visible:outline-none focus-visible:ring-0"
                            rows={4}
                          />
                        </div>
                      ) : (
                        <div className="rounded-2xl  -mt-2 border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-[#2F2766]">
                          {memberDetailTarget.bio?.length ? memberDetailTarget.bio : "No bio provided."}
                        </div>
                      )}
                    </div>
                    {memberDetailTarget.id === membership?.id ? (
                      <div className="space-y-3">
                        {detailError ? (
                          <p className="text-sm font-semibold text-destructive">{detailError}</p>
                        ) : null}
                        <div className="flex justify-end gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-full px-6 py-2 text-sm font-semibold"
                            onClick={() => handleMemberDetailClose(false)}
                            disabled={detailSaving}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                            disabled={detailSaving}
                            onClick={handleSaveSelfDetails}
                          >
                            {detailSaving ? "Saving…" : "Save Changes"}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </DialogContent>
            </Dialog>
            <AlertDialog open={kickDialogOpen} onOpenChange={handleKickDialogOpenChange}>
              <AlertDialogContent className="rounded-[2rem] border-2 border-primary/30 px-8 py-10 text-center shadow-xl">
                <AlertDialogTitle className="text-2xl font-semibold text-foreground">
                  Are you sure? <br /> You want to remove this member? <br />
                  <br />
                  <span className="block min-h-[1.5rem] break-words break-all px-2 text-primary">
                    {kickTarget?.name?`"${kickTarget.name}"`:""}
                  </span>
                </AlertDialogTitle>
                {kickError ? (
                  <p className="mt-4 text-sm font-semibold text-destructive">{kickError}</p>
                ) : null}
                <AlertDialogFooter className="mt-8 flex w-full flex-row justify-end gap-4">
                  <AlertDialogCancel className="rounded-full border-none bg-secondary px-8 py-3 text-base font-semibold text-secondary-foreground shadow-none transition hover:bg-secondary/80">
                    No
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="rounded-full bg-primary px-8 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-80"
                    onClick={confirmKickMember}
                    disabled={kickingMemberId === kickTarget?.id}
                  >
                    {kickingMemberId === kickTarget?.id ? "Removing…" : "Yes"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {!membersLoading && filteredMembers.length > 0 ? (
              <div
                  ref={paginationControlsRef}
                  className="mt-auto mb-20 flex select-none items-center justify-center gap-4 pt-4"
                  onFocus={triggerPageHint}
                  onBlur={(event) => {
                    const nextTarget = event.relatedTarget as HTMLElement | null
                    if (!nextTarget || !paginationControlsRef.current?.contains(nextTarget)) {
                      hidePageHint()
                    }
                  }}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      triggerPageHint()
                      setPage((prev) => Math.max(1, prev - 1))
                    }}
                    disabled={page === 1}
                    className={cn(
                      "inline-flex size-10 select-none items-center justify-center rounded-full border-2 border-primary/40 bg-primary text-lg text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-95",
                      page === 1 && "bg-primary/30 text-primary/90 border-primary/20 cursor-not-allowed"
                    )}
                  >
                    &#9664;
                  </Button>
                  <div className="relative flex flex-col items-center gap-1">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute -top-8 whitespace-nowrap rounded-full border border-primary/30 bg-white px-3 py-1 text-xs font-medium text-primary shadow-sm transition-all duration-200 ease-out",
                        pageHintVisible
                          ? "pointer-events-auto opacity-100 translate-y-0 scale-100"
                          : "pointer-events-none opacity-0 -translate-y-1 scale-95"
                      )}
                    >
                      {pageHint}
                    </span>
                    <span id="project-page-hint" className="sr-only">
                      {pageHint}
                    </span>
                    <input
                      id="project-page-input"
                      type="text"
                      inputMode="numeric"
                      value={pageInput}
                      onFocus={triggerPageHint}
                      onBlur={() => {
                        commitPageInput()
                        hidePageHint()
                      }}
                      onChange={(event) => {
                        const numericValue = event.target.value.replace(/[^0-9]/g, "")
                        setPageInput(numericValue)
                        triggerPageHint()
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          commitPageInput()
                          triggerPageHint()
                        }
                      }}
                      className="w-16 select-text rounded-full border-2 border-primary/40 bg-white px-3 py-2 text-center text-base font-semibold text-primary shadow-sm focus:border-primary focus:outline-none"
                      aria-describedby="project-page-hint"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      triggerPageHint()
                      setPage((prev) => Math.min(totalPages, prev + 1))
                    }}
                    disabled={page === totalPages}
                    className={cn(
                      "inline-flex size-10 select-none items-center justify-center rounded-full border-2 border-primary/40 bg-primary text-lg text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-95",
                      page === totalPages &&
                        "bg-primary/30 text-primary/90 border-primary/20 cursor-not-allowed"
                    )}
                  >
                    &#9654;
                  </Button>
                </div>
              ):null}
          </div>
        </div>
      </div>
    </div>
  )
}
