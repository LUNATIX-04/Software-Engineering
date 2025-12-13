"use client"

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import {
  Bell,
  ChevronDown,
  Check,
  Loader2,
  LogIn,
  Search,
  User as UserIcon,
  X,
} from "lucide-react"
import type { AuthChangeEvent, Session, RealtimeChannel } from "@supabase/supabase-js"

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
import { NotificationHistoryPanel } from "@/components/notifications/NotificationHistoryPanel"
import { PreferencesContext } from "@/contexts/preferences"
import type { DepartmentLayoutOption, ProfileSummary, ThemeOption } from "@/types/preferences"

import { cn } from "@/lib/utils"
import { getSupabaseBrowserClient } from "@/utils/supabase/client"
import type { TaskRecord } from "@/app/projects/[projectId]/task/data"
import {
  changeProjectUsername,
  deleteProject,
  fetchProjectById,
  fetchProjectMembers,
  fetchProjectMembership,
  leaveProject,
  markProjectUsage,
  updateProjectOwners,
  type ProjectMemberDetail,
  type ProjectMembershipSummary,
} from "@/utils/projects/api"
import { refreshProjectCache } from "@/utils/projects/prefetch"
import { NAVIGATION_ABORT_EVENT, PROJECT_REFRESH_EVENT } from "@/constants/events"
import { PROJECT_ROLE } from "@/types/projects"
import { useProjectInvites } from "./hooks/useProjectInvites"

import { AccountDropdown } from "./AppShell/AccountDropdown"
import { ProjectActionsMenu } from "./AppShell/ProjectActionsMenu"
import { ProjectInviteDialog } from "./AppShell/ProjectInviteDialog"
import type { SignOutRedirect } from "./AppShell/types"
import { ProjectOwnerDialog } from "./AppShell/ProjectOwnerDialog"
import { ProjectDeleteDialog } from "./AppShell/ProjectDeleteDialog"
import { ProjectLeaveDialog } from "./AppShell/ProjectLeaveDialog"

import { isRemovalError } from "@/utils/projects/removal"

const DEPARTMENT_LAYOUTS: DepartmentLayoutOption[] = ["compact", "fullWidth"]
const THEME_OPTIONS: ThemeOption[] = [
  "standard",
  "blue",
  "dark",
  "red",
  "green",
  "yellow",
]
const THEME_STORAGE_KEY = "asap:theme-preference"
const DEPARTMENT_LAYOUT_STORAGE_KEY = "asap:department-layout"
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

