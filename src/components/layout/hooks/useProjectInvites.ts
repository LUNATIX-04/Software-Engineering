"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  createProjectInvite,
  deleteProjectInvite,
  fetchProjectInvites,
  type ProjectInviteRecord,
} from "@/utils/projects/api"
import { fetchProjectDepartments as fetchDepts, type ProjectDepartmentRecord } from "@/utils/projects/departments"
import { INVITE_EXPIRY_OPTIONS, INVITE_EXPIRY_PRESETS_MS, INVITE_ROLE_OPTIONS } from "../invite/constants"
import type {
  InviteExpiryOption,
  InviteRoleOption,
  InviteRoleOptionKey,
} from "../invite/constants"
import type { UseNotificationsReturn } from "@/components/notifications/Notification"

const INVITE_DIALOG_OPEN_EVENT = "asap:open-invite-dialog"

export type ProjectInvitesState = {
  inviteDialogOpen: boolean
  invites: ProjectInviteRecord[]
  invitesLoading: boolean
  inviteError: string | null
  inviteExpiry: InviteExpiryOption
  setInviteExpiry: (value: InviteExpiryOption) => void
  inviteRoleKey: InviteRoleOptionKey
  setInviteRoleKey: (value: InviteRoleOptionKey) => void
  inviteDepartmentId: string | null
  setInviteDepartmentId: (value: string | null) => void
  inviteDepartments: ProjectDepartmentRecord[]
  inviteDepartmentsLoading: boolean
  inviteDepartmentsError: string | null
  inviteMaxUses: string
  setInviteMaxUses: (value: string) => void
  inviteMaxUsesCustom: boolean
  setInviteMaxUsesCustom: (value: boolean) => void
  inviteSaving: boolean
  inviteExpiryMenuOpen: boolean
  setInviteExpiryMenuOpen: (open: boolean) => void
  inviteRoleMenuOpen: boolean
  setInviteRoleMenuOpen: (open: boolean) => void
  inviteDepartmentMenuOpen: boolean
  setInviteDepartmentMenuOpen: (open: boolean) => void
  inviteRoleOption: InviteRoleOption
  availableInviteDepartments: ProjectDepartmentRecord[]
  inviteRoleHeadExclusive: boolean
  canCustomizeInviteMaxUses: boolean
  headlessDepartmentAvailable: boolean
  handleCreateInviteLink: () => Promise<void>
  handleCopyInvite: (token: string) => Promise<void>
  handleDeleteInviteLink: (inviteId: string) => Promise<void>
  refreshInvites: () => Promise<void>
  openInviteDialog: () => void
  closeInviteDialog: () => void
}

type UseProjectInvitesOptions = {
  activeProjectId: string | null
  viewerDepartmentId: string | null
  isHeaderViewer: boolean
  notify: UseNotificationsReturn["notify"]
}

