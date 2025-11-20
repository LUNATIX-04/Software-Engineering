"use client"

import * as React from "react"
import { useCallback, useRef, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Link2 } from "lucide-react"
import { useNotifications } from "@/components/notifications/Notification"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
const INVITE_DIALOG_OPEN_EVENT = "asap:open-invite-dialog"
import {
  type MemberDepartment,
  type MemberRole,
  type SelectableMemberDepartment,
} from "@/components/projects/MemberCard"
import { cn } from "@/lib/utils"
import { ADD_DEPARTMENT_LABEL, DEFAULT_DEPARTMENT_COLORS, DEFAULT_DEPARTMENT_TEXT_COLOR } from "@/constants/departments"
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
  prefetchProjectBundle,
  refreshProjectCache,
} from "@/utils/projects/prefetch"
import { PROJECT_ROLE } from "@/types/projects"
import { MemberFilterBar } from "./components/MemberFilterBar"
import { MemberPaginationControls } from "./components/MemberPaginationControls"
import { MemberList } from "./components/MemberList"
import { MemberDetailDialog } from "./components/MemberDetailDialog"
import { MemberKickDialog } from "./components/MemberKickDialog"
import { useMemberPaginationControls } from "./hooks/useMemberPaginationControls"
import type { MemberRecord, RemoteDepartment } from "./types"
import BackButton from "@/components/navigation/BackButton"

