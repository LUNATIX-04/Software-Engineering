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
import { User as UserIcon } from "lucide-react"
import type { AuthChangeEvent, Session } from "@supabase/supabase-js"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SettingsForm } from "@/components/settings/SettingsForm"
import {
  NotificationProvider,
  useNotifications,
} from "@/components/notifications/NotificationCenter"

import { cn } from "@/lib/utils"
import { getSupabaseBrowserClient } from "@/utils/supabase/client"
import { DropdownMenuLabel } from "@radix-ui/react-dropdown-menu"

const DEPARTMENT_LAYOUTS = ["compact", "fullWidth"] as const
export type DepartmentLayoutOption = (typeof DEPARTMENT_LAYOUTS)[number]

const THEME_OPTIONS = ["standard", "light", "dark", "red", "blue"] as const
export type ThemeOption = (typeof THEME_OPTIONS)[number]

const THEME_LABELS: Record<ThemeOption, string> = {
  standard: "Standard",
  light: "Light",
  dark: "Dark",
  red: "Red",
  blue: "Blue",
}

const THEME_SWATCHES: Record<ThemeOption, string[]> = {
  standard: ["#907ad6", "#4f518c", "#f4effa"],
  light: ["#2563eb", "#a5b4fc", "#fdfbff"],
  dark: ["#111827", "#6366f1", "#0ea5e9"],
  red: ["#e11d48", "#fecdd3", "#fff5f5"],
  blue: ["#1d4ed8", "#38bdf8", "#e6f4ff"],
}

