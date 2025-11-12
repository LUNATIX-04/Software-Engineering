"use client"

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import {
  Link2,
  LogOut,
  MoreHorizontal,
  PencilLine,
  RefreshCcw,
  Settings as SettingsIcon,
  Trash2,
  User as UserIcon,
  UserPen,
  ChevronDown,
  Check,
  X,
  Search,
} from "lucide-react"
import type { AuthChangeEvent, Session } from "@supabase/supabase-js"

import { Button } from "@/components/ui/button"
import { AccountSettingsContent } from "@/components/account/AccountSettingsPageContent"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  NotificationProvider,
  useNotifications,
} from "@/components/notifications/Notification"
import { PreferencesContext } from "@/contexts/preferences"
import type { DepartmentLayoutOption, ProfileSummary, ThemeOption } from "@/types/preferences"

import { cn } from "@/lib/utils"
import { getSupabaseBrowserClient } from "@/utils/supabase/client"
import {
  changeProjectUsername,
  createProjectInvite,
  deleteProject,
  deleteProjectInvite,
  fetchProjectById,
  fetchProjectInvites,
  fetchProjectMembers,
  fetchProjectMembership,
  leaveProject,
  markProjectUsage,
  updateProjectOwners,
  type ProjectInviteRecord,
  type ProjectMemberDetail,
  type ProjectMembershipSummary,
} from "@/utils/projects/api"
import {
  fetchProjectDepartments,
  type ProjectDepartmentRecord,
} from "@/utils/projects/departments"
import { DropdownMenuLabel } from "@radix-ui/react-dropdown-menu"
import { PROJECT_REFRESH_EVENT } from "@/constants/events"
import { PROJECT_ROLE, type ProjectRole } from "@/types/projects"

const INVITE_DIALOG_OPEN_EVENT = "asap:open-invite-dialog"
import { isRemovalError } from "@/utils/projects/removal"

const DEPARTMENT_LAYOUTS: DepartmentLayoutOption[] = ["compact", "fullWidth"]
const THEME_OPTIONS: ThemeOption[] = ["standard", "light", "dark", "red", "blue"]

type InviteExpiryOption =
  | "never"
  | "3m"
  | "5m"
  | "15m"
  | "1h"
  | "3h"
  | "12h"
  | "1d"
  | "7d"
  | "30d"
  | "custom"

const INVITE_EXPIRY_OPTIONS: Array<{ value: InviteExpiryOption; label: string }> = [
  { value: "never", label: "No expiry" },
  { value: "3m", label: "3 minutes" },
  { value: "5m", label: "5 minutes" },
  { value: "15m", label: "15 minutes" },
  { value: "1h", label: "1 hour" },
  { value: "3h", label: "3 hours" },
  { value: "12h", label: "12 hours" },
  { value: "1d", label: "1 day" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "1 month" },
]

const INVITE_EXPIRY_PRESETS_MS: Record<Exclude<InviteExpiryOption, "never">, number> = {
  "3m": 3 * 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "3h": 3 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  custom: 0
}

type InviteRoleOptionKey = "member" | "header" | "owner" | "ownerHead"
type InviteRoleOption = {
  key: InviteRoleOptionKey
  role: ProjectRole
  label: string
  requiresOwner: boolean
  headExclusive: boolean
}

const INVITE_ROLE_OPTIONS: InviteRoleOption[] = [
  { key: "member", role: PROJECT_ROLE.MEMBER, label: "Member", requiresOwner: false, headExclusive: false },
  { key: "header", role: PROJECT_ROLE.HEADER, label: "Header", requiresOwner: false, headExclusive: true },
  { key: "owner", role: PROJECT_ROLE.OWNER, label: "Project Owner", requiresOwner: true, headExclusive: false },
  {
    key: "ownerHead",
    role: PROJECT_ROLE.OWNER,
    label: "Header (Project Owner)",
    requiresOwner: true,
    headExclusive: true,
  },
]


export async function handleGoogleSignIn() {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { url },
    error,
  } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: { prompt: "select_account" },
    },
  });

  if (error) {
    console.error("Failed to sign in with Google", error);
    return;
  }

  if (url) {
    window.location.assign(url);
  }
}

const SIGNED_IN_TOAST_KEY_PREFIX = "asap:signed-in-toast"

function pickFirstNonEmptyString(...candidates: Array<unknown>): string | null {
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim()
      if (trimmed.length > 0) {
        return trimmed
      }
    }
  }
  return null
}

function normalizeFullName({
  stored,
  email,
  fallback,
}: {
  stored: string | null | undefined
  email: string | null | undefined
  fallback: string | null
}) {
  const emailLocal = typeof email === "string" ? email.trim() : ""
  const storedLocal = typeof stored === "string" ? stored.trim() : ""
  if (storedLocal.length > 0 && storedLocal.toLowerCase() !== emailLocal.toLowerCase()) {
    return storedLocal
  }
  const fallbackLocal = typeof fallback === "string" ? fallback.trim() : ""
  if (fallbackLocal.length > 0 && fallbackLocal.toLowerCase() !== emailLocal.toLowerCase()) {
    return fallbackLocal
  }
  if (storedLocal.length > 0 && emailLocal.length === 0) {
    return storedLocal
  }
  return null
}

type HeaderVariant = "homepage" | "projects" | "minimal" | "none"

type HeaderSpacingControl = "auto" | "none"

type AppShellLayoutContextValue = {
  setHeaderVariant: (variant: HeaderVariant | null) => void
  setHeaderSpacing: (mode: HeaderSpacingControl) => void
}

const AppShellLayoutContext = createContext<AppShellLayoutContextValue>({
  setHeaderVariant: () => {},
  setHeaderSpacing: () => {},
})

export function useAppShellLayout() {
  return useContext(AppShellLayoutContext)
}

function ensureDepartmentLayout(value: unknown): DepartmentLayoutOption {
  return DEPARTMENT_LAYOUTS.includes(value as DepartmentLayoutOption)
    ? (value as DepartmentLayoutOption)
    : "fullWidth"
}

function ensureTheme(value: unknown): ThemeOption {
  return THEME_OPTIONS.includes(value as ThemeOption) ? (value as ThemeOption) : "standard"
}

type AppShellProps = {
  children: ReactNode
}

type SignOutRedirect = "homepage" | "google" | "none"

export default function AppShell({ children }: AppShellProps) {
  return (
    <NotificationProvider>
      <AppShellInner>{children}</AppShellInner>
    </NotificationProvider>
  )
}