type TaskNotificationContext = {
  projectId: string
  membershipId: string
  task: TaskRecord
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
  const dispatchNavigationAbort = useCallback(() => {
    if (typeof window === "undefined") {
      return
    }
    window.dispatchEvent(new Event(NAVIGATION_ABORT_EVENT))
  }, [])
  const pushWithAbort = useCallback(
    (href: string) => {
      dispatchNavigationAbort()
      router.push(href)
    },
    [dispatchNavigationAbort, router]
  )
  const replaceWithAbort = useCallback(
    (href: string) => {
      dispatchNavigationAbort()
      router.replace(href)
    },
    [dispatchNavigationAbort, router]
  )
  const isHomepage = pathname === "/homepage"
  const isProjects = pathname?.startsWith("/projects") ?? false
  const isTraditionalAuth = pathname === "/auth/traditional"
  const segments = pathname?.split("/").filter(Boolean) ?? []
  const isProjectRoute = segments[0]?.toLowerCase() === "projects"
  const projectSlug = isProjectRoute ? segments[1] ?? null : null
  const normalizedProjectSlug = projectSlug?.toLowerCase()
  const isProjectDetailPage = Boolean(normalizedProjectSlug) && normalizedProjectSlug !== "create"
  const activeProjectId = isProjectDetailPage && projectSlug ? projectSlug : null
  const currentProjectSection = isProjectDetailPage ? (segments[2]?.toLowerCase() ?? "info") : null
  const hasProjectTabs = Boolean(activeProjectId)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false)
  const historyToggleRef = useRef<HTMLButtonElement | null>(null)
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
  const { notify, history } = useNotifications()
  const notificationStateRef = useRef<{
    busyTaskIds: Set<string>
    submissionMarkers: Map<string, string>
    feedbackMarkers: Map<string, string>
    statusMarkers: Map<string, string>
  }>({
    busyTaskIds: new Set(),
    submissionMarkers: new Map(),
    feedbackMarkers: new Map(),
    statusMarkers: new Map(),
  })
  const redirectToProjects = useCallback(() => {
    notify({
      title: "Removed",
      description: "You are no longer part of this project.",
      variant: "destructive",
    })
    replaceWithAbort("/projects")
  }, [notify, replaceWithAbort])
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
  const [clientTimezone, setClientTimezone] = useState<string | null>(null)
  const viewerRole = projectMembership?.role ?? null
  const viewerDepartmentId = projectMembership?.departmentId ?? null
  const isHeaderViewer = viewerRole === PROJECT_ROLE.HEADER
  const inviteManager = useProjectInvites({
    activeProjectId,
    viewerDepartmentId,
    isHeaderViewer,
    notify,
  })

  const notifyTaskBackInProgress = useCallback(
    async (projectId: string, taskId: string) => {
      const membershipId = projectMembership?.id
      if (!membershipId) {
        return
      }
      try {
        const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
          cache: "no-store",
        })
        if (!response.ok) {
          return
        }
        const task = (await response.json().catch(() => null)) as TaskRecord
        if (!task || !task.assignees.some((assignee) => assignee.id === membershipId)) {
          return
        }
        const projectName = task.project?.title ?? "this project"
        const taskLabelWithProject = `"${formatLabel(task.title ?? "this task")}" in "${formatLabel(projectName)}"`
        notify({
          title: "Task is in progress",
          description: `on ${taskLabelWithProject}\nThe owner moved this task back to In Progress.`,
          variant: "info",
          href: `/projects/${projectId}/task/${taskId}`,
        })
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to load task for notification", error)
        }
      }
    },
    [notify, projectMembership?.id]
  )

  const formatLabel = useCallback((value: string | null | undefined, limit = 40) => {
    if (!value) {
      return ""
    }
    const trimmed = value.trim()
    if (trimmed.length <= limit) {
      return trimmed
    }
    return `${trimmed.slice(0, limit - 3)}...`
  }, [])

  const handleTaskNotification = useCallback(
    ({ membershipId, projectId, task }: TaskNotificationContext) => {
      const submission = task.submission
      if (!submission) {
        return
      }
      const state = notificationStateRef.current
      const submissionMarker = submission.updatedAt ?? submission.createdAt ?? ""
      const isOwner = membershipId === task.createdBy.id
      const isAssignee = membershipId === submission.submittedBy.id
      const projectName = task.project?.title ?? "this project"
      const taskLabel = task.title ?? "this task"
      const taskLabelWithProject = `"${formatLabel(taskLabel)}" in "${formatLabel(projectName)}"`

      if (isOwner && submission.status === "SUBMITTED" && !submission.acknowledgedAt) {
        const previous = state.submissionMarkers.get(submission.id)
        if (previous !== submissionMarker) {
          state.submissionMarkers.set(submission.id, submissionMarker)
          notify({
            title: "Submission awaiting review",
            description: `on ${taskLabelWithProject}\nAssignee submitted and awaits your acknowledgement.`,
            variant: "info",
            href: `/projects/${projectId}/task/${task.id}`,
          })
        }
      } else {
        state.submissionMarkers.delete(submission.id)
      }

      const feedbackComment = submission.reviewerComment?.trim()
      const hasFeedback = Boolean(feedbackComment) && !submission.ownerAcknowledgedAt
      if (isAssignee && hasFeedback) {
        const previousFeedback = state.feedbackMarkers.get(submission.id)
        if (previousFeedback !== submissionMarker) {
          state.feedbackMarkers.set(submission.id, submissionMarker)
          notify({
            title: "New feedback",
            description: feedbackComment
              ? `on ${taskLabelWithProject}\n${formatLabel(feedbackComment, 80)}`
              : `on ${taskLabelWithProject}\nNew feedback is ready.`,
            variant: "info",
            href: `/projects/${projectId}/task/${task.id}`,
          })
        }
      } else {
        state.feedbackMarkers.delete(submission.id)
      }

      const notifyableStatuses = new Set(["BLOCKED", "SUBMITTED", "IN_PROGRESS"])
      if (isAssignee && notifyableStatuses.has(task.status)) {
        const previousStatus = state.statusMarkers.get(task.id)
        if (previousStatus !== task.status) {
          state.statusMarkers.set(task.id, task.status)
          const statusTitle =
            task.status === "BLOCKED"
              ? "Submission blocked"
              : task.status === "SUBMITTED"
                ? "Submission submitted"
                : task.status === "IN_PROGRESS"
                  ? "Task is in progress"
                  : null
          const statusDescription =
            task.status === "BLOCKED"
              ? `on ${taskLabelWithProject}\nThe owner has blocked your submission. You can view it but not edit.`
              : task.status === "SUBMITTED"
                ? `on ${taskLabelWithProject}\nThe owner marked your submission as submitted. The task is read-only.`
                : task.status === "IN_PROGRESS"
                  ? `on ${taskLabelWithProject}\nThe owner moved this back to In Progress.`
                  : null
          if (statusTitle && statusDescription) {
            notify({
              title: statusTitle,
              description: statusDescription,
              variant: task.status === "BLOCKED" ? "destructive" : "success",
              href: `/projects/${projectId}/task/${task.id}`,
            })
          }
        }
      } else if (!isAssignee) {
        state.statusMarkers.delete(task.id)
      }
    },
    [notify]
  )

  useEffect(() => {
    if (!activeProjectId) {
      return
    }
    refreshProjectCache(activeProjectId).catch((error) => {
      console.error("Failed to refresh project cache on navigation", error)
    })
  }, [activeProjectId, currentProjectSection])
  const [ownerDialogOpen, setOwnerDialogOpen] = useState(false)
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

  useEffect(() => {
    if (historyDrawerOpen) {
      setHistoryDrawerOpen(false)
    }
  }, [pathname])

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
    body?.removeAttribute("data-theme-init")
  }, [])

  const loadStoredDepartmentLayout = useCallback((): DepartmentLayoutOption | null => {
    if (typeof window === "undefined") {
      return null
    }
    try {
      const stored = window.localStorage.getItem(DEPARTMENT_LAYOUT_STORAGE_KEY)
      return stored ? ensureDepartmentLayout(stored) : null
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Failed to read stored department layout", error)
      }
      return null
    }
  }, [])

  const persistDepartmentLayout = useCallback((layout: DepartmentLayoutOption) => {
    if (typeof window === "undefined") {
      return
    }
    try {
      window.localStorage.setItem(DEPARTMENT_LAYOUT_STORAGE_KEY, layout)
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Failed to persist department layout", error)
      }
    }
  }, [])

  const loadStoredTheme = useCallback((): ThemeOption | null => {
    if (typeof window === "undefined") {
      return null
    }
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
      return stored ? ensureTheme(stored) : null
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Failed to read stored theme", error)
      }
      return null
    }
  }, [])

  const persistTheme = useCallback((theme: ThemeOption) => {
    if (typeof window === "undefined") {
      return
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Failed to persist theme preference", error)
      }
    }
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
      persistTheme(normalizedTheme)
      persistDepartmentLayout(normalizedDepartment)
      return {
        ...prev,
        ...update,
        theme: normalizedTheme,
        departmentLayout: normalizedDepartment,
      }
    })
  }, [persistDepartmentLayout, persistTheme])

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
          "id, email, full_name, avatar_url, bio, last_sign_in, password_hash"
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
          departmentLayout: ensureDepartmentLayout(loadStoredDepartmentLayout()),
          theme: ensureTheme(loadStoredTheme()),
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
          departmentLayout: ensureDepartmentLayout(loadStoredDepartmentLayout()),
          theme: ensureTheme(loadStoredTheme()),
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
    if (typeof Intl === "undefined") {
      return
    }
    setClientTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone ?? null)
  }, [])

  useEffect(() => {
    if (authLoading) {
      return
    }
    refreshProfile()
  }, [authLoading, refreshProfile])

  useEffect(() => {
    if (!authenticatedUser?.id) {
      return
    }
    const loadPendingNotifications = async () => {
      try {
        const response = await fetch("/api/tasks/notification-contexts", {
          cache: "no-store",
        })
        if (!response.ok) {
          throw new Error(`Failed to load task notifications (${response.status})`)
        }
        const contexts = (await response.json()) as TaskNotificationContext[]
        contexts.forEach(handleTaskNotification)
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to load pending task notifications", error)
        }
      }
    }
    void loadPendingNotifications()

    let active = true
    let channel: RealtimeChannel | null = null

    const subscribe = () => {
      const nextChannel = supabase
        .channel("project-task-submission-notifications")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "project_task_submissions",
          },
          (payload: { new?: Record<string, unknown> | null; old?: Record<string, unknown> | null }) => {
            const taskId = (payload.new?.task_id ?? payload.old?.task_id) as string | undefined
            if (!taskId) {
              return
            }
            if (notificationStateRef.current.busyTaskIds.has(taskId)) {
              return
            }
            notificationStateRef.current.busyTaskIds.add(taskId)
            const loadContext = async () => {
              try {
                const response = await fetch(`/api/tasks/${taskId}/notification-context`, {
                  cache: "no-store",
                })
                if (!response.ok) {
                  throw new Error(`Failed to load task ${taskId} (${response.status})`)
                }
                const context = (await response.json()) as TaskNotificationContext
                handleTaskNotification(context)
              } catch (error) {
                if (process.env.NODE_ENV !== "production") {
                  console.error("Failed to load task notification context", error)
                }
              } finally {
                notificationStateRef.current.busyTaskIds.delete(taskId)
              }
            }
            void loadContext()
          }
        )

      nextChannel.subscribe((status) => {
        if (!active) return
        if (status === "SUBSCRIBED") {
          channel = nextChannel
          return
        }
        if (["CHANNEL_ERROR", "CLOSED", "TIMED_OUT"].includes(status)) {
          void supabase.removeChannel(nextChannel).finally(() => {
            if (active) {
              setTimeout(() => {
                if (active) {
                  subscribe()
                }
              }, 300)
            }
          })
        }
      })
    }

    subscribe()

    return () => {
      active = false
      if (channel) {
        void supabase.removeChannel(channel)
      }
    }
  }, [authenticatedUser?.id, supabase, handleTaskNotification])

  useEffect(() => {
    if (!authenticatedUser?.id) {
      return
    }
    let active = true
    let statusChannel: RealtimeChannel | null = null

    const subscribe = () => {
      const nextChannel = supabase
        .channel("project-task-status-notifications")
        .on(
          "postgres_changes",
          {
            event: "update",
            schema: "public",
            table: "project_tasks",
          },
          (payload: { new?: Record<string, unknown> | null; old?: Record<string, unknown> | null }) => {
            const newStatus = payload.new?.status as string | undefined
            const oldStatus = payload.old?.status as string | undefined
            if (newStatus !== "IN_PROGRESS") {
              return
            }
            if (!["BLOCKED", "SUBMITTED"].includes(oldStatus ?? "")) {
              return
            }
            const projectId = (payload.new?.project_id ?? payload.old?.project_id) as string | undefined
            const taskId = (payload.new?.id ?? payload.old?.id) as string | undefined
            if (!projectId || !taskId) {
              return
            }
            void notifyTaskBackInProgress(projectId, taskId)
          }
        )

      nextChannel.subscribe((status) => {
        if (!active) return
        if (status === "SUBSCRIBED") {
          statusChannel = nextChannel
          return
        }
        if (["CHANNEL_ERROR", "CLOSED", "TIMED_OUT"].includes(status)) {
          void supabase.removeChannel(nextChannel).finally(() => {
            if (active) {
              setTimeout(() => {
                if (active) {
                  subscribe()
                }
              }, 300)
            }
          })
        }
      })
    }

    subscribe()

    return () => {
      active = false
      if (statusChannel) {
        void supabase.removeChannel(statusChannel)
      }
    }
  }, [authenticatedUser?.id, supabase, notifyTaskBackInProgress])

  useLayoutEffect(() => {
    const storedTheme = loadStoredTheme()
    if (storedTheme) {
      applyTheme(storedTheme)
    }
  }, [applyTheme, loadStoredTheme])

  useEffect(() => {
    const storedTheme = loadStoredTheme()
    const nextTheme = ensureTheme(profile?.theme ?? storedTheme ?? "standard")
    applyTheme(nextTheme)
    persistTheme(nextTheme)
  }, [applyTheme, loadStoredTheme, persistTheme, profile?.theme])

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
      pushWithAbort("/homepage")
      notify({
        title: "Signed out successfully",
        description: "See you soon on ASAP!",
        variant: "info",
      })
    },
    [notify, pushWithAbort, supabase]
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
      pushWithAbort("/projects")
    } catch (error) {
      console.error("Failed to delete project", error)
      const raw =
        error instanceof Error ? error.message : "Unable to delete this project right now."
      setDeleteProjectError(raw)
      notify({
        title: "Delete failed",
        description: raw,
        variant: "destructive",
      })
    } finally {
      setDeleteProjectLoading(false)
    }
  }, [deleteProjectTargetId, handleDeleteDialogOpenChange, notify, pushWithAbort])

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
      pushWithAbort("/projects")
    } catch (error) {
      console.error("Failed to leave project", error)
      const raw = error instanceof Error ? error.message : "Unable to leave this project."
      setLeaveError(raw)
      notify({
        title: "Leave project failed",
        description: raw,
        variant: "destructive",
      })
    } finally {
      setLeaveLoading(false)
    }
  }, [activeProjectId, notify, pushWithAbort])

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

  const refreshActiveProject = useCallback(() => {
    if (activeProjectId) {
      refreshProjectCache(activeProjectId).catch((error) => {
        console.error("Failed to refresh project cache", error)
      })
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(PROJECT_REFRESH_EVENT, {
          detail: { projectId: activeProjectId ?? null },
        })
      )
    }
    router.refresh()
  }, [activeProjectId, router])

  const handleProjectNavClick = useCallback(
    (href: string | null, disabled?: boolean) => {
      if (disabled || !href) {
        return
      }
      if (pathname === href) {
        refreshActiveProject()
        return
      }
      pushWithAbort(href)
    },
    [pathname, pushWithAbort, refreshActiveProject]
  )
  const triggerProjectRefresh = useCallback(() => {
    refreshActiveProject()
  }, [refreshActiveProject])

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

  useEffect(() => {
    if (historyDrawerOpen && headerVariant !== "projects") {
      setHistoryDrawerOpen(false)
    }
  }, [headerVariant, historyDrawerOpen])

  const logoDestination = headerVariant === "minimal" ? "/homepage" : "/projects"

  const handleLogoClick = useCallback(() => {
    const isActiveLogoTarget = pathname === logoDestination
    if (isActiveLogoTarget) {
      refreshActiveProject()
      return
    }
    pushWithAbort(logoDestination)
  }, [logoDestination, pathname, pushWithAbort, refreshActiveProject])

  const header = (() => {
    if (headerVariant === "homepage") {
      return (
        <header
          className="fixed inset-x-0 top-0 z-50 px-[clamp(1.5rem,1vw,3rem)] py-[clamp(0.6rem,1vh,1rem)]"
          style={{ backgroundColor: "var(--app-shell-bg, var(--primary))" }}
        >
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
                <AccountDropdown
                  accountMenuOpen={accountMenuOpen}
                  authenticatedUser={authenticatedUser}
                  avatar={avatar}
                  handleSignOut={handleSignOut}
                  setAccountMenuOpen={setAccountMenuOpen}
                  setSettingsDialogOpen={setSettingsDialogOpen}
                  signOutRedirect="google"
                />
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  className="nav-auth-button flex size-9 items-center justify-center rounded-full border border-primary/20 bg-white text-primary shadow-sm transition hover:border-primary hover:text-primary focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
                  onClick={() => pushWithAbort("/auth/traditional")}
                  disabled={authLoading}
                >
                  {authLoading ? (
                    <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                  ) : (
                    <LogIn className="size-5" aria-hidden="true" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </header>
      )
    }

    if (headerVariant === "projects") {
      const tabCount = projectNavItems.length || 1
      const activeIndex = Math.max(
        projectNavItems.findIndex((item) => item.key === currentProjectSection),
        0
      )

      const projectNavContent = hasProjectTabs ? (
        <nav className="relative flex max-w-4xl flex-1 items-center gap-2 overflow-hidden px-2">
          <div
            className="absolute bottom-1 left-2 h-1 rounded-full bg-underline-foreground-for-nav transition-all duration-300 ease-out"
            style={{
              width: `${100 / tabCount}%`,
              transform: `translateX(${activeIndex * 100}%)`,
            }}
          />
          <div className="relative flex w-full items-center gap-2">
            {projectNavItems.map((item) => {
              const isActive = currentProjectSection === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleProjectNavClick(item.href ?? null, item.disabled)}
                  aria-current={isActive ? "page" : undefined}
                  disabled={item.disabled}
                  data-cy={`project-nav-${item.key}`}
                  className={cn(
                    "relative flex min-w-[5.5rem] flex-1 items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-button-foreground-on-nav transition-[color,transform] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50",
                    isActive ? "text-foreground-for-nav" : "hover:text-hover-foreground-for-nav"
                  )}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </nav>
      ) : null

      return (
        <header
          className="fixed inset-x-0 top-0 z-50"
          style={{ backgroundColor: "var(--app-shell-bg, var(--primary))" }}
        >
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
                    <button
                      ref={historyToggleRef}
                      type="button"
                      onClick={() => setHistoryDrawerOpen((prev) => !prev)}
                      aria-label="Toggle notification history"
                      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    >
                      <Bell className="size-5" />
                      {history.length > 0 ? (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white">
                          {history.length > 9 ? "9+" : history.length}
                        </span>
                      ) : null}
                    </button>
                    <ProjectActionsMenu
                      activeProjectId={activeProjectId}
                      projectActionsOpen={projectActionsOpen}
                      projectMembership={projectMembership}
                      promptProjectDelete={promptProjectDelete}
                      onRefresh={triggerProjectRefresh}
                      router={router}
                      setLeaveDialogOpen={setLeaveDialogOpen}
                      setOwnerDialogOpen={setOwnerDialogOpen}
                      setPendingUsername={setPendingUsername}
                      setProjectActionsOpen={setProjectActionsOpen}
                      setUsernameDialogOpen={setUsernameDialogOpen}
                      openInviteDialog={inviteManager.openInviteDialog}
                    />
                    {authenticatedUser ? (
                      <AccountDropdown
                        accountMenuOpen={accountMenuOpen}
                        authenticatedUser={authenticatedUser}
                        avatar={avatar}
                        handleSignOut={handleSignOut}
                        setAccountMenuOpen={setAccountMenuOpen}
                        setSettingsDialogOpen={setSettingsDialogOpen}
                        signOutRedirect="homepage"
                      />
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        className="nav-auth-button flex size-9 items-center justify-center rounded-full border border-primary/20 bg-white text-primary shadow-sm transition hover:border-primary hover:text-primary focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
                        onClick={() => pushWithAbort("/auth/traditional")}
                        disabled={authLoading}
                      >
                        {authLoading ? (
                          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                        ) : (
                          <LogIn className="size-5" aria-hidden="true" />
                        )}
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
        <header
          className="fixed inset-x-0 top-0 z-50"
          style={{ backgroundColor: "var(--app-shell-bg, var(--primary))" }}
        >
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

  const resolvedTimezone = useMemo(() => {
    const metadata = (authenticatedUser?.user_metadata ?? {}) as Record<string, unknown>
    const candidates = [
      metadata.timezone,
      metadata.time_zone,
      metadata.timeZone,
      metadata.tz,
      metadata.preferred_timezone,
      metadata.preferredTimeZone,
    ]
    for (const candidate of candidates) {
      if (typeof candidate !== "string") {
        continue
      }
      const trimmed = candidate.trim()
      if (!trimmed) {
        continue
      }
      if (typeof Intl === "undefined") {
        return trimmed
      }
      try {
        new Intl.DateTimeFormat("en-GB", { timeZone: trimmed })
        return trimmed
      } catch {
        continue
      }
    }
    return clientTimezone
  }, [authenticatedUser?.user_metadata, clientTimezone])

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
          timezone: resolvedTimezone,
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
          <ProjectInviteDialog
            manager={inviteManager}
            viewerRole={viewerRole}
            viewerDepartmentId={viewerDepartmentId}
            isHeaderViewer={isHeaderViewer}
          />
          <ProjectOwnerDialog
            open={ownerDialogOpen}
            onOpenChange={setOwnerDialogOpen}
            departmentLayout={profile?.departmentLayout ?? "fullWidth"}
            ownerError={ownerError}
            ownerCandidates={ownerCandidates}
            ownerSelection={ownerSelection}
            selectedOwners={selectedOwners}
            filteredOwnerCandidates={filteredOwnerCandidates}
            filteredSelectedOwners={filteredSelectedOwners}
            ownerSearch={ownerSearch}
            selectedOwnersSearch={selectedOwnersSearch}
            ownersLoading={ownersLoading}
            ownersSaving={ownersSaving}
            toggleOwnerSelection={toggleOwnerSelection}
            handleSaveOwners={handleSaveOwners}
            setOwnerSearch={setOwnerSearch}
            setSelectedOwnersSearch={setSelectedOwnersSearch}
          />
          <ProjectDeleteDialog
            open={deleteProjectDialogOpen}
            onOpenChange={handleDeleteDialogOpenChange}
            title={deleteProjectTitle}
            titleLoading={deleteProjectTitleLoading}
            targetId={deleteProjectTargetId}
            loading={deleteProjectLoading}
            error={deleteProjectError}
            onConfirm={handleConfirmProjectDelete}
          />
          <ProjectLeaveDialog
            open={leaveDialogOpen}
            onOpenChange={setLeaveDialogOpen}
            title={leaveProjectTitle}
            titleLoading={leaveProjectTitleLoading}
            loading={leaveLoading}
            error={leaveError}
            onConfirm={handleLeaveProject}
          />
          <NotificationHistoryPanel
            open={historyDrawerOpen}
            onClose={() => setHistoryDrawerOpen(false)}
            triggerRef={historyToggleRef}
          />
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