const DEPARTMENT_LABELS: Record<DepartmentLayoutOption, string> = {
  compact: "Compact chips",
  fullWidth: "Full-width chips",
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

type ProfileSummary = {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  lastSignIn: string | null
  departmentLayout: DepartmentLayoutOption
  theme: ThemeOption
}

type PreferencesContextValue = {
  profile: ProfileSummary | null
  loading: boolean
  refreshProfile: () => Promise<void>
  updateProfileLocally: (update: Partial<ProfileSummary>) => void
}

const PreferencesContext = createContext<PreferencesContextValue>({
  profile: null,
  loading: false,
  refreshProfile: async () => {},
  updateProfileLocally: () => {},
})

type HeaderVariant = "homepage" | "projects" | "minimal" | "none"

type AppShellLayoutContextValue = {
  setHeaderVariant: (variant: HeaderVariant | null) => void
}

const AppShellLayoutContext = createContext<AppShellLayoutContextValue>({
  setHeaderVariant: () => {},
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

export function usePreferences() {
  return useContext(PreferencesContext)
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
  const isHomepage = pathname === "/Homepage"
  const isProjects = pathname?.startsWith("/Projects") ?? false
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState<ProfileSummary | null>(null)
  const [preferencesLoading, setPreferencesLoading] = useState(false)
  const [manageDialogOpen, setManageDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [headerOverride, setHeaderOverride] = useState<HeaderVariant | null>(null)
  const lastAuthUserIdRef = useRef<string | null>(null)
  const signInToastTokensRef = useRef<Record<string, string>>({})
  const { notify } = useNotifications()
  const authenticatedUser = session?.user ?? null

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
          "id, email, full_name, avatar_url, last_sign_in, department_layout, theme"
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
          lastSignIn: data.last_sign_in ?? null,
          departmentLayout: ensureDepartmentLayout(data.department_layout),
          theme: ensureTheme(data.theme),
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
          lastSignIn: authenticatedUser.last_sign_in_at ?? null,
          departmentLayout: "fullWidth",
          theme: "standard",
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
      setManageDialogOpen(false)
      setSettingsDialogOpen(false)
    }
  }, [authenticatedUser])

  const lastSignInDisplay = useMemo(() => {
    if (!profile?.lastSignIn) {
      return "Not available"
    }
    const parsed = new Date(profile.lastSignIn)
    if (Number.isNaN(parsed.getTime())) {
      return "Not available"
    }
    try {
      return parsed.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    } catch {
      return parsed.toISOString()
    }
  }, [profile?.lastSignIn])

  const themeLabel = THEME_LABELS[profile?.theme ?? "standard"]
  const themePreviewSwatches = THEME_SWATCHES[profile?.theme ?? "standard"]
  const departmentLabel =
    (profile && DEPARTMENT_LABELS[profile.departmentLayout]) || DEPARTMENT_LABELS.fullWidth
  const handleGoogleSignIn = useCallback(async () => {
    setAuthLoading(true)
    const {
      data: { url },
      error,
    } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: "select_account",
        },
      },
    })

    if (error) {
      console.error("Failed to sign in with Google", error)
      setAuthLoading(false)
      return
    }

    if (url) {
      window.location.assign(url)
    }
  }, [supabase])

  const handleSignOut = useCallback(
    async (options?: { redirect?: SignOutRedirect }) => {
      setAuthLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error("Failed to sign out", error)
        setAuthLoading(false)
        return
      }
      setAccountMenuOpen(false)
      setAuthLoading(false)
      router.push("/Homepage")
      notify({
        title: "Signed out successfully",
        description: "See you soon on ASAP!",
        variant: "info",
      })
    },
    [notify, router, supabase]
  )

  const handleLogoClick = useCallback(() => {
    if (isHomepage) {
      return
    }
    router.push("/Homepage")
  }, [isHomepage, router])

  const avatarUrl =
    (authenticatedUser?.user_metadata?.avatar_url as string | undefined) ?? undefined

  const avatar = authenticatedUser ? (
    avatarUrl ? (
      <Image
        src={avatarUrl}
        alt="User avatar"
        width={36}
        height={36}
        className="size-full rounded-full object-cover"
        priority
      />
    ) : (
      <div className="flex size-full items-center justify-center rounded-full bg-button-background-on-nav text-button-foreground-on-nav text-sm font-semibold">
        {authenticatedUser.email?.[0]?.toUpperCase() ?? "U"}
      </div>
    )
  ) : (
    <UserIcon className="size-7 text-button-foreground-on-nav" />
  )

  const segments = pathname?.split("/").filter(Boolean) ?? []
  const isProjectRoute = segments[0]?.toLowerCase() === "projects"
  const projectSlug = isProjectRoute ? segments[1] ?? null : null
  const normalizedProjectSlug = projectSlug?.toLowerCase()
  const isProjectDetailPage = Boolean(normalizedProjectSlug) && normalizedProjectSlug !== "create"
  const isProjectEditPage = isProjectDetailPage && segments[2]?.toLowerCase() === "edit"
  const activeProjectId = isProjectDetailPage && projectSlug ? projectSlug : null
  const currentProjectSection = isProjectDetailPage
    ? (segments[2]?.toLowerCase() ?? "info")
    : null
  const hasProjectTabs = Boolean(activeProjectId) && !isProjectEditPage

  const projectNavItems = useMemo(
    () => [
      {
        key: "info" as const,
        label: "Info.",
        href: activeProjectId ? `/Projects/${activeProjectId}` : "/Projects",
        disabled: !activeProjectId,
      },
      {
        key: "member" as const,
        label: "Member",
        href: activeProjectId ? `/Projects/${activeProjectId}/member` : "",
        disabled: !activeProjectId,
      },
      {
        key: "department" as const,
        label: "Department",
        href: activeProjectId ? `/Projects/${activeProjectId}/department` : "",
        disabled: !activeProjectId,
      },
      {
        key: "task" as const,
        label: "Task",
        href: activeProjectId ? `/Projects/${activeProjectId}/task` : "",
        disabled: !activeProjectId,
      },
      {
        key: "calendar" as const,
        label: "Calendar",
        href: activeProjectId ? `/Projects/${activeProjectId}/calendar` : "",
        disabled: !activeProjectId,
      },
      {
        key: "profile" as const,
        label: "Profile",
        href: activeProjectId ? `/Projects/${activeProjectId}/profile` : "/account",
        disabled: false,
      },
      {
        key: "more" as const,
        label: "...",
        href: "",
        disabled: true,
      },
    ],
    [activeProjectId]
  )

  const setHeaderVariant = useCallback((variant: HeaderVariant | null) => {
    setHeaderOverride(variant)
  }, [])

  const defaultHeaderVariant: HeaderVariant = isHomepage
    ? "homepage"
    : isProjects
      ? "projects"
      : "none"
  const headerVariant = headerOverride ?? defaultHeaderVariant

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
          className="bg-button-background-on-nav text-button-foreground-on-nav border-none rounded-2xl p-2"
        >
          <DropdownMenuLabel className="text-button-foreground-on-nav rounded-xl py-3 px-4 cursor-text text-base">
            {authenticatedUser.email ?? "My Account"}
          </DropdownMenuLabel>
          <DropdownMenuItem
            className="text-button-foreground-on-nav hover:bg-button-hover-background-on-nav rounded-xl py-3 px-4 cursor-pointer text-base"
            onSelect={() => {
              setAccountMenuOpen(false)
              setManageDialogOpen(true)
            }}
          >
            Manage my Account
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-button-foreground-on-nav hover:bg-button-hover-background-on-nav rounded-xl py-3 px-4 cursor-pointer text-base"
            onSelect={() => {
              setAccountMenuOpen(false)
              setSettingsDialogOpen(true)
            }}
          >
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-button-foreground-on-nav hover:bg-button-hover-background-on-nav rounded-xl py-3 px-4 cursor-pointer text-base"
            onSelect={() => handleSignOut({ redirect })}
          >
            Log out
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
                aria-label={isHomepage ? "ASAP" : "Go to homepage"}
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
                  className="bg-button-background-on-nav text-button-foreground-on-nav hover:bg-button-hover-background-on-nav rounded-full px-[clamp(2.5rem,5vw,4rem)] py-[clamp(0.5rem,1.6vh,0.85rem)] text-[clamp(1rem,2.1vw,1.15rem)] font-semibold"
                  onClick={handleGoogleSignIn}
                  disabled={authLoading}
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
      return (
        <header className="fixed inset-x-0 top-0 z-50 bg-primary">
          <div className="px-[clamp(1.5rem,1vw,3rem)] py-[clamp(0.6rem,1vh,1rem)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={handleLogoClick}
                  disabled={isHomepage}
                  className={cn(
                    "rounded-full bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-button-foreground-on-nav/40",
                    isHomepage ? "cursor-default" : "cursor-pointer"
                  )}
                  aria-label={isHomepage ? "ASAP" : "Go to homepage"}
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
                <button
                  type="button"
                  onClick={() => router.push("/Projects")}
                  className="rounded-full bg-primary/30 px-6 py-1 text-lg font-semibold text-primary-foreground transition hover:bg-primary/40 hover:text-hover-foreground-for-nav-header focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/40"
                >
                  Projects
                </button>
              </div>
              <div className="flex items-center gap-2 ">
                {authenticatedUser ? (
                  renderAccountDropdown("homepage")
                ) : (
                  <Button
                    variant="secondary"
                    className="rounded-full bg-button-background-on-nav px-6 py-2 text-base font-semibold text-button-foreground-on-nav hover:bg-button-hover-background-on-nav"
                    onClick={handleGoogleSignIn}
                    disabled={authLoading}
                  >
                    {authLoading ? "Loading..." : "Sign In"}
                  </Button>
                )}
              </div>
            </div>
          </div>
          {hasProjectTabs ? (
            <nav className="flex justify-center bg-primary-soft">
              <div className="flex w-full max-w-4xl items-center gap-2 overflow-x-auto px-4 py-2">
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
              </div>
            </nav>
          ) : null}
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

  const headerRequiresTabSpacing = headerVariant === "projects" && hasProjectTabs

  const mainClassName = cn(
    "flex-1 bg-background",
    headerRequiresTabSpacing
      ? "pt-[clamp(7rem,18vh,10rem)]"
      : headerVariant !== "none"
        ? "pt-[clamp(4.5rem,12vh,6rem)]"
        : null,
    headerVariant === "homepage" && "flex items-center justify-center"
  )

  const layoutContextValue = useMemo(
    () => ({
      setHeaderVariant,
    }),
    [setHeaderVariant]
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
          <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Manage Account</DialogTitle>
                <DialogDescription>
                  Review your account information and current personalization choices.
                </DialogDescription>
              </DialogHeader>
              {preferencesLoading && !profile ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Loading your account…
                </div>
              ) : profile ? (
                <div className="space-y-6">
                  <div className="grid gap-4 text-sm text-foreground">
                    <div className="grid gap-1">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        Email
                      </span>
                      <span className="font-semibold">{profile.email}</span>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        Full name
                      </span>
                      <span className="font-semibold">{profile.fullName || "Not provided"}</span>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        Last sign-in
                      </span>
                      <span className="font-semibold">{lastSignInDisplay}</span>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        Department layout
                      </span>
                      <span className="font-semibold">{departmentLabel}</span>
                    </div>
                    <div className="grid gap-2">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        Theme
                      </span>
                      <span className="font-semibold">{themeLabel}</span>
                      <div className="flex gap-2">
                        {themePreviewSwatches.map((color) => (
                          <span
                            key={color}
                            className="h-8 w-8 rounded-full border border-border"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Please sign in to manage your account.
                </div>
              )}
            </DialogContent>
          </Dialog>
          <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
                <DialogDescription>
                  Personalize how project chips and colors appear across the app.
                </DialogDescription>
              </DialogHeader>
              <SettingsForm layout="dialog" />
            </DialogContent>
          </Dialog>
          <div className="min-h-dvh flex flex-col overflow-x-hidden">
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