function AppShellInner({ children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isHomepage = pathname === "/homepage"
  const isProjects = pathname?.startsWith("/projects") ?? false
  const isTraditionalAuth = pathname === "/auth/traditional"
  const segments = pathname?.split("/").filter(Boolean) ?? []
  const isProjectRoute = segments[0]?.toLowerCase() === "projects"
  const projectSlug = isProjectRoute ? segments[1] ?? null : null
  const normalizedProjectSlug = projectSlug?.toLowerCase()
  const isProjectDetailPage = Boolean(normalizedProjectSlug) && normalizedProjectSlug !== "create"
  const isProjectEditPage = isProjectDetailPage && segments[2]?.toLowerCase() === "edit"
  const activeProjectId = isProjectDetailPage && projectSlug ? projectSlug : null
  const currentProjectSection = isProjectDetailPage ? (segments[2]?.toLowerCase() ?? "info") : null
  const hasProjectTabs = Boolean(activeProjectId) && !isProjectEditPage
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState<ProfileSummary | null>(null)
  const [preferencesLoading, setPreferencesLoading] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [usernameDialogOpen, setUsernameDialogOpen] = useState(false)
  const [pendingUsername, setPendingUsername] = useState("")
  const [headerOverride, setHeaderOverride] = useState<HeaderVariant | null>(null)
  const [headerSpacingOverride, setHeaderSpacingOverride] = useState<HeaderSpacingControl | null>(null)
  const lastAuthUserIdRef = useRef<string | null>(null)
  const signInToastTokensRef = useRef<Record<string, string>>({})
  const { notify } = useNotifications()
  const redirectToProjects = useCallback(() => {
    notify({
      title: "Removed",
      description: "You are no longer part of this project.",
      variant: "destructive",
    })
    router.replace("/projects")
  }, [notify, router])
  const authenticatedUser = session?.user ?? null
  const [projectActionsOpen, setProjectActionsOpen] = useState(false)
  const [deleteProjectDialogOpen, setDeleteProjectDialogOpen] = useState(false)
  const [deleteProjectLoading, setDeleteProjectLoading] = useState(false)
  const [deleteProjectError, setDeleteProjectError] = useState<string | null>(null)
  const [deleteProjectTargetId, setDeleteProjectTargetId] = useState<string | null>(null)
  const [deleteProjectTitle, setDeleteProjectTitle] = useState<string | null>(null)
  const [deleteProjectTitleLoading, setDeleteProjectTitleLoading] = useState(false)
  const deleteProjectTargetIdRef = useRef<string | null>(null)
  const [leaveProjectTitle, setLeaveProjectTitle] = useState<string | null>(null)
  const [leaveProjectTitleLoading, setLeaveProjectTitleLoading] = useState(false)
  const lastMarkedUsageRef = useRef<string | null>(null)
  const [projectMembership, setProjectMembership] = useState<ProjectMembershipSummary | null>(null)
  const [membershipLoading, setMembershipLoading] = useState(false)
  const [usernameSaving, setUsernameSaving] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [ownerDialogOpen, setOwnerDialogOpen] = useState(false)
  const [invites, setInvites] = useState<ProjectInviteRecord[]>([])
  const [invitesLoading, setInvitesLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteExpiry, setInviteExpiry] = useState<InviteExpiryOption>("never")
  const [inviteRoleKey, setInviteRoleKey] = useState<InviteRoleOptionKey>("member")
  const [inviteDepartmentId, setInviteDepartmentId] = useState<string | null>(null)
  const [inviteDepartments, setInviteDepartments] = useState<ProjectDepartmentRecord[]>([])
  const [inviteDepartmentsLoading, setInviteDepartmentsLoading] = useState(false)
  const [inviteDepartmentsError, setInviteDepartmentsError] = useState<string | null>(null)
  const inviteDepartmentsLoadedRef = useRef(false)
  const [inviteMaxUses, setInviteMaxUses] = useState("10")
  const [inviteMaxUsesCustom, setInviteMaxUsesCustom] = useState(false)
  const [inviteExpiryMenuOpen, setInviteExpiryMenuOpen] = useState(false)
  const [inviteRoleMenuOpen, setInviteRoleMenuOpen] = useState(false)
  const [inviteDepartmentMenuOpen, setInviteDepartmentMenuOpen] = useState(false)
  const inviteRoleOption = useMemo(() => {
    return INVITE_ROLE_OPTIONS.find((option) => option.key === inviteRoleKey) ?? INVITE_ROLE_OPTIONS[0]
  }, [inviteRoleKey])
  const inviteRole = inviteRoleOption.role
  const inviteRoleRequiresOwner = inviteRoleOption.requiresOwner
  const inviteRoleHeadExclusive = inviteRoleOption.headExclusive
  const canCustomizeInviteMaxUses = inviteRoleKey === "member" || inviteRoleKey === "owner"
  const prevCanCustomizeInviteRef = useRef(canCustomizeInviteMaxUses)
  const viewerRole = projectMembership?.role ?? null
  const viewerDepartmentId = projectMembership?.departmentId ?? null
  const isHeaderViewer = viewerRole === PROJECT_ROLE.HEADER
  const headlessDepartmentAvailable = useMemo(
    () => inviteDepartments.some((dept) => !dept.head),
    [inviteDepartments]
  )
  const availableInviteDepartments = useMemo(() => {
    const base = inviteRoleHeadExclusive
      ? inviteDepartments.filter((dept) => !dept.head)
      : inviteDepartments
    if (isHeaderViewer && viewerDepartmentId) {
      return base.filter((dept) => dept.id === viewerDepartmentId)
    }
    return base
  }, [inviteDepartments, inviteRoleHeadExclusive, isHeaderViewer, viewerDepartmentId])
  const [inviteSaving, setInviteSaving] = useState(false)
  const [ownerCandidates, setOwnerCandidates] = useState<ProjectMemberDetail[]>([])
  const [ownerSelection, setOwnerSelection] = useState<Set<string>>(new Set())
  const [ownersLoading, setOwnersLoading] = useState(false)
  const [ownersSaving, setOwnersSaving] = useState(false)
  const [ownerError, setOwnerError] = useState<string | null>(null)
  const [ownerSearch, setOwnerSearch] = useState("")
  const [selectedOwnersSearch, setSelectedOwnersSearch] = useState("")
  const selectedOwners = useMemo(
    () => ownerCandidates.filter((candidate) => ownerSelection.has(candidate.id)),
    [ownerCandidates, ownerSelection]
  )
  const filteredOwnerCandidates = useMemo(() => {
    const term = ownerSearch.trim().toLowerCase()
    if (!term) {
      return ownerCandidates
    }
    return ownerCandidates.filter((candidate) =>
      candidate.username.toLowerCase().includes(term)
    )
  }, [ownerCandidates, ownerSearch])
  const filteredSelectedOwners = useMemo(() => {
    const term = selectedOwnersSearch.trim().toLowerCase()
    if (!term) {
      return selectedOwners
    }
    return selectedOwners.filter((owner) => owner.username.toLowerCase().includes(term))
  }, [selectedOwnersSearch, selectedOwners])

  useEffect(() => {
    if (!canCustomizeInviteMaxUses) {
      setInviteMaxUses("1")
      setInviteMaxUsesCustom(true)
    } else if (!prevCanCustomizeInviteRef.current) {
      setInviteMaxUsesCustom(false)
    }
    prevCanCustomizeInviteRef.current = canCustomizeInviteMaxUses
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


  const refreshMembership = useCallback(async () => {
    if (!activeProjectId) {
      setProjectMembership(null)
      return
    }
    setMembershipLoading(true)
    try {
      const data = await fetchProjectMembership(activeProjectId)
      setProjectMembership(data)
    } catch (error) {
      setProjectMembership(null)
      if (isRemovalError(error)) {
        redirectToProjects()
      }
    } finally {
      setMembershipLoading(false)
    }
  }, [activeProjectId, redirectToProjects])

  useEffect(() => {
    refreshMembership()
  }, [refreshMembership])

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
      const raw =
        error instanceof Error ? error.message : "Unable to load invite links right now."
      setInviteError(raw)
    } finally {
      setInvitesLoading(false)
    }
  }, [activeProjectId])

  useEffect(() => {
    if (inviteDialogOpen) {
      refreshInvites()
    }
    if (!inviteDialogOpen) {
      setInviteMaxUses("10")
      if (canCustomizeInviteMaxUses) {
        setInviteMaxUsesCustom(false)
      }
    }
  }, [canCustomizeInviteMaxUses, inviteDialogOpen, refreshInvites])

  const refreshOwnerCandidates = useCallback(async () => {
    if (!activeProjectId) {
      setOwnerCandidates([])
      setOwnerSelection(new Set())
      return
    }
    setOwnersLoading(true)
    setOwnerError(null)
    try {
      const members = await fetchProjectMembers(activeProjectId)
      setOwnerCandidates(members)
      const initiallySelected = new Set(
        members.filter((member) => member.role === "OWNER").map((member) => member.id)
      )
      setOwnerSelection(initiallySelected)
    } catch (error) {
      const raw =
        error instanceof Error ? error.message : "Unable to load project members."
      setOwnerError(raw)
    } finally {
      setOwnersLoading(false)
    }
  }, [activeProjectId])

  useEffect(() => {
    if (!ownerDialogOpen) {
      setOwnerSearch("")
      setSelectedOwnersSearch("")
    }
  }, [ownerDialogOpen])

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
    fetchProjectDepartments(activeProjectId)
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
    if (!inviteRoleHeadExclusive) {
      return
    }
    if (
      inviteDepartmentId &&
      inviteDepartments.some((dept) => dept.id === inviteDepartmentId && dept.head)
    ) {
      setInviteDepartmentId(null)
    }
  }, [inviteDepartmentId, inviteDepartments, inviteRoleHeadExclusive])

  useEffect(() => {
    if (!inviteRoleHeadExclusive) {
      return
    }
    if (availableInviteDepartments.length === 0) {
      setInviteDepartmentId(null)
      return
    }
    setInviteDepartmentId((prev) => {
      if (prev && availableInviteDepartments.some((dept) => dept.id === prev)) {
        return prev
      }
      return availableInviteDepartments[0]?.id ?? null
    })
  }, [availableInviteDepartments, inviteRoleHeadExclusive])

  useEffect(() => {
    if (!inviteRoleHeadExclusive) {
      return
    }
    if (!headlessDepartmentAvailable) {
      setInviteRoleKey("member")
    }
  }, [headlessDepartmentAvailable, inviteRoleHeadExclusive])

  useEffect(() => {
    if (ownerDialogOpen) {
      refreshOwnerCandidates()
    }
  }, [ownerDialogOpen, refreshOwnerCandidates])

  const getSignInToastStorageKey = useCallback((userId: string) => {
    return `${SIGNED_IN_TOAST_KEY_PREFIX}:${userId}`
  }, [])

  const rememberSignInToast = useCallback(
    (userId: string, token: string) => {
      signInToastTokensRef.current[userId] = token
      if (typeof window === "undefined") {
        return
      }
      try {
        window.sessionStorage.setItem(getSignInToastStorageKey(userId), token)
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Failed to persist sign-in toast state", error)
        }
      }
    },
    [getSignInToastStorageKey]
  )

  const hasSeenSignInToast = useCallback(
    (userId: string, token: string) => {
      if (signInToastTokensRef.current[userId] === token) {
        return true
      }
      if (typeof window === "undefined") {
        return false
      }
      try {
        return window.sessionStorage.getItem(getSignInToastStorageKey(userId)) === token
      } catch {
        return false
      }
    },
    [getSignInToastStorageKey]
  )

  const clearSignInToastRecord = useCallback(
    (userId: string) => {
      delete signInToastTokensRef.current[userId]
      if (typeof window === "undefined") {
        return
      }
      try {
        window.sessionStorage.removeItem(getSignInToastStorageKey(userId))
      } catch {
        // Ignore storage errors during cleanup.
      }
    },
    [getSignInToastStorageKey]
  )

  const deriveSignInToastToken = useCallback((sessionValue: Session | null) => {
    if (!sessionValue) {
      return "__no-session__"
    }
    const candidates: Array<string | null | undefined> = [
      sessionValue.user?.last_sign_in_at,
      sessionValue.access_token,
      sessionValue.refresh_token,
      sessionValue.expires_at ? String(sessionValue.expires_at) : undefined,
    ]
    const found = candidates.find((value) => typeof value === "string" && value.trim().length > 0)
    return found ?? "__fallback__"
  }, [])

  const applyTheme = useCallback((theme: ThemeOption) => {
    if (typeof document === "undefined") {
      return
    }
    const body = document.body
    const root = document.documentElement
    if (theme === "standard") {
      if (body) {
        delete body.dataset.theme
      }
      delete root.dataset.theme
    } else {
      if (body) {
        body.dataset.theme = theme
      }
      root.dataset.theme = theme
    }
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [])

  const updateProfileLocally = useCallback((update: Partial<ProfileSummary>) => {
    setProfile((prev) => {
      if (!prev) {
        return prev
      }
      const normalizedTheme = ensureTheme(update.theme ?? prev.theme)
      const normalizedDepartment = ensureDepartmentLayout(
        update.departmentLayout ?? prev.departmentLayout
      )
      return {
        ...prev,
        ...update,
        theme: normalizedTheme,
        departmentLayout: normalizedDepartment,
      }
    })
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!authenticatedUser) {
      setProfile(null)
      setPreferencesLoading(false)
      return
    }

    const metadataFullName = pickFirstNonEmptyString(
      authenticatedUser.user_metadata?.full_name,
      authenticatedUser.user_metadata?.name,
      authenticatedUser.user_metadata?.display_name
    )
    const metadataAvatarUrl = pickFirstNonEmptyString(
      authenticatedUser.user_metadata?.avatar_url,
      authenticatedUser.user_metadata?.picture
    )

    setPreferencesLoading(true)
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, email, full_name, avatar_url, bio, last_sign_in, department_layout, theme, password_hash"
        )
        .eq("id", authenticatedUser.id)
        .maybeSingle()

      if (error) {
        console.error("Failed to load profile preferences", error)
        return
      }

      if (data) {
        setProfile({
          id: data.id,
          email: data.email,
          fullName: normalizeFullName({
            stored: data.full_name,
            email: data.email,
            fallback: metadataFullName,
          }),
          avatarUrl: data.avatar_url ?? metadataAvatarUrl,
          bio: data.bio ?? null,
          lastSignIn: data.last_sign_in ?? null,
          departmentLayout: ensureDepartmentLayout(data.department_layout),
          theme: ensureTheme(data.theme),
          hasPassword: Boolean(data.password_hash),
        })
      } else {
        setProfile({
          id: authenticatedUser.id,
          email: authenticatedUser.email ?? "",
          fullName: normalizeFullName({
            stored: null,
            email: authenticatedUser.email ?? "",
            fallback: metadataFullName,
          }),
          avatarUrl: metadataAvatarUrl,
          bio: null,
          lastSignIn: authenticatedUser.last_sign_in_at ?? null,
          departmentLayout: "fullWidth",
          theme: "standard",
          hasPassword: false,
        })
      }
    } finally {
      setPreferencesLoading(false)
    }
  }, [authenticatedUser, supabase])

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (!isMounted) return
      setSession(data.session ?? null)
      lastAuthUserIdRef.current = data.session?.user?.id ?? null
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, nextSession: Session | null) => {
        setSession(nextSession)
        setAuthLoading(false)

        const userId = nextSession?.user?.id ?? null
        if (event === "SIGNED_IN" && userId) {
          const toastToken = deriveSignInToastToken(nextSession)
          const alreadyNotified = hasSeenSignInToast(userId, toastToken)
          if (!alreadyNotified) {
            const createdAtRaw = nextSession?.user?.created_at ?? null
            const lastSignRaw = nextSession?.user?.last_sign_in_at ?? null
            let isFirstSession = false
            if (createdAtRaw && lastSignRaw) {
              const createdAt = Date.parse(createdAtRaw)
              const lastSignedAt = Date.parse(lastSignRaw)
              if (!Number.isNaN(createdAt) && !Number.isNaN(lastSignedAt)) {
                isFirstSession = Math.abs(lastSignedAt - createdAt) <= 60_000
              }
            }
            notify({
              title: isFirstSession ? "Welcome to ASAP!" : "Signed in successfully",
              description: isFirstSession
                ? "Your account is ready to go."
                : "Welcome back to your workspace.",
              variant: "success",
            })
            rememberSignInToast(userId, toastToken)
          }
          lastAuthUserIdRef.current = userId
        } else if (event === "SIGNED_OUT") {
          if (lastAuthUserIdRef.current) {
            clearSignInToastRecord(lastAuthUserIdRef.current)
          }
          lastAuthUserIdRef.current = null
        } else if (userId) {
          lastAuthUserIdRef.current = userId
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [
    clearSignInToastRecord,
    deriveSignInToastToken,
    hasSeenSignInToast,
    notify,
    rememberSignInToast,
    supabase,
  ])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    const handleOpenInviteDialog = () => setInviteDialogOpen(true)
    window.addEventListener(INVITE_DIALOG_OPEN_EVENT, handleOpenInviteDialog)
    return () => {
      window.removeEventListener(INVITE_DIALOG_OPEN_EVENT, handleOpenInviteDialog)
    }
  }, [])

  useEffect(() => {
    if (authLoading) {
      return
    }
    refreshProfile()
  }, [authLoading, refreshProfile])

  useEffect(() => {
    const nextTheme = profile?.theme ?? "standard"
    applyTheme(nextTheme)
  }, [profile?.theme, applyTheme])

  useEffect(() => {
    if (!authenticatedUser) {
      setSettingsDialogOpen(false)
    }
  }, [authenticatedUser])

  const handleSignOut = useCallback(
    async (options?: { redirect?: SignOutRedirect }) => {
      setAuthLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error && error.message !== "Auth session missing!") {
        console.error("Failed to sign out", error)
        setAuthLoading(false)
        return
      }
      setAccountMenuOpen(false)
      setAuthLoading(false)
      router.push("/homepage")
      notify({
        title: "Signed out successfully",
        description: "See you soon on ASAP!",
        variant: "info",
      })
    },
    [notify, router, supabase]
  )

  const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
    setDeleteProjectDialogOpen(open)
    if (!open) {
      deleteProjectTargetIdRef.current = null
      setDeleteProjectTargetId(null)
      setDeleteProjectLoading(false)
      setDeleteProjectError(null)
      setDeleteProjectTitle(null)
      setDeleteProjectTitleLoading(false)
    }
  }, [])

  const promptProjectDelete = useCallback(
    (projectId: string) => {
      deleteProjectTargetIdRef.current = projectId
      setDeleteProjectTargetId(projectId)
      setDeleteProjectError(null)
      setDeleteProjectLoading(false)
      setDeleteProjectDialogOpen(true)
      setDeleteProjectTitle(null)
      setDeleteProjectTitleLoading(true)
      fetchProjectById(projectId)
        .then((project) => {
          if (deleteProjectTargetIdRef.current !== projectId) {
            return
          }
          setDeleteProjectTitle(project?.title ?? null)
        })
        .catch(() => {
          if (deleteProjectTargetIdRef.current !== projectId) {
            return
          }
          setDeleteProjectTitle(null)
        })
        .finally(() => {
          if (deleteProjectTargetIdRef.current !== projectId) {
            return
          }
          setDeleteProjectTitleLoading(false)
        })
    },
    []
  )

  const handleConfirmProjectDelete = useCallback(async () => {
    if (!deleteProjectTargetId) {
      return
    }
    setDeleteProjectLoading(true)
    setDeleteProjectError(null)
    try {
      await deleteProject(deleteProjectTargetId)
      notify({
        title: "Project deleted",
        description: "This project has been removed successfully.",
        variant: "success",
      })
      handleDeleteDialogOpenChange(false)
      router.push("/projects")
    } catch (error) {
      console.error("Failed to delete project", error)
      const raw =
        error instanceof Error ? error.message : "Unable to delete this project right now."
      setDeleteProjectError(raw)
    } finally {
      setDeleteProjectLoading(false)
    }
  }, [deleteProjectTargetId, handleDeleteDialogOpenChange, notify, router])

  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const [leaveLoading, setLeaveLoading] = useState(false)
  const [leaveError, setLeaveError] = useState<string | null>(null)

  const handleLeaveProject = useCallback(async () => {
    if (!activeProjectId) {
      return
    }
    setLeaveError(null)
    setLeaveLoading(true)
    try {
      await leaveProject(activeProjectId)
      notify({
        title: "Left project",
        description: "You have left this project.",
        variant: "info",
      })
      setProjectMembership(null)
      setLeaveDialogOpen(false)
      router.push("/projects")
    } catch (error) {
      console.error("Failed to leave project", error)
      const raw = error instanceof Error ? error.message : "Unable to leave this project."
      setLeaveError(raw)
    } finally {
      setLeaveLoading(false)
    }
  }, [activeProjectId, notify, router])

  useEffect(() => {
    if (!leaveDialogOpen) {
      setLeaveProjectTitle(null)
      setLeaveProjectTitleLoading(false)
      return
    }
    if (!activeProjectId) {
      setLeaveProjectTitle(null)
      return
    }
    let cancelled = false
    setLeaveProjectTitleLoading(true)
    fetchProjectById(activeProjectId)
      .then((project) => {
        if (cancelled) {
          return
        }
        setLeaveProjectTitle(project?.title ?? null)
      })
      .catch(() => {
        if (!cancelled) {
          setLeaveProjectTitle(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLeaveProjectTitleLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [activeProjectId, leaveDialogOpen])

  const handleCreateInviteLink = useCallback(async () => {
    if (!activeProjectId) {
      return
    }
    setInviteError(null)
    setInviteSaving(true)
    try {
      let expiresAt: string | null = null
      if (inviteExpiry !== "never") {
        const durationMs = INVITE_EXPIRY_PRESETS_MS[inviteExpiry]
        if (durationMs) {
          expiresAt = new Date(Date.now() + durationMs).toISOString()
        }
      }
      if (inviteRoleHeadExclusive && !inviteDepartmentId && !isHeaderViewer) {
        setInviteError("Select a department without a head for this role.")
        setInviteSaving(false)
        return
      }
      if (isHeaderViewer && !viewerDepartmentId) {
        setInviteError("You need a department before creating invites.")
        setInviteSaving(false)
        return
      }
      if (isHeaderViewer && inviteRoleKey !== "member") {
        setInviteRoleKey("member")
        setInviteError("Headers can only invite members.")
        setInviteSaving(false)
        return
      }
      const effectiveDepartmentId = isHeaderViewer ? viewerDepartmentId : inviteDepartmentId
      let maxUsesPayload: number | null = null
      if (canCustomizeInviteMaxUses) {
        if (inviteMaxUsesCustom) {
          const parsedMax = Number(inviteMaxUses)
          if (Number.isFinite(parsedMax) && parsedMax > 0) {
            maxUsesPayload = Math.floor(parsedMax)
          } else {
            setInviteError("Enter how many people can use this link, or switch to Unlimited.")
            setInviteSaving(false)
            return
          }
        } else {
          maxUsesPayload = null
        }
      }
      const newInvite = await createProjectInvite(activeProjectId, {
        expiresAt,
        role: inviteRole,
        departmentId: effectiveDepartmentId,
        maxUses: maxUsesPayload,
      })
      setInvites((prev) => {
        const filtered = prev.filter((invite) => invite.id !== newInvite.id)
        return [newInvite, ...filtered]
      })
      notify({
        title: "Invite link created",
        description: "Copy the link below to share with your teammates.",
        variant: "success",
      })
    } catch (error) {
      console.error("Failed to create invite link", error)
      const raw = error instanceof Error ? error.message : "Unable to create invite."
      setInviteError(raw)
    } finally {
      setInviteSaving(false)
    }
  }, [
    activeProjectId,
    canCustomizeInviteMaxUses,
    isHeaderViewer,
    inviteDepartmentId,
    inviteExpiry,
    inviteMaxUses,
    inviteMaxUsesCustom,
    inviteRole,
    inviteRoleKey,
    inviteRoleHeadExclusive,
    notify,
    viewerDepartmentId,
  ])

  const handleCopyInvite = useCallback(
    async (token: string) => {
      if (typeof navigator?.clipboard?.writeText !== "function") {
        notify({
          title: "Clipboard unavailable",
          description: "You can manually copy the link below.",
          variant: "info",
        })
        return
      }
      const baseUrl = typeof window === "undefined" ? "" : window.location.origin
      const url = `${baseUrl}/invite/${token}`
      try {
        await navigator.clipboard.writeText(url)
        notify({
          title: "Invite link copied",
          description: "Share it with anyone you’d like to invite.",
          variant: "success",
        })
      } catch (error) {
        console.error("Failed to copy invite", error)
        notify({
          title: "Copy failed",
          description: "You can manually copy the link instead.",
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
        console.error("Failed to revoke invite", error)
        const raw =
          error instanceof Error ? error.message : "Unable to revoke this invite right now."
        notify({
          title: "Revoke failed",
          description: raw,
          variant: "destructive",
        })
      }
    },
    [activeProjectId, notify, refreshInvites]
  )

  const toggleOwnerSelection = useCallback((memberId: string) => {
    setOwnerSelection((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.add(memberId)
      }
      return next
    })
  }, [])

  const handleSaveOwners = useCallback(async () => {
    if (!activeProjectId) {
      return
    }
    if (ownerSelection.size === 0) {
      setOwnerError("Select at least one owner.")
      return
    }
    setOwnersSaving(true)
    setOwnerError(null)
    try {
      await updateProjectOwners(activeProjectId, Array.from(ownerSelection))
      await refreshOwnerCandidates()
      await refreshMembership()
      notify({
        title: "Owners updated",
        description: "Project ownership has been updated.",
        variant: "success",
      })
      setOwnerDialogOpen(false)
      if (typeof window !== "undefined") {
        window.location.reload()
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error("Failed to update owners", error)
      const raw =
        error instanceof Error ? error.message : "Unable to update project owners right now."
      setOwnerError(raw)
    } finally {
      setOwnersSaving(false)
    }
  }, [activeProjectId, ownerSelection, notify, refreshMembership, refreshOwnerCandidates, router])

  const avatarUrl =
    profile?.avatarUrl ??
    ((authenticatedUser?.user_metadata?.avatar_url as string | undefined) ?? undefined)
  const avatarLetter =
    profile?.fullName?.charAt(0).toUpperCase() ??
    authenticatedUser?.email?.charAt(0).toUpperCase() ??
    "U"

      const avatar = authenticatedUser ? (
        avatarUrl ? (
          <Image
            src={avatarUrl}
            alt="User avatar"
            width={36}
            height={36}
            className="size-full rounded-full object-cover"
            priority
            data-cy="nav-account-avatar"
          />
        ) : (
      <div className="flex size-full items-center justify-center rounded-full bg-button-background-on-nav text-button-foreground-on-nav text-sm font-semibold">
        {avatarLetter}
      </div>
    )
  ) : (
    <UserIcon className="size-7 text-button-foreground-on-nav" />
  )

  const projectNavItems = useMemo(
    () => [
      {
        key: "info" as const,
        label: "Info",
        href: activeProjectId ? `/projects/${activeProjectId}` : "/projects",
        disabled: !activeProjectId,
      },
      {
        key: "member" as const,
        label: "Members",
        href: activeProjectId ? `/projects/${activeProjectId}/member` : "",
        disabled: !activeProjectId,
      },
      {
        key: "department" as const,
        label: "Departments",
        href: activeProjectId ? `/projects/${activeProjectId}/department` : "",
        disabled: !activeProjectId,
      },
      {
        key: "task" as const,
        label: "Tasks",
        href: activeProjectId ? `/projects/${activeProjectId}/task` : "",
        disabled: !activeProjectId,
      },
      {
        key: "calendar" as const,
        label: "Calendar",
        href: activeProjectId ? `/projects/${activeProjectId}/calendar` : "",
        disabled: !activeProjectId,
      },
    ],
    [activeProjectId]
  )

  useEffect(() => {
    if (projectMembership?.username) {
      setPendingUsername(projectMembership.username)
    } else {
      setPendingUsername("")
    }
  }, [projectMembership?.username])

  useEffect(() => {
    if (!activeProjectId) {
      lastMarkedUsageRef.current = null
      return
    }
    const marker = `${activeProjectId}:${pathname}`
    if (lastMarkedUsageRef.current === marker) {
      return
    }
    lastMarkedUsageRef.current = marker
    markProjectUsage(activeProjectId).catch((error) => {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Failed to mark project usage", error)
      }
    })
  }, [activeProjectId, pathname])

  const setHeaderVariant = useCallback((variant: HeaderVariant | null) => {
    setHeaderOverride(variant)
  }, [])

  const defaultHeaderVariant: HeaderVariant = isHomepage
    ? "homepage"
    : isProjects
      ? "projects"
      : "none"
  const headerVariant = headerOverride ?? defaultHeaderVariant

  const logoDestination = headerVariant === "minimal" ? "/homepage" : "/projects"

  const handleLogoClick = useCallback(() => {
    router.push(logoDestination)
  }, [router, logoDestination])

  const renderAccountDropdown = (redirect: SignOutRedirect) => {
    if (!authenticatedUser) {
      return null
    }

    return (
      <DropdownMenu modal={false} onOpenChange={setAccountMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            className={cn(
              "bg-button-background-on-nav hover:bg-button-hover-background-on-nav active:bg-button-hover-background-on-nav rounded-full size-9 p-0 transition-colors select-none",
              accountMenuOpen && "ring-2 ring-button-foreground-on-nav/40"
            )}
            aria-pressed={accountMenuOpen}
          >
            {avatar}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-button-background-on-nav text-foreground border-none rounded-2xl p-2"
        >
          <DropdownMenuLabel className="text-primary rounded-xl py-3 px-4 cursor-text text-base font-semibold">
            {authenticatedUser.email ?? "My Account"}
          </DropdownMenuLabel>
          <DropdownMenuItem
            data-cy="account-menu-settings"
            className="text-foreground hover:bg-button-hover-background-on-nav rounded-xl py-3 px-4 cursor-pointer text-base"
            onSelect={() => {
              setAccountMenuOpen(false)
              setSettingsDialogOpen(true)
            }}
          >
            <span className="inline-flex items-center gap-2">
              <SettingsIcon className="size-4" />
              Account Settings
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            data-cy="account-menu-signout"
            className="rounded-xl py-3 px-4 cursor-pointer text-base text-destructive transition hover:bg-destructive/10 focus:bg-destructive/10"
            onSelect={() => handleSignOut({ redirect })}
          >
            <span className="inline-flex items-center gap-2 font-semibold text-destructive">
              <LogOut className="size-4 text-destructive" />
              Log out
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const renderProjectActionsMenu = () => {
    if (!activeProjectId || isProjectEditPage) {
      return null
    }
    const role = projectMembership?.role ?? "MEMBER"
    const canInviteMembers =
      role === "OWNER" || role === "HEADER"
    const canEditThisProject = role === "OWNER"
    const canDeleteThisProject = role === "OWNER"
    const canChangeOwner = role === "OWNER"
    const canChangeUsername = Boolean(projectMembership)
    return (
       <DropdownMenu modal={false} onOpenChange={setProjectActionsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "size-8 mr-3 rounded-full border transition-colors duration-200 focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-0",
              projectActionsOpen
                ? "border-primary/40 bg-white/90 text-primary shadow-[0_1px_3px_rgba(79,61,152,0.95)] hover:bg-white/80 hover:text-primary"
                : "border-transparent text-button-foreground-on-nav hover:border-primary/30 hover:bg-white/80 hover:text-primary"
            )}
            aria-label="Project actions"
            aria-pressed={projectActionsOpen}
          >
            <MoreHorizontal className={projectActionsOpen ? "size-5 text-primary" : "size-5 text-current"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 rounded-3xl border border-button-background-on-nav/40 bg-button-background-on-nav/95 p-2 text-foreground shadow-[0_16px_30px_rgba(39,36,66,0.25)]"
        >
          {canInviteMembers ? (
            <DropdownMenuItem
              data-cy="project-actions-invite-link"
              className="rounded-2xl px-4 py-3 text-sm font-semibold transition hover:bg-button-hover-background-on-nav"
              onSelect={() => {
                setProjectActionsOpen(false)
                setInviteDialogOpen(true)
              }}
            >
              <span className="inline-flex items-center gap-2">
                <Link2 className="size-4" />
                Invite Link
              </span>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            data-cy="project-actions-refresh"
            className="rounded-2xl px-4 py-3 text-sm font-semibold transition hover:bg-button-hover-background-on-nav"
            onSelect={() => {
              setProjectActionsOpen(false)
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent(PROJECT_REFRESH_EVENT, {
                    detail: { projectId: activeProjectId ?? null },
                  })
                )
              } else {
                router.refresh()
              }
            }}
          >
              <span className="inline-flex items-center gap-2">
                <RefreshCcw className="size-4" />
                Refresh
              </span>
            </DropdownMenuItem>
          <DropdownMenuItem
            data-cy="project-actions-change-username"
            className="rounded-2xl px-4 py-3 text-sm font-semibold transition hover:bg-button-hover-background-on-nav"
            disabled={!canChangeUsername}
            onSelect={() => {
              if (!projectMembership) {
                return
              }
              setPendingUsername(projectMembership.username)
              setUsernameDialogOpen(true)
            }}
          >
            <span className="inline-flex items-center gap-2">
              <UserPen className="size-4" />
              Change Username
            </span>
          </DropdownMenuItem>
          {canEditThisProject ? (
            <DropdownMenuItem
              data-cy="project-actions-edit"
              className="rounded-2xl px-4 py-3 text-sm font-semibold transition hover:bg-button-hover-background-on-nav"
              onSelect={() => {
              if (activeProjectId) {
                router.push(`/projects/${activeProjectId}/edit`)
              }
            }}
          >
              <span className="inline-flex items-center gap-2">
                <PencilLine className="size-4" />
                Edit Project
              </span>
            </DropdownMenuItem>
          ) : null}
          {canChangeOwner ? (
            <DropdownMenuItem
              data-cy="project-actions-change-owner"
              className="rounded-2xl px-4 py-3 text-sm font-semibold transition hover:bg-button-hover-background-on-nav"
              onSelect={() => {
              setProjectActionsOpen(false)
              setOwnerDialogOpen(true)
            }}
          >
              <span className="inline-flex items-center gap-2">
                <UserPen className="size-4" />
                Change Project Owner
              </span>
            </DropdownMenuItem>
          ) : null}
          {canDeleteThisProject ? (
            <DropdownMenuItem
              data-cy="project-actions-delete"
              className="rounded-2xl px-4 py-3 text-sm font-semibold transition hover:bg-destructive/10 focus:bg-destructive/10"
              onSelect={(event) => {
              event.preventDefault()
              event.stopPropagation()
              if (!activeProjectId) {
                return
              }
              setProjectActionsOpen(false)
              promptProjectDelete(activeProjectId)
            }}
          >
              <span className="inline-flex items-center gap-2 text-destructive font-semibold">
                <Trash2 className="size-4 text-destructive" />
                Delete Project
              </span>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            data-cy="project-actions-leave"
            className="rounded-2xl px-4 py-3 text-sm font-semibold transition hover:bg-button-hover-background-on-nav"
            onSelect={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setProjectActionsOpen(false)
              setLeaveDialogOpen(true)
            }}
          >
            <span className="inline-flex items-center gap-2">
              <LogOut className="size-4" />
              Leave Project
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const header = (() => {
    if (headerVariant === "homepage") {
      return (
        <header className="fixed inset-x-0 top-0 z-50 bg-primary px-[clamp(1.5rem,1vw,3rem)] py-[clamp(0.6rem,1vh,1rem)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-[clamp(1.5rem,7vw,7rem)]">
              <button
                type="button"
                onClick={handleLogoClick}
                disabled={isHomepage}
                className={cn(
                  "rounded-full bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-button-foreground-on-nav/40",
                  isHomepage ? "cursor-default" : "cursor-pointer"
                )}
                aria-label={isHomepage ? "ASAP" : "Go to projects"}
                data-cy="app-shell-logo-button"
              >
                <span
                  className="text-primary-foreground text-3xl font-bold leading-none select-none"
                  draggable={false}
                  role="heading"
                  aria-level={1}
                >
                  ASAP
                </span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              {authenticatedUser ? (
                renderAccountDropdown("google")
              ) : (
                <Button
                  variant="secondary"
                  className="bg-button-background text-button-foreground-on-nav hover:bg-button-hover-background-on-nav hover:text-foreground rounded-full px-[clamp(2.5rem,5vw,4rem)] py-[clamp(0.5rem,1.6vh,0.85rem)] text-[clamp(1rem,2.1vw,1.15rem)] font-semibold"
                  onClick={() => router.push("/auth/traditional")}
                  disabled={authLoading}
                  data-cy="app-shell-sign-in-button"
                >
                  {authLoading ? "Loading..." : "Sign In"}
                </Button>
              )}
            </div>
          </div>
        </header>
      )
    }

    if (headerVariant === "projects") {
      const projectNavContent = hasProjectTabs ? (
        <nav className="flex max-w-4xl flex-1 items-center gap-2 overflow-x-auto px-2">
          {projectNavItems.map((item) => {
            const isActive = currentProjectSection === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  if (item.disabled || !item.href) {
                    return
                  }
                  router.push(item.href)
                }}
                aria-current={isActive ? "page" : undefined}
                disabled={item.disabled}
                data-cy={`project-nav-${item.key}`}
                className={cn(
                  "relative flex min-w-[5.5rem] flex-1 items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-button-foreground-on-nav transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50",
                  isActive &&
                    "text-foreground-for-nav before:absolute before:bottom-1 before:left-4 before:right-4 before:h-1 before:rounded-full before:bg-underline-foreground-for-nav before:content-['']",
                  !isActive && "hover:text-hover-foreground-for-nav"
                )}
              >
                {item.label}
              </button>
            )
          })}
        </nav>
      ) : null

      return (
        <header className="fixed inset-x-0 top-0 z-50 bg-primary">
          <div className="px-[clamp(1.5rem,1vw,3rem)] py-[clamp(0.6rem,1vh,1rem)]">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={handleLogoClick}
                  disabled={isHomepage}
                  className={cn(
                    "rounded-full bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-button-foreground-on-nav/40",
                    isHomepage ? "cursor-default" : "cursor-pointer"
                  )}
                  aria-label={isHomepage ? "ASAP" : "Go to projects"}
                >
                  <span
                    className="select-none text-3xl font-bold leading-none text-primary-foreground"
                    draggable={false}
                    role="heading"
                    aria-level={1}
                  >
                    ASAP
                  </span>
                </button>
              </div>
              <div className="flex flex-1 items-center gap-3 min-w-0">
                {hasProjectTabs ? (
                  <div className="flex flex-1 justify-center min-w-0">{projectNavContent}</div>
                ) : (
                  <div className="flex-1" />
                )}
                  <div className="flex items-center gap-3">
                    {renderProjectActionsMenu()}
                    {authenticatedUser ? (
                      renderAccountDropdown("homepage")
                    ) : (
                      <Button
                      variant="secondary"
                      className="rounded-full bg-button-background-on-nav px-6 py-2 text-base font-semibold text-button-foreground-on-nav hover:bg-button-hover-background-on-nav"
                      onClick={() => router.push("/auth/traditional")}
                      disabled={authLoading}
                    >
                      {authLoading ? "Loading..." : "Sign In"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>
      )
    }

    if (headerVariant === "minimal") {
      return (
        <header className="fixed inset-x-0 top-0 z-50 bg-primary">
          <div className="px-[clamp(1.5rem,1vw,3rem)] py-[clamp(0.6rem,1.6vh,1rem)]">
            <button
              type="button"
              onClick={handleLogoClick}
              className="rounded-full bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-button-foreground-on-nav/40"
              aria-label="Go to homepage"
              data-cy="app-shell-logo-button"
            >
              <span
                className="select-none text-3xl font-bold leading-none text-primary-foreground"
                draggable={false}
                role="heading"
                aria-level={1}
              >
                ASAP
              </span>
            </button>
          </div>
        </header>
      )
    }

    return null
  })()

  const headerSpacingClass =
    headerSpacingOverride === "none"
      ? "pt-0"
      : headerVariant !== "none"
        ? "pt-[clamp(3.5rem,6vh,4rem)]"
        : null

  const mainClassName = cn(
    "flex-1 w-full items-center bg-background flex flex-col min-h-0 overflow-y-hidden",
    headerSpacingClass,
    headerVariant === "homepage" && "flex items-center justify-center",
    isTraditionalAuth && [
      " bg-gradient-to-br from-primary via-primary-soft to-secondary",
    ]
  )

  const layoutContextValue = useMemo(
    () => ({
      setHeaderVariant,
      setHeaderSpacing: setHeaderSpacingOverride,
    }),
    [setHeaderVariant, setHeaderSpacingOverride]
  )

  

  return (
    <AppShellLayoutContext.Provider value={layoutContextValue}>
      <PreferencesContext.Provider
        value={{
          profile,
          loading: preferencesLoading,
          refreshProfile,
          updateProfileLocally,
        }}
      >
          <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
          <DialogContent
            className={cn(
              "w-[min(100vw,1500px)] rounded-[2.5rem] border-none bg-card-project p-0 shadow-2xl",
              "overflow-hidden max-h-[95vh]"
            )}
          >
              <div className="max-h-[85vh] overflow-hidden">
                <div className="px-8 py-8">
                  <DialogHeader className="sr-only">
                    <DialogTitle>Account Settings</DialogTitle>
                  </DialogHeader>
                  <AccountSettingsContent
                    profile={profile}
                    loading={preferencesLoading}
                    refreshProfile={refreshProfile}
                    updateProfileLocally={updateProfileLocally}
                    variant="dialog"
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={usernameDialogOpen} onOpenChange={setUsernameDialogOpen}>
            <DialogContent className="max-w-md rounded-[3rem] border-2 border-primary/40 bg-white/95 px-10 py-8 text-center shadow-[0_20px_40px_rgba(72,68,110,0.25)]">
              <DialogHeader className="space-y-2">
                <DialogTitle className="text-xl font-bold text-[#2F2766]">
                  Change Username in this Project
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4 space-y-6">
                <input
                  type="text"
                  value={pendingUsername}
                  onChange={(event) => setPendingUsername(event.target.value)}
                  className="h-12 w-full rounded-full border-2 border-primary/40 bg-white px-5 text-base font-semibold text-[#2F2766] shadow-[0_6px_0_rgba(144,122,214,0.2)] focus:border-primary focus:outline-none"
                  placeholder="Username"
                />
                <Button
                  type="button"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#3F3478] px-8 text-base font-semibold text-white shadow-[0_6px_0_rgba(63,52,120,0.3)] transition hover:bg-[#2F2766]"
                  disabled={usernameSaving || !pendingUsername.trim()}
                  onClick={async () => {
                    if (!activeProjectId) {
                      return
                    }
                    const trimmed = pendingUsername.trim()
                    if (!trimmed) {
                      notify({
                        title: "Username is required",
                        description: "Please provide a username for this project.",
                        variant: "destructive",
                      })
                      return
                    }
                    try {
                      setUsernameSaving(true)
                      await changeProjectUsername(activeProjectId, trimmed)
                      setProjectMembership((prev) =>
                        prev ? { ...prev, username: trimmed } : prev
                      )
                      notify({
                        title: "Username updated",
                        description: "Your project username has been updated.",
                        variant: "success",
                      })
                      setUsernameDialogOpen(false)
                    } catch (error) {
                      console.error("Failed to change username", error)
                      const raw =
                        error instanceof Error ? error.message : "Unable to update username."
                      notify({
                        title: "Update failed",
                        description: raw,
                        variant: "destructive",
                      })
                    } finally {
                      setUsernameSaving(false)
                    }
                  }}
                >
                  {usernameSaving ? "Saving…" : "Save"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogContent className="max-w-2xl rounded-[2rem] border-2 border-primary/30 bg-white px-8 py-8 shadow-xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-[#2F2766]">
                  Invite teammates
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-[#2F2766]">
                    Link expiry
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="inline-flex h-11 w-full min-w-[12rem] flex-1 items-center justify-between rounded-full border-2 border-primary/30 bg-white px-4 text-sm font-semibold text-[#2F2766]"
                          data-cy="project-invite-expiry-trigger"
                        >
                          <span>
                            {INVITE_EXPIRY_OPTIONS.find((option) => option.value === inviteExpiry)?.label ??
                              "Select expiry"}
                          </span>
                          <ChevronDown className="size-4 text-primary/70" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="member-filter-scroll w-60 rounded-3xl border border-primary/30 bg-white px-2 py-2 text-sm font-semibold text-[#2F2766] shadow-[0_12px_30px_rgba(72,68,110,0.15)]"
                      >
                        {INVITE_EXPIRY_OPTIONS.map((option) => {
                          const isActive = option.value === inviteExpiry
                          return (
                            <DropdownMenuItem
                              data-cy={`project-invite-expiry-option-${option.value}`}
                              key={option.value}
                              onSelect={() => setInviteExpiry(option.value)}
                              className="flex items-center justify-between rounded-2xl px-3 py-2 focus:bg-primary/10 focus:text-primary"
                            >
                              <span>{option.label}</span>
                              {isActive ? <Check className="size-4 text-primary" /> : null}
                            </DropdownMenuItem>
                          )
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      type="button"
                      className="h-11 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:w-auto"
                      disabled={inviteSaving}
                      onClick={handleCreateInviteLink}
                      data-cy="project-invite-generate-link"
                    >
                      {inviteSaving ? "Generating…" : "Generate link"}
                    </Button>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#2F2766]">Invite role</label>
                    {isHeaderViewer ? (
                      <div className="inline-flex h-11 w-full select-none items-center justify-between rounded-full border-2 border-primary/30 bg-white px-4 text-sm font-semibold text-[#2F2766]">
                        <span>Member</span>
                        <ChevronDown className="size-4 text-primary/30" />
                      </div>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="inline-flex h-11 w-full items-center justify-between rounded-full border-2 border-primary/30 bg-white px-4 text-sm font-semibold text-[#2F2766]"
                            data-cy="project-invite-role-trigger"
                          >
                            <span>{inviteRoleOption.label}</span>
                            <ChevronDown className="size-4 text-primary/70" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          className="w-60 max-h-64 overflow-y-auto rounded-3xl border border-primary/30 bg-white px-2 py-2 text-sm font-semibold text-[#2F2766] shadow-[0_12px_30px_rgba(72,68,110,0.15)]"
                        >
                          {INVITE_ROLE_OPTIONS.filter(
                            (option) => !(option.headExclusive && !headlessDepartmentAvailable)
                          ).map((option) => {
                            const disabled =
                              option.requiresOwner && viewerRole !== PROJECT_ROLE.OWNER
                            const isActive = inviteRoleKey === option.key
                            return (
                            <DropdownMenuItem
                              data-cy={`project-invite-role-option-${option.key}`}
                              key={option.key}
                              disabled={disabled}
                              onSelect={(event) => {
                                if (disabled) {
                                  event.preventDefault()
                                  return
                                }
                                  setInviteRoleKey(option.key)
                              }}
                              className="flex items-center justify-between rounded-2xl px-3 py-2 hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary disabled:opacity-50"
                            >
                                <span>{option.label}</span>
                                {isActive ? <Check className="size-4 text-primary" /> : null}
                              </DropdownMenuItem>
                            )
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#2F2766]">Department</label>
                    {inviteDepartmentsLoading ? (
                      <div className="text-xs text-muted-foreground">Loading departments…</div>
                    ) : inviteDepartmentsError ? (
                      <div className="text-xs text-destructive">{inviteDepartmentsError}</div>
                    ) : inviteRoleHeadExclusive && availableInviteDepartments.length === 0 ? (
                      <div className="text-xs text-muted-foreground">
                        All departments already have a head.
                      </div>
                    ) : (
                      <>
                        {isHeaderViewer ? (
                          <div className="inline-flex h-11 w-full select-none items-center justify-between rounded-full border-2 border-primary/30 bg-white px-4 text-sm font-semibold text-[#2F2766]">
                            <span>
                              {viewerDepartmentId
                                ? inviteDepartments.find((dept) => dept.id === viewerDepartmentId)?.name ??
                                  "Department"
                                : "No department"}
                            </span>
                            <ChevronDown className="size-4 text-primary/30" />
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="inline-flex h-11 w-full items-center justify-between rounded-full border-2 border-primary/30 bg-white px-4 text-sm font-semibold text-[#2F2766]"
                              data-cy="project-invite-department-trigger"
                            >
                                <span>
                                  {inviteDepartmentId
                                    ? inviteDepartments.find((dept) => dept.id === inviteDepartmentId)?.name ??
                                      "Department"
                                    : "No department"}
                                </span>
                                <ChevronDown className="size-4 text-primary/70" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="start"
                              className="w-60 rounded-3xl border border-primary/30 bg-white px-2 py-2 text-sm font-semibold text-[#2F2766] shadow-[0_12px_30px_rgba(72,68,110,0.15)]"
                            >
                              {inviteRoleHeadExclusive ? null : (
                              <DropdownMenuItem
                                data-cy="project-invite-department-option-none"
                                onSelect={() => {
                                  setInviteDepartmentId(null)
                                }}
                                className="flex items-center justify-between rounded-2xl px-3 py-2 hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary"
                              >
                                  <span>No department</span>
                                  {!inviteDepartmentId ? <Check className="size-4 text-primary" /> : null}
                                </DropdownMenuItem>
                              )}
                              {availableInviteDepartments.map((dept) => {
                                const isActive = inviteDepartmentId === dept.id
                              return (
                                <DropdownMenuItem
                                  data-cy={`project-invite-department-option-${dept.id}`}
                                  key={dept.id}
                                  onSelect={() => {
                                    setInviteDepartmentId(dept.id)
                                  }}
                                  className="flex items-center justify-between rounded-2xl px-3 py-2 hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary"
                                >
                                    <span>{dept.name}</span>
                                    {isActive ? <Check className="size-4 text-primary" /> : null}
                                  </DropdownMenuItem>
                                )
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-[#2F2766]">Max uses</label>
                  {canCustomizeInviteMaxUses ? (
                    <div className="space-y-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                          <div className="flex items-center gap-3 rounded-full border-2 border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-[#2F2766]">
                            <span>Custom limit</span>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={inviteMaxUsesCustom}
                              onClick={() => setInviteMaxUsesCustom((prev) => !prev)}
                              className={cn(
                                "relative inline-flex h-8 w-16 items-center rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                                inviteMaxUsesCustom
                                  ? "border-primary bg-primary/20"
                                  : "border-primary bg-primary"
                              )}
                              data-cy="project-invite-max-uses-toggle"
                            >
                            <span
                              className={cn(
                                "inline-block h-6 w-6 rounded-full bg-white shadow transition-all",
                                inviteMaxUsesCustom
                                  ? "translate-x-1"
                                  : "translate-x-[2rem]"
                              )}
                            />
                          </button>
                          <span>Unlimited</span>
                        </div>
                          {inviteMaxUsesCustom ? (
                            <input
                              type="number"
                              min={1}
                              inputMode="numeric"
                              value={inviteMaxUses}
                              onChange={(event) =>
                                setInviteMaxUses(event.target.value.replace(/[^0-9]/g, ""))
                              }
                              className="h-11 w-full rounded-full border-2 border-primary/30 bg-white px-4 text-sm font-semibold text-[#2F2766] shadow-[0_2px_0_rgba(144,122,214,0.15)] focus:border-primary focus-visible:outline-none sm:max-w-[9rem]"
                              placeholder="10"
                              data-cy="project-invite-max-uses-input"
                            />
                        ) : (
                          <p className="text-xs w-40 text-muted-foreground">
                            Unlimited invites until you delete the link manually.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Header invites are single-use and delete themselves after joining.
                    </p>
                  )}
                </div>
                {inviteError ? (
                  <p className="text-sm font-semibold text-destructive" data-cy="project-invite-error">
                    {inviteError}
                  </p>
                ) : null}
                <div
                  className="asap-scroll [scrollbar-gutter:stable] max-h-50 space-y-3 overflow-y-auto pr-1"
                  data-cy="project-invite-list"
                >
                  {invitesLoading ? (
                    <p className="text-sm text-muted-foreground">Loading invite links…</p>
                  ) : invites.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No invite links yet. Generate one to start inviting your team.
                    </p>
                  ) : (
                    invites.map((invite) => {
                      const baseUrl =
                        typeof window === "undefined" ? "" : window.location.origin
                      const inviteUrl = `${baseUrl}/invite/${invite.token}`
                      const expiryLabel = invite.expiresAt
                        ? `Expires ${new Date(invite.expiresAt).toLocaleString()}`
                        : "No expiry"
                      const isOwnerHeadInvite =
                        invite.role === PROJECT_ROLE.OWNER && Boolean(invite.departmentId)
                      const roleLabel =
                        invite.role === PROJECT_ROLE.OWNER
                          ? isOwnerHeadInvite
                            ? "Header (Project Owner)"
                            : "Project Owner"
                          : invite.role === PROJECT_ROLE.HEADER
                            ? "Header"
                            : "Member"
                      const departmentLabel = invite.department?.name ?? "No department"
                      return (
                        <div
                          key={invite.id}
                          className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-[#2F2766]"
                          data-cy={`project-invite-row-${invite.id}`}
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-semibold break-all">{inviteUrl}</p>
                              <p className="text-xs text-muted-foreground">{expiryLabel}</p>
                              <p className="text-xs text-muted-foreground">Role: {roleLabel}</p>
                              <p className="text-xs text-muted-foreground">
                                Department: {departmentLabel}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-full px-4 py-2 text-xs font-semibold"
                                onClick={() => handleCopyInvite(invite.token)}
                                data-cy={`project-invite-copy-${invite.id}`}
                              >
                                Copy
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                className="rounded-full px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteInviteLink(invite.id)}
                                data-cy={`project-invite-remove-${invite.id}`}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={ownerDialogOpen} onOpenChange={setOwnerDialogOpen}>
            <DialogContent className="max-w-2xl rounded-[2rem] border-2 border-primary/30 bg-white px-8 py-8 shadow-xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-[#2F2766]">
                  Change Project Owners
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  Select one or more members to act as project owners. Owners can manage every
                  aspect of the project.
                </p>
                {ownerError ? (
                  <p className="text-sm font-semibold text-destructive">{ownerError}</p>
                ) : null}
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">
                      Owners
                    </p>
                  </div>
                  {selectedOwners.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-primary/30 bg-white px-4 py-5 text-sm text-muted-foreground">
                      Choose members from the list below to make them owners.
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-primary/30 bg-white px-4 py-3">
                      <div
                        className={cn(
                          "asap-scroll max-h-30 overflow-y-auto pr-2 [scrollbar-gutter:stable]",
                          (profile?.departmentLayout ?? "fullWidth") === "compact"
                            ? "flex flex-wrap gap-3"
                            : "flex flex-col gap-3"
                        )}
                      >
                        {filteredSelectedOwners.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-primary/30 bg-white px-4 py-5 text-sm text-muted-foreground">
                            No selected owners match your search.
                          </div>
                        ) : (
                          filteredSelectedOwners.map((owner) => (
                            <button
                              key={owner.id}
                              type="button"
                              onClick={() => toggleOwnerSelection(owner.id)}
                              className={cn(
                                "inline-flex min-w-0 items-center gap-2 rounded-full border-2 border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/10",
                                (profile?.departmentLayout ?? "fullWidth") === "compact"
                                  ? "min-w-[9rem]"
                                  : "w-full"
                              )}
                            >
                              <span className="flex-1 truncate text-left">{owner.username}</span>
                              <X className="ml-2 size-4 shrink-0" />
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">
                      Selected owners
                    </p>
                    <div className="relative w-full max-w-xs">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/50" />
                      <input
                        type="text"
                        value={ownerSearch}
                        onChange={(event) => setOwnerSearch(event.target.value)}
                        placeholder="Search username"
                        className="w-full rounded-full border-2 border-primary/25 bg-white py-2 pl-9 pr-3 text-sm font-semibold text-[#2F2766] placeholder:text-primary/40 focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="asap-scroll [scrollbar-gutter:stable] max-h-40 space-y-3 overflow-y-auto pr-1">
                    {ownersLoading ? (
                      <p className="text-sm text-muted-foreground">Loading project members…</p>
                    ) : ownerCandidates.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        This project does not have any members yet.
                      </p>
                    ) : filteredOwnerCandidates.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No members match your search.
                      </p>
                    ) : (
                      filteredOwnerCandidates.map((candidate) => {
                        const isSelected = ownerSelection.has(candidate.id)
                        return (
                          <button
                            key={candidate.id}
                            type="button"
                            onClick={() => toggleOwnerSelection(candidate.id)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-2xl border border-primary/20 bg-white px-4 py-3 text-left text-sm font-semibold text-[#2F2766] transition hover:border-primary hover:bg-primary/5",
                              isSelected && "border-primary bg-primary/10"
                            )}
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold">{candidate.username}</span>
                              <span className="text-xs text-muted-foreground">
                                {candidate.role}
                              </span>
                            </div>
                            {isSelected ? <Check className="size-4 text-primary" /> : null}
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full px-6 py-2 text-sm font-semibold"
                    onClick={() => setOwnerDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                    disabled={ownersSaving || ownerSelection.size === 0}
                    onClick={handleSaveOwners}
                  >
                    {ownersSaving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <AlertDialog open={deleteProjectDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
            <AlertDialogContent className="rounded-[2rem] border-2 border-primary/30 px-8 py-10 text-center shadow-xl">
              <AlertDialogTitle className="text-2xl font-semibold text-foreground">
                Are you sure? <br /> You want to delete this project? <br />
                <br />
                <span className="block min-h-[1.5rem] break-words break-all px-2 text-primary">
                  {deleteProjectTitleLoading
                    ? "Loading project details…"
                    : deleteProjectTitle || deleteProjectTargetId
                      ? `"${deleteProjectTitle ?? deleteProjectTargetId ?? ""}"`
                      : ""}
                </span>
              </AlertDialogTitle>
              {deleteProjectError ? (
                <p className="mt-4 text-sm font-semibold text-destructive">
                  {deleteProjectError}
                </p>
              ) : null}
              <AlertDialogFooter className="mt-8 flex w-full flex-row justify-end gap-4">
                <AlertDialogCancel
                  className="rounded-full border-none bg-secondary px-8 py-3 text-base font-semibold text-secondary-foreground shadow-none transition hover:bg-secondary/80 disabled:opacity-70"
                  disabled={deleteProjectLoading}
                >
                  No
                </AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-full bg-primary px-8 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-80"
                  onClick={handleConfirmProjectDelete}
                  disabled={deleteProjectLoading}
                >
                  {deleteProjectLoading ? "Deleting…" : "Yes"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
            <AlertDialogContent className="rounded-[2rem] border-2 border-primary/30 px-8 py-10 text-center shadow-xl">
              <AlertDialogTitle className="text-2xl font-semibold text-foreground">
                Are you sure? <br /> You want to leave this project? <br />
                <br />
                <span className="block min-h-[1.5rem] break-words break-all px-2 text-primary">
                  {leaveProjectTitleLoading
                    ? "Loading project details…"
                    : leaveProjectTitle ?
                      `"${leaveProjectTitle}"` : ""}
                </span>
              </AlertDialogTitle>
              {leaveError ? (
                <p className="mt-4 text-sm font-semibold text-destructive">{leaveError}</p>
              ) : null}
              <AlertDialogFooter className="mt-8 flex w-full flex-row justify-end gap-4">
                <AlertDialogCancel
                  className="rounded-full border-none bg-secondary px-8 py-3 text-base font-semibold text-secondary-foreground shadow-none transition hover:bg-secondary/80"
                  disabled={leaveLoading}
                >
                  Stay
                </AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-full bg-primary px-8 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-80"
                  onClick={handleLeaveProject}
                  disabled={leaveLoading}
                >
                  {leaveLoading ? "Leaving…" : "Leave"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="flex h-dvh flex-col overflow-x-hidden">
            {header}
            <main className={mainClassName}>{children}</main>
            <footer className="bg-footer-bar py-[clamp(1.5rem,1vh,1rem)]">
              <div className="max-w-7xl mx-auto px-6" />
            </footer>
          </div>
        </PreferencesContext.Provider>
      </AppShellLayoutContext.Provider>
  )
}