export function useProjectInvites({
  activeProjectId,
  viewerDepartmentId,
  isHeaderViewer,
  notify,
}: UseProjectInvitesOptions): ProjectInvitesState {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [invites, setInvites] = useState<ProjectInviteRecord[]>([])
  const [invitesLoading, setInvitesLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteExpiry, setInviteExpiry] = useState<InviteExpiryOption>("never")
  const [inviteRoleKey, setInviteRoleKey] = useState<InviteRoleOptionKey>("member")
  const [inviteDepartmentId, setInviteDepartmentId] = useState<string | null>(null)
  const [inviteDepartments, setInviteDepartments] = useState<ProjectDepartmentRecord[]>([])
  const [inviteDepartmentsLoading, setInviteDepartmentsLoading] = useState(false)
  const [inviteDepartmentsError, setInviteDepartmentsError] = useState<string | null>(null)
  const [inviteMaxUses, setInviteMaxUses] = useState("10")
  const [inviteMaxUsesCustom, setInviteMaxUsesCustom] = useState(false)
  const [inviteSaving, setInviteSaving] = useState(false)
  const [inviteExpiryMenuOpen, setInviteExpiryMenuOpen] = useState(false)
  const [inviteRoleMenuOpen, setInviteRoleMenuOpen] = useState(false)
  const [inviteDepartmentMenuOpen, setInviteDepartmentMenuOpen] = useState(false)
  const inviteDepartmentsLoadedRef = useRef(false)

  const inviteRoleOption = useMemo(() => {
    return INVITE_ROLE_OPTIONS.find((option) => option.key === inviteRoleKey) ?? INVITE_ROLE_OPTIONS[0]
  }, [inviteRoleKey])

  const canCustomizeInviteMaxUses = inviteRoleKey === "member" || inviteRoleKey === "owner"

  const headlessDepartmentAvailable = useMemo(
    () => inviteDepartments.some((dept) => !dept.head),
    [inviteDepartments]
  )

  const availableInviteDepartments = useMemo(() => {
    const base = inviteRoleOption.headExclusive
      ? inviteDepartments.filter((dept) => !dept.head)
      : inviteDepartments
    if (isHeaderViewer && viewerDepartmentId) {
      return base.filter((dept) => dept.id === viewerDepartmentId)
    }
    return base
  }, [inviteDepartments, inviteRoleOption.headExclusive, isHeaderViewer, viewerDepartmentId])

  useEffect(() => {
    if (!canCustomizeInviteMaxUses) {
      setInviteMaxUses("1")
      setInviteMaxUsesCustom(true)
    }
  }, [canCustomizeInviteMaxUses])

  useEffect(() => {
    if (!isHeaderViewer) {
      return
    }
    if (inviteRoleKey !== "member") {
      setInviteRoleKey("member")
    }
    if (viewerDepartmentId && inviteDepartmentId !== viewerDepartmentId) {
      setInviteDepartmentId(viewerDepartmentId)
    }
  }, [isHeaderViewer, inviteRoleKey, viewerDepartmentId, inviteDepartmentId])

  const refreshInvites = useCallback(async () => {
    if (!activeProjectId) {
      setInvites([])
      return
    }
    setInvitesLoading(true)
    setInviteError(null)
    try {
      const data = await fetchProjectInvites(activeProjectId)
      setInvites(data)
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Unable to load invite links right now."
      setInviteError(raw)
    } finally {
      setInvitesLoading(false)
    }
  }, [activeProjectId])

  useEffect(() => {
    if (inviteDialogOpen) {
      refreshInvites()
    } else {
      setInviteMaxUses("10")
      if (canCustomizeInviteMaxUses) {
        setInviteMaxUsesCustom(false)
      }
    }
  }, [canCustomizeInviteMaxUses, inviteDialogOpen, refreshInvites])

  useEffect(() => {
    if (!INVITE_EXPIRY_OPTIONS.some((option) => option.value === inviteExpiry)) {
      setInviteExpiry("never")
    }
  }, [inviteExpiry])

  useEffect(() => {
    if (!inviteDialogOpen) {
      inviteDepartmentsLoadedRef.current = false
      return
    }
    if (!activeProjectId || inviteDepartmentsLoadedRef.current) {
      return
    }
    let cancelled = false
    setInviteDepartmentsLoading(true)
    setInviteDepartmentsError(null)
    fetchDepts(activeProjectId)
      .then((data) => {
        if (cancelled) {
          return
        }
        const ordered = [...data].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
        setInviteDepartments(ordered)
        inviteDepartmentsLoadedRef.current = true
        if (inviteDepartmentId && !ordered.some((dept) => dept.id === inviteDepartmentId)) {
          setInviteDepartmentId(null)
        }
      })
      .catch((error) => {
        console.error("Failed to load invite departments", error)
        if (!cancelled) {
          setInviteDepartments([])
          setInviteDepartmentsError("Unable to load departments right now.")
        }
      })
      .finally(() => {
        if (!cancelled) {
          setInviteDepartmentsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [activeProjectId, inviteDepartmentId, inviteDialogOpen])

  useEffect(() => {
    if (!inviteRoleOption.headExclusive) {
      return
    }
    if (!availableInviteDepartments.length) {
      setInviteDepartmentId(null)
      return
    }
    if (inviteDepartmentId && availableInviteDepartments.some((dept) => dept.id === inviteDepartmentId)) {
      return
    }
    setInviteDepartmentId(availableInviteDepartments[0]?.id ?? null)
  }, [availableInviteDepartments, inviteDepartmentId, inviteRoleOption.headExclusive])

  const handleCreateInviteLink = useCallback(async () => {
    if (!activeProjectId) {
      return
    }
    if (inviteRoleOption.headExclusive && !inviteDepartmentId && !isHeaderViewer) {
      setInviteError("You need a department before creating invites.")
      return
    }
    if (inviteRoleKey === "header" && inviteRoleOption.requiresOwner && !viewerDepartmentId) {
      setInviteError("Headers can only invite members.")
      setInviteRoleKey("member")
      return
    }
    if (inviteMaxUsesCustom && Number(inviteMaxUses) <= 0) {
      setInviteError("Enter how many people can use this link, or switch to Unlimited.")
      return
    }
    const effectiveDepartmentId = isHeaderViewer ? viewerDepartmentId : inviteDepartmentId
    setInviteError(null)
    setInviteSaving(true)
    try {
      const newInvite = await createProjectInvite(activeProjectId, {
        maxUses: inviteMaxUsesCustom ? Number(inviteMaxUses) : undefined,
        expiresInSeconds:
          inviteExpiry === "never" ? undefined : INVITE_EXPIRY_PRESETS_MS[inviteExpiry],
        departmentId: effectiveDepartmentId,
        role: inviteRoleOption.role,
      })
      setInvites((prev) => {
        const filtered = prev.filter((invite) => invite.id !== newInvite.id)
        return [newInvite, ...filtered]
      })
      notify({
        title: "Invite link created",
        description: "Share it with anyone you’d like to invite your team.",
        variant: "success",
      })
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Unable to create invite."
      setInviteError(raw)
    } finally {
      setInviteSaving(false)
    }
  }, [
    activeProjectId,
    inviteDepartmentId,
    inviteExpiry,
    inviteMaxUses,
    inviteMaxUsesCustom,
    inviteRoleKey,
    inviteRoleOption,
    isHeaderViewer,
    notify,
    viewerDepartmentId,
  ])

  const handleCopyInvite = useCallback(
    async (token: string) => {
      try {
        const url = `${window.location.origin}/invite/${token}`
        await navigator.clipboard.writeText(url)
        notify({
          title: "Invite link copied",
          description: "Share it securely with anyone you trust.",
          variant: "success",
        })
      } catch (error) {
        console.error("Failed to copy invite link", error)
        notify({
          title: "Copy failed",
          description: "Unable to copy the link to your clipboard.",
          variant: "destructive",
        })
      }
    },
    [notify]
  )

  const handleDeleteInviteLink = useCallback(
    async (inviteId: string) => {
      if (!activeProjectId) {
        return
      }
      try {
        await deleteProjectInvite(activeProjectId, inviteId)
        setInvites((prev) => prev.filter((invite) => invite.id !== inviteId))
      } catch (error) {
        const raw = error instanceof Error ? error.message : "Unable to revoke this invite right now."
        notify({ title: "Revoke failed", description: raw, variant: "destructive" })
      }
    },
    [activeProjectId, notify]
  )

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    const handleOpenInviteDialog = () => setInviteDialogOpen(true)
    window.addEventListener(INVITE_DIALOG_OPEN_EVENT, handleOpenInviteDialog)
    return () => window.removeEventListener(INVITE_DIALOG_OPEN_EVENT, handleOpenInviteDialog)
  }, [])

  return {
    inviteDialogOpen,
    invites,
    invitesLoading,
    inviteError,
    inviteExpiry,
    setInviteExpiry,
    inviteRoleKey,
    setInviteRoleKey,
    inviteDepartmentId,
    setInviteDepartmentId,
    inviteDepartments,
    inviteDepartmentsLoading,
    inviteDepartmentsError,
    inviteMaxUses,
    setInviteMaxUses,
    inviteMaxUsesCustom,
    setInviteMaxUsesCustom,
    inviteSaving,
    inviteExpiryMenuOpen,
    setInviteExpiryMenuOpen,
    inviteRoleMenuOpen,
    setInviteRoleMenuOpen,
    inviteDepartmentMenuOpen,
    setInviteDepartmentMenuOpen,
    inviteRoleOption,
    availableInviteDepartments,
    inviteRoleHeadExclusive: inviteRoleOption.headExclusive,
    canCustomizeInviteMaxUses,
    headlessDepartmentAvailable,
    handleCreateInviteLink,
    handleCopyInvite,
    handleDeleteInviteLink,
    refreshInvites,
    openInviteDialog: () => setInviteDialogOpen(true),
    closeInviteDialog: () => setInviteDialogOpen(false),
  }
}