// Share the same department catalog as the Department page so colors & labels stay in sync.
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
  const openInviteDialog = useCallback(() => {
    if (typeof window === "undefined") {
      return
    }
    window.dispatchEvent(new CustomEvent(INVITE_DIALOG_OPEN_EVENT))
  }, [])
  const router = useRouter()
  const { notify } = useNotifications()
  const cachedDepartments = getCachedProjectDepartments(projectId)
  const cachedMembers = getCachedProjectMembers(projectId)
  const cachedMembership = getCachedProjectMembership(projectId)
  const refreshTimerRef = useRef<number | null>(null)
  const refreshInFlightRef = useRef(false)
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

  useEffect(() => {
    if (!projectId) {
      return
    }
    prefetchProjectBundle(projectId, { taskPageSize: BASE_PAGE_SIZE_OPTIONS[1] }).catch(
      (prefetchError) => {
        console.error("Project prefetch failed", prefetchError)
      }
    )
  }, [projectId])

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

  const departmentOptions = useMemo<SelectableMemberDepartment[]>(() => {
    const ordered = [...remoteDepartments].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    const unique = ordered.map((dept) => dept.name).filter((name, index, array) => array.indexOf(name) === index)
    if (!unique.includes(ADD_DEPARTMENT_LABEL)) {
      unique.push(ADD_DEPARTMENT_LABEL)
    }
    return unique as SelectableMemberDepartment[]
  }, [remoteDepartments])
  const assignableDepartmentOptions = useMemo<SelectableMemberDepartment[]>(
    () => departmentOptions.filter((option) => option !== ADD_DEPARTMENT_LABEL),
    [departmentOptions]
  )
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
  const paginationControlsRef = useRef<HTMLDivElement | null>(null)
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

  const reloadMembership = useCallback(async () => {
    if (!projectId) {
      return
    }
    const shouldShowLoading = getCachedProjectMembership(projectId) === undefined
    if (shouldShowLoading) {
      setMembershipLoading(true)
    }
    try {
      const data = await loadProjectMembership(projectId)
      setMembership(data ?? null)
    } catch (error) {
      console.error("Failed to load membership", error)
      setMembership(null)
      if (isRemovalError(error)) {
        redirectToProjects()
      }
    } finally {
      if (shouldShowLoading) {
        setMembershipLoading(false)
      }
    }
  }, [projectId, redirectToProjects])

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

  useEffect(() => {
    if (!projectId) {
      return
    }
    const runRefresh = async () => {
      if (refreshInFlightRef.current) return
      refreshInFlightRef.current = true
      try {
        await refreshProjectCache(projectId)
        await Promise.all([fetchDepartments(), loadMembers(), reloadMembership()])
      } catch (error) {
        console.error("Member page refresh failed", error)
      } finally {
        refreshInFlightRef.current = false
      }
    }
    refreshTimerRef.current = window.setInterval(runRefresh, 15000)
    return () => {
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
    }
  }, [fetchDepartments, loadMembers, projectId, reloadMembership])

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

  const {
    pageInput,
    pageHintVisible,
    pageHint,
    handlePrevPage,
    handleNextPage,
    handlePageInputChange,
    handlePageInputFocus,
    handlePageInputBlur,
    handlePageInputKeyDown,
    handleContainerFocus,
    handleContainerBlur,
  } = useMemberPaginationControls({
    page,
    totalPages,
    onPageChange: setPage,
    paginationRef: paginationControlsRef,
  })

  const pageSizeOptions = useMemo(() => {
    const totalMembers = filteredMembers.length || members.length
    const options = new Set(BASE_PAGE_SIZE_OPTIONS)
    if (totalMembers > 0) {
      options.add(totalMembers)
    }
    return [...options].sort((a, b) => a - b)
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

  const paginatedMembers = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    return filteredMembers.slice(startIndex, startIndex + pageSize)
  }, [filteredMembers, page, pageSize])

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
        return assignableDepartmentOptions
      }
      if (membership.role === "HEADER" && viewerDepartmentName && canEditMember(member)) {
        return [viewerDepartmentName]
      }
      return undefined
    },
    [canEditMember, assignableDepartmentOptions, membership, viewerDepartmentName]
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
      if (trimmedLabel === ADD_DEPARTMENT_LABEL) {
        return
      }
      const resolvedDepartment =
        remoteDepartments.find((dept) => dept.name === trimmedLabel) ?? null
      if (!resolvedDepartment) {
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
          departmentId: nextDepartmentId,
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

  const backAriaLabel = projectId
    ? `Back to members for project ${projectId}`
    : "Back to members"

  const containerMinHeight = "calc(100dvh - 5.5rem)"
  const cardListMaxHeight = "calc(100dvh - 18rem)"

  const filterCount = (activeDepartments.length || 0) + (activeRoles.length || 0)

  return (
    <div className="asap-scroll w-full min-h-[calc(100vh-6.5rem)] px-[clamp(3.25rem,4vw,3.25rem)] pt-3">
      <div className="flex w-full flex-col items-start gap-4 lg:flex-row lg:items-start lg:gap-6">
        <BackButton dataCy="project-member-back-button" ariaLabel={backAriaLabel} />
        <div
          className="mx-auto mt-10 flex w-full max-w-full flex-1 flex-col gap-8 px-[clamp(1.5rem,3vw,3.5rem)] pb-10"
          style={{ minHeight: containerMinHeight }}
        >
          <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <MemberFilterBar
              availableRoles={AVAILABLE_ROLES}
              search={search}
              filterCount={filterCount}
              filterActionOpen={filterActionOpen}
              roleFilters={activeRoles}
              departmentFilters={activeDepartments}
              departmentOptions={departmentOptions}
              departmentsError={departmentsError}
              departmentsLoading={departmentsLoading}
              onSearchChange={setSearch}
              onFilterActionOpenChange={setFilterActionOpen}
              onToggleRoleFilter={handleToggleRoleFilter}
              onToggleDepartmentFilter={handleToggleDepartmentFilter}
              onResetFilters={handleResetFilters}
            />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-end gap-3 sm:w-auto">
                <div className="relative flex items-center gap-2 select-none text-sm font-medium text-primary">
                  <span>Per page</span>
                  <DropdownMenu onOpenChange={setPageSizeMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        data-cy="project-member-page-size-button"
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
                      pageSizeMenuOpen && filteredMembers.length > 0 ? "opacity-100" : "opacity-0"
                    )}
                  >
                    {filteredMembers.length > 0 ? `${filteredMembers.length} members` : ""}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="inline-flex h-12 items-center justify-center rounded-full border-primary/40 bg-white px-5 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/10"
                  onClick={openInviteDialog}
                  data-cy="project-member-invite-link-button"
                >
                  <span className="inline-flex items-center gap-2 select-none">
                    <Link2 className="size-4" />
                    Invite Link
                  </span>
                </Button>
              </div>
            </div>
          </section>

        <div className="flex flex-1 min-h-0 flex-col">
          <div className="-mr-3 -mt-5 flex-1">
            <div
              className="projects-scroll [scrollbar-gutter:stable] flex h-full flex-col space-y-3 px-0.5 py-4"
              style={{ maxHeight: cardListMaxHeight }}
            >
              <MemberList
                membership={membership}
                membersLoading={membersLoading}
                membersError={membersError}
                paginatedMembers={paginatedMembers}
                kickingMemberId={kickingMemberId}
                departmentStyles={departmentStyles}
                departmentHeadMap={departmentHeadMap}
                resolveDepartmentOptions={resolveDepartmentOptions}
                handleSetMemberDepartment={handleSetMemberDepartment}
                requestKickMember={requestKickMember}
                openMemberDetails={openMemberDetails}
                canEditMember={canEditMember}
                canKickMemberTarget={canKickMemberTarget}
              />
            </div>
        </div>
        <MemberDetailDialog
          open={memberDetailDialogOpen}
          onOpenChange={handleMemberDetailClose}
          memberTarget={memberDetailTarget}
          membership={membership}
          usernameValue={detailUsername}
          bioValue={detailBio}
          detailError={detailError}
          detailSaving={detailSaving}
          onUsernameChange={setDetailUsername}
          onBioChange={setDetailBio}
          onSave={handleSaveSelfDetails}
          onCancel={() => handleMemberDetailClose(false)}
        />
        <MemberKickDialog
          open={kickDialogOpen}
          onOpenChange={handleKickDialogOpenChange}
          target={kickTarget}
          kickingMemberId={kickingMemberId}
          error={kickError}
          onConfirm={confirmKickMember}
        />

        {!membersLoading && filteredMembers.length > 0 ? (
          <MemberPaginationControls
            paginationRef={paginationControlsRef}
            page={page}
            totalPages={totalPages}
            pageInput={pageInput}
            pageHint={pageHint}
            pageHintVisible={pageHintVisible}
            onPrev={handlePrevPage}
            onNext={handleNextPage}
            onPageInputChange={handlePageInputChange}
            onPageInputFocus={handlePageInputFocus}
            onPageInputBlur={handlePageInputBlur}
            onPageInputKeyDown={handlePageInputKeyDown}
            onContainerFocus={handleContainerFocus}
            onContainerBlur={handleContainerBlur}
          />
        ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
