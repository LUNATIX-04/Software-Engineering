"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"

import { useNotifications } from "@/components/notifications/Notification"
import { useAppShellLayout } from "@/components/layout/AppShell"
import { getSupabaseBrowserClient } from "@/utils/supabase/client"
import { InviteForm } from "./components/InviteForm"
import { InviteOverview } from "./components/InviteOverview"
import { InviteStatus } from "./components/InviteStatus"
import type { InvitePayload } from "./types"

type InvitePageProps = {
  params: Promise<{
    token: string
  }>
}

function deriveUserDisplayName(user: User | null): string | null {
  if (!user) {
    return null
  }
  const metadata = user.user_metadata ?? {}
  const candidates = [
    metadata.full_name,
    metadata.fullName,
    metadata.name,
    metadata.display_name,
  ]
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

export default function InvitePage({ params }: InvitePageProps) {
  const { token } = React.use(params)
  const router = useRouter()
  const { notify } = useNotifications()
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), [])
  const { setHeaderVariant, setHeaderSpacing } = useAppShellLayout()
  const [loading, setLoading] = React.useState(true)
  const [joining, setJoining] = React.useState(false)
  const [invite, setInvite] = React.useState<InvitePayload | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [username, setUsername] = React.useState("")
  const usernamePrefilledRef = React.useRef(false)
  const [sessionUser, setSessionUser] = React.useState<User | null>(null)
  const [sessionResolved, setSessionResolved] = React.useState(false)
  const pendingJoinKey = React.useMemo(() => (token ? `invite-join:${token}` : null), [token])
  const [pendingJoinUsername, setPendingJoinUsername] = React.useState<string | null>(null)
  const [pageState, setPageState] = React.useState<{
    checkingMembership: boolean
    requiresAuth: boolean
  }>({ checkingMembership: true, requiresAuth: false })

  React.useEffect(() => {
    setHeaderVariant("none")
    setHeaderSpacing("none")
    let previousDisplay: string | null = null
    const footer = document.querySelector("footer") as HTMLElement | null
    if (footer) {
      previousDisplay = footer.style.display
      footer.style.display = "none"
    }
    return () => {
      setHeaderVariant(null)
      setHeaderSpacing("auto")
      if (footer) {
        footer.style.display = previousDisplay ?? ""
      }
    }
  }, [setHeaderSpacing, setHeaderVariant])

  React.useEffect(() => {
    if (!pendingJoinKey || typeof window === "undefined") {
      return
    }
    const stored = window.sessionStorage.getItem(pendingJoinKey)
    if (!stored) {
      return
    }
    try {
      const parsed = JSON.parse(stored) as { username?: string }
      if (parsed?.username) {
        usernamePrefilledRef.current = true
        setUsername(parsed.username)
        setPendingJoinUsername(parsed.username)
      }
    } catch {
      window.sessionStorage.removeItem(pendingJoinKey)
    }
  }, [pendingJoinKey])

  React.useEffect(() => {
    let active = true
    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!active) {
        return
      }
      const user = session?.user ?? null
      setSessionUser(user)
      setSessionResolved(true)
      if (user) {
        const displayName = deriveUserDisplayName(user)
        if (displayName && !usernamePrefilledRef.current) {
          setUsername((prev) => {
            if (prev.trim().length > 0) {
              return prev
            }
            usernamePrefilledRef.current = true
            return displayName
          })
        }
      }
    }
    void syncSession()
    return () => {
      active = false
    }
  }, [supabase])

  const loadInvite = React.useCallback(async () => {
    if (!token) {
      setInvite(null)
      setError("Invalid invite link.")
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/invites/${token}`, {
        method: "GET",
        cache: "no-store",
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        setError(payload?.error ?? "Invite link is invalid or expired.")
        setInvite(null)
        return
      }
      const data = (await response.json()) as InvitePayload
      setInvite(data)
    } catch (fetchError) {
      console.error("Failed to load invite", fetchError)
      setError("Unable to load this invite right now.")
      setInvite(null)
    } finally {
      setLoading(false)
    }
  }, [token])

  React.useEffect(() => {
    if (!sessionResolved || sessionUser || !token) {
      return
    }
        const redirectTo = `/invite/${token}`
        router.replace(`/auth/traditional?mode=signUp&redirectTo=${encodeURIComponent(redirectTo)}`)
  }, [router, sessionResolved, sessionUser, token])

  React.useEffect(() => {
    if (!invite?.project.id || !sessionResolved) {
      return
    }
    if (!sessionUser) {
      setPageState({ checkingMembership: false, requiresAuth: true })
      return
    }
    let cancelled = false
    setPageState({ checkingMembership: true, requiresAuth: false })
    const checkMembership = async () => {
      try {
        const response = await fetch(
          `/api/projects/${invite.project.id}/members/status?userId=${sessionUser.id}`,
          { cache: "no-store" }
        )
        if (response.ok) {
          const data = (await response.json()) as { isMember: boolean }
          if (data.isMember) {
            router.replace(`/projects/${invite.project.id}`)
            return
          }
        }
      } catch (membershipError) {
        console.error("Failed to check membership", membershipError)
      } finally {
        if (!cancelled) {
          setPageState({ checkingMembership: false, requiresAuth: false })
        }
      }
    }
    void checkMembership()
    return () => {
      cancelled = true
    }
  }, [invite?.project.id, router, sessionResolved, sessionUser])

  const clearPendingJoinIntent = React.useCallback(() => {
    if (!pendingJoinKey || typeof window === "undefined") {
      return
    }
    window.sessionStorage.removeItem(pendingJoinKey)
  }, [pendingJoinKey])

  const handleJoinProject = React.useCallback(async () => {
    if (!token || !invite) {
      return
    }
    const trimmedUsername = username.trim()
    if (!trimmedUsername) {
      setError("Username is required for this project.")
      return
    }
    setJoining(true)
    setError(null)
    try {
      const response = await fetch(`/api/invites/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: trimmedUsername }),
      })
      if (response.status === 401) {
        if (pendingJoinKey && typeof window !== "undefined") {
          window.sessionStorage.setItem(
            pendingJoinKey,
            JSON.stringify({ username: trimmedUsername })
          )
        }
        const redirectTo = `/invite/${token}`
        router.push(
          `/auth/traditional?mode=signUp&redirectTo=${encodeURIComponent(redirectTo)}`
        )
        return
      }
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        setError(payload?.error ?? "Unable to join this project right now.")
        return
      }
      clearPendingJoinIntent()
      setPendingJoinUsername(null)
      notify({
        title: "Welcome aboard!",
        description: `You have joined ${invite.project.title}.`,
        variant: "success",
      })
      router.replace(`/projects/${invite.project.id}`)
    } catch (joinError) {
      console.error("Failed to accept invite", joinError)
      setError("Unable to join this project right now.")
    } finally {
      setJoining(false)
    }
  }, [clearPendingJoinIntent, invite, notify, pendingJoinKey, router, token, username])

  React.useEffect(() => {
    if (
      !pendingJoinUsername ||
      !invite ||
      pageState.checkingMembership ||
      pageState.requiresAuth ||
      joining
    ) {
      return
    }
    setPendingJoinUsername(null)
    clearPendingJoinIntent()
    void handleJoinProject()
  }, [
    clearPendingJoinIntent,
    handleJoinProject,
    invite,
    joining,
    pageState.checkingMembership,
    pageState.requiresAuth,
    pendingJoinUsername,
  ])

  React.useEffect(() => {
    loadInvite()
  }, [loadInvite])

  const handleSignIn = () => {
    const redirectTo = `/invite/${token}`
    router.push(`/auth/traditional?mode=signUp&redirectTo=${encodeURIComponent(redirectTo)}`)
  }

  let content: React.ReactNode
  if (loading || pageState.checkingMembership) {
    content = <p className="text-lg font-semibold text-primary">Loading invite details…</p>
  } else if (!invite) {
    content = (
      <InviteStatus
        message={error ?? "Invite not found."}
        variant={error ? "destructive" : "muted"}
        onRetry={loadInvite}
      />
    )
  } else {
    content = (
      <div className="space-y-6">
        <InviteOverview invite={invite} />
        {error ? <InviteStatus message={error} variant="destructive" /> : null}
        <InviteForm
          username={username}
          onUsernameChange={setUsername}
          onJoin={handleJoinProject}
          joining={joining}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="w-full rounded-[3rem] border-2 border-primary/30 bg-white px-6 py-12 shadow-[0_8px_20px_rgba(72,68,110,0.15)] sm:px-8">
        {content}
      </div>
    </div>
  )
}
