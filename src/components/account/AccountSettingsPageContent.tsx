"use client"

import Image from "next/image"
import Link from "next/link"
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { Check, Eye, EyeOff, Loader2, Palette, Settings as SettingsIcon, UserRound } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { UserIdentity } from "@supabase/supabase-js"

import { SettingsForm } from "@/components/settings/SettingsForm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useNotifications } from "@/components/notifications/Notification"
import { usePreferences } from "@/contexts/preferences"
import type { ProfileSummary } from "@/types/preferences"
import { cn } from "@/lib/utils"
import { uploadProfileAvatar } from "@/utils/profile/media"
import { getSupabaseBrowserClient } from "@/utils/supabase/client"
import { ProfileAvatarDialog } from "@/components/account/ProfileAvatarDialog"

type AccountSettingsContentProps = {
  profile: ProfileSummary | null
  loading: boolean
  variant?: "page" | "dialog"
  refreshProfile?: () => Promise<void>
  updateProfileLocally: (update: Partial<ProfileSummary>) => void
}

export function AccountSettingsPageContent() {
  const { profile, loading, refreshProfile, updateProfileLocally } = usePreferences()
  return (
    <AccountSettingsContent
      profile={profile}
      loading={loading}
      refreshProfile={refreshProfile}
      updateProfileLocally={updateProfileLocally}
      variant="page"
    />
  )
}

type DialogSectionId = "profile" | "personalization"
type DialogSectionConfig = { id: DialogSectionId; label: string; icon: LucideIcon }

const DIALOG_SECTIONS: DialogSectionConfig[] = [
  { id: "profile", label: "Profile Settings", icon: UserRound },
  { id: "personalization", label: "Workspace Style", icon: Palette },
]

export function AccountSettingsContent({
  profile,
  loading,
  variant = "page",
  refreshProfile,
  updateProfileLocally,
}: AccountSettingsContentProps) {
  const [activeDialogSection, setActiveDialogSection] = useState<DialogSectionId>("profile")
  const [passwordFormOpen, setPasswordFormOpen] = useState(false)
  const [passwordValue, setPasswordValue] = useState("")
  const [passwordConfirmValue, setPasswordConfirmValue] = useState("")
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordPending, setPasswordPending] = useState(false)
  const [oldPasswordValue, setOldPasswordValue] = useState("")
  const [fullNameInput, setFullNameInput] = useState(profile?.fullName ?? "")
  const [bioInput, setBioInput] = useState(profile?.bio ?? "")
  const [profileSaving, setProfileSaving] = useState(false)
  const [googleLinked, setGoogleLinked] = useState(false)
  const [linkingGoogle, setLinkingGoogle] = useState(false)
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false)
  const [sessionAvatarUrl, setSessionAvatarUrl] = useState<string | null>(null)
  const [sessionFullName, setSessionFullName] = useState<string | null>(null)
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [avatarUpdating, setAvatarUpdating] = useState(false)
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const { notify } = useNotifications()
  const refreshProfileSafe = refreshProfile ?? (async () => {})
  const linkAttemptRef = useRef(false)
  const popupWatcherRef = useRef<number | null>(null)
  const popupRef = useRef<Window | null>(null)
  const popupClosedFromMessageRef = useRef(false)
  const isMountedRef = useRef(true)

  const clearPopupWatcher = useCallback(() => {
    if (popupWatcherRef.current !== null) {
      window.clearInterval(popupWatcherRef.current)
      popupWatcherRef.current = null
    }
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close()
    }
    popupRef.current = null
  }, [])
  const patchProfile = useCallback(
    async (payload: Record<string, string | null>) => {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message =
          typeof data?.error === "string" && data.error.trim().length > 0
            ? data.error
            : "Unable to update your profile."
        throw new Error(message)
      }
      if (data?.profile) {
        updateProfileLocally(data.profile)
      }
      await refreshProfileSafe()
      return data?.profile ?? null
    },
    [refreshProfileSafe, updateProfileLocally]
  )

  useEffect(() => {
    setFullNameInput(profile?.fullName ?? "")
    setBioInput(profile?.bio ?? "")
  }, [profile?.fullName, profile?.bio])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      clearPopupWatcher()
      linkAttemptRef.current = false
    }
  }, [clearPopupWatcher])

  const syncGoogleLink = useCallback(async () => {
    if (linkAttemptRef.current) {
      try {
        await supabase.auth.refreshSession()
      } catch (refreshError) {
        console.error("Failed to refresh session during Google link", refreshError)
      }
    }
    const { data, error } = await supabase.auth.getUser()

    if (error || !data?.user) {
      if (linkAttemptRef.current) {
        notify({
          title: "Link Google failed",
          description: "Unable to confirm the Google link. Please try again.",
          variant: "destructive",
        })
        popupClosedFromMessageRef.current = false
        linkAttemptRef.current = false
        setLinkingGoogle(false)
        clearPopupWatcher()
      }
      if (isMountedRef.current && !data?.user) {
        setGoogleLinked(false)
        setSessionAvatarUrl(null)
        setSessionFullName(null)
      }
      return
    }

    const user = data.user
    const googleIdentity =
      user.identities?.find((identity: UserIdentity) => identity.provider === "google") ?? null
    const identityData = (googleIdentity?.identity_data ?? {}) as Record<string, unknown>
    const googleEmail =
      typeof identityData.email === "string" ? identityData.email.toLowerCase() : null
    const identityAvatar =
      typeof identityData.avatar_url === "string" ? identityData.avatar_url : null
    const identityName =
      typeof identityData.full_name === "string"
        ? identityData.full_name
        : typeof identityData.name === "string"
          ? identityData.name
          : null

    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
    const metadataAvatar =
      typeof metadata.avatar_url === "string" ? metadata.avatar_url : null
    const metadataName =
      typeof metadata.full_name === "string"
        ? metadata.full_name
        : typeof metadata.name === "string"
          ? metadata.name
          : null

    const normalizedAccountEmail = profile?.email?.toLowerCase() ?? null
    const linkingAttempt = linkAttemptRef.current

    if (
      googleIdentity &&
      normalizedAccountEmail &&
      googleEmail &&
      googleEmail !== normalizedAccountEmail
    ) {
      if (linkingAttempt) {
        const { error: unlinkError } = await supabase.auth.unlinkIdentity(googleIdentity)
        if (unlinkError) {
          console.error("Failed to unlink mismatched Google identity", unlinkError)
        }
        notify({
          title: "Google email mismatch",
          description: "Use the Google account that matches your ASAP email.",
          variant: "destructive",
        })
      }
      if (isMountedRef.current) {
        setGoogleLinked(false)
        setSessionAvatarUrl(metadataAvatar ?? null)
        setSessionFullName(metadataName ?? null)
      }
    } else if (googleIdentity) {
      if (isMountedRef.current) {
        setGoogleLinked(true)
        setSessionAvatarUrl((identityAvatar ?? metadataAvatar) ?? null)
        setSessionFullName((identityName ?? metadataName) ?? null)
      }
      if (linkingAttempt) {
        notify({
          title: "Google connected",
          description: "Your account is now linked with Google.",
          variant: "success",
        })
      }
    } else {
      if (isMountedRef.current) {
        setGoogleLinked(false)
        setSessionAvatarUrl(metadataAvatar ?? null)
        setSessionFullName(metadataName ?? null)
      }
      if (linkingAttempt) {
        notify({
          title: "Google link incomplete",
          description: "Finish signing in with Google to connect your account.",
          variant: "info",
        })
      }
    }

    if (linkingAttempt) {
      popupClosedFromMessageRef.current = false
      linkAttemptRef.current = false
      setLinkingGoogle(false)
      clearPopupWatcher()
    }
  }, [clearPopupWatcher, notify, profile?.email, supabase])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (cancelled) {
        return
      }
      await syncGoogleLink()
    }

    run()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      run()
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase, syncGoogleLink])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    type GoogleLinkMessage = {
      type?: string
      status?: "success" | "mismatch" | "error"
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return
      }
      const payload = event.data as GoogleLinkMessage | null
      if (payload?.type === "google-link-complete") {
        popupClosedFromMessageRef.current = true
        if (payload.status === "mismatch") {
          clearPopupWatcher()
          linkAttemptRef.current = false
          setLinkingGoogle(false)
          notify({
            title: "Google email mismatch",
            description: "Use the Google account that matches your ASAP email.",
            variant: "destructive",
          })
        } else if (payload.status === "error") {
          clearPopupWatcher()
          linkAttemptRef.current = false
          setLinkingGoogle(false)
          notify({
            title: "Link Google failed",
            description: "Unable to complete Google linking. Please try again.",
            variant: "destructive",
          })
        }
        syncGoogleLink()
      }
    }

    window.addEventListener("message", handleMessage)
    return () => {
      window.removeEventListener("message", handleMessage)
    }
  }, [clearPopupWatcher, notify, syncGoogleLink])

  const lastSignIn = useMemo(() => {
    if (!profile?.lastSignIn) {
      return "Not available"
    }
    const parsed = new Date(profile.lastSignIn)
    if (Number.isNaN(parsed.getTime())) {
      return "Not available"
    }
    return parsed.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    })
  }, [profile?.lastSignIn])

  const handleProfileSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profile) {
      return
    }

    const trimmedName = fullNameInput.trim()
    const trimmedBio = bioInput.trim()

    if (trimmedName.length === 0) {
      notify({
        title: "Full name is required",
        description: "Please provide your name before saving.",
        variant: "destructive",
      })
      return
    }

    const payload: Record<string, string | null> = {}
    if (trimmedName !== (profile.fullName ?? "")) {
      payload.fullName = trimmedName
    }
    if (trimmedBio !== (profile.bio ?? "")) {
      payload.bio = trimmedBio
    }

    if (Object.keys(payload).length === 0) {
      notify({
        title: "No changes detected",
        description: "Update your name or bio before saving.",
        variant: "info",
      })
      return
    }

    setProfileSaving(true)
    try {
      await patchProfile(payload)
      notify({
        title: "Profile updated",
        description: "Your profile information has been saved.",
        variant: "success",
      })
    } catch (error) {
      const message =
        error instanceof Error && error.message.length > 0
          ? error.message
          : "Unable to update your profile."
      notify({
        title: "Profile update failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setProfileSaving(false)
    }
  }

  const resetProfileForm = () => {
    setFullNameInput(profile?.fullName ?? "")
    setBioInput(profile?.bio ?? "")
  }

  const handleAvatarDialogSave = async (file: File) => {
    setAvatarUpdating(true)
    try {
      const uploadedUrl = await uploadProfileAvatar(file)
      await patchProfile({ avatarUrl: uploadedUrl })
      notify({
        title: "Profile photo updated",
        description: "Your new avatar is live.",
        variant: "success",
      })
      setAvatarDialogOpen(false)
    } catch (error) {
      const message =
        error instanceof Error && error.message.length > 0
          ? error.message
          : "Unable to update your profile photo."
      notify({
        title: "Unable to update photo",
        description: message,
        variant: "destructive",
      })
    } finally {
      setAvatarUpdating(false)
    }
  }

  const handleLinkGoogle = async () => {
    if (linkingGoogle) {
      return
    }
    setLinkingGoogle(true)
    linkAttemptRef.current = true
    popupClosedFromMessageRef.current = false
    clearPopupWatcher()
    try {
      const { data, error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?popup=1`,
          skipBrowserRedirect: true,
        },
      })
      if (error) {
        throw error
      }
      if (!data?.url) {
        throw new Error("Unable to start Google linking.")
      }
      const popup = window.open(
        data.url,
        "asap-google-link",
        "width=520,height=640"
      )
      if (!popup) {
        throw new Error("Popup was blocked. Allow pop-ups to connect Google.")
      }
      popupRef.current = popup
      popup.focus()
      popupWatcherRef.current = window.setInterval(() => {
        if (!popupRef.current || popupRef.current.closed) {
          clearPopupWatcher()
          if (linkAttemptRef.current) {
            if (popupClosedFromMessageRef.current) {
              return
            }
            linkAttemptRef.current = false
            setLinkingGoogle(false)
            notify({
              title: "Google link canceled",
              description: "Finish signing in with Google to connect your account.",
              variant: "info",
            })
          }
        }
      }, 400)
    } catch (error) {
      clearPopupWatcher()
      const message =
        error instanceof Error && error.message.length > 0
          ? error.message
          : "Unable to start Google linking."
      notify({
        title: "Link Google failed",
        description: message,
        variant: "destructive",
      })
      popupClosedFromMessageRef.current = false
      linkAttemptRef.current = false
      setLinkingGoogle(false)
    }
  }

  const resetPasswordForm = () => {
    setPasswordFormOpen(false)
    setOldPasswordValue("")
    setPasswordValue("")
    setPasswordConfirmValue("")
    setPasswordError(null)
    setShowOldPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
  }

  const showPasswordError = useCallback(
    (message: string) => {
      setPasswordError(message)
      notify({
        title: "Update password failed",
        description: message,
        variant: "destructive",
      })
    },
    [notify]
  )

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (passwordPending) {
      return
    }
    const trimmedPassword = passwordValue.trim()
    const trimmedConfirm = passwordConfirmValue.trim()
    const trimmedOldPassword = oldPasswordValue.trim()

    if (trimmedPassword.length < 6) {
      showPasswordError("Password must be at least 6 characters.")
      return
    }

    if (trimmedPassword !== trimmedConfirm) {
      showPasswordError("Passwords do not match.")
      return
    }

    if (profile?.hasPassword && trimmedOldPassword.length === 0) {
      showPasswordError("Please enter your current password.")
      return
    }

    setPasswordPending(true)
    setPasswordError(null)
    try {
      const response = await fetch("/api/account/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: trimmedPassword,
          oldPassword: trimmedOldPassword.length > 0 ? trimmedOldPassword : undefined,
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        const message =
          typeof payload?.error === "string" && payload.error.trim().length > 0
            ? payload.error
            : "Unable to update password."
        throw new Error(message)
      }

      notify({
        title: "Password updated",
        description: "Your ASAP password is set.",
        variant: "success",
      })
      resetPasswordForm()
      await refreshProfileSafe()
    } catch (error) {
      const message =
        error instanceof Error && error.message.length > 0
          ? error.message
          : "Unable to update password."
      showPasswordError(message)
    } finally {
      setPasswordPending(false)
    }
  }

  const emptyStateClass =
    variant === "page"
      ? "mx-auto w-full max-w-4xl px-6 py-12 text-center text-foreground/70"
      : "py-4 text-center text-sm text-muted-foreground"

  if (loading && !profile) {
    return <div className={emptyStateClass}>Loading your profile settings…</div>
  }

  if (!profile) {
    return (
      <div className={emptyStateClass}>
        Please sign in to manage your profile settings.
      </div>
    )
  }

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold uppercase tracking-[0.2em] text-primary/70 inline-flex items-center gap-2">
          <SettingsIcon className="size-4" />
          Account Settings
        </h2>
      </div>
      {variant === "page" ? (
        <Link
          href="/projects"
          className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          ← Back to workspace
        </Link>
      ) : null}
    </div>
  )
  const sectionHeadingClass = "text-xl font-semibold text-foreground"
  const sectionDescriptionClass = "text-sm text-foreground/70"
  const emailBlock = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className={sectionHeadingClass}>Email</h3>
          <p className={sectionDescriptionClass}>Last sign-in: {lastSignIn}</p>
          <p className="text-base font-semibold text-foreground">{profile.email}</p>
        </div>
        {/*
        <div className="flex items-center gap-2">
          {googleLinked ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
              <Check className="size-4" /> Google connected
            </span>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={handleLinkGoogle}
              disabled={linkingGoogle}
            >
              {linkingGoogle ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Link Google
            </Button>
          )}
        </div>
        */}
      </div>
      <p className={sectionDescriptionClass}>
        Link your Google account so you can sign in with a single click.
      </p>
    </div>
  )

  const fallbackAvatarUrl = sessionAvatarUrl ?? null
  const effectiveAvatarUrl = profile.avatarUrl ?? fallbackAvatarUrl
  const avatarFallbackLetter = (profile.fullName ?? sessionFullName ?? profile.email ?? "U")
    .slice(0, 1)
    .toUpperCase()

  const profileFormBlock = (
    <form className="space-y-4" onSubmit={handleProfileSave}>
      <div className="space-y-2">
        <h3 className={sectionHeadingClass}>Full Name</h3>
        <p className={sectionDescriptionClass}>Update how teammates see your name.</p>
        <Input
          value={fullNameInput}
          onChange={(event) => setFullNameInput(event.target.value)}
          placeholder="Name Surname"
          className="rounded-2xl border border-primary/20 bg-white px-4 py-5 text-base"
        />
      </div>
      <div className="space-y-2">
        <h3 className={sectionHeadingClass}>About Me</h3>
        <p className={sectionDescriptionClass}>
          Share a sentence or two about yourself.
        </p>
        <div className="group/textarea overflow-hidden rounded-[1rem] border-2 border-primary/40 bg-white/80 transition-[box-shadow,border-color] focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(0,0,0,0.12)]">
          <Textarea
            value={bioInput}
            onChange={(event) => setBioInput(event.target.value)}
            placeholder='Tell your teammates who you are. (e.g., "Product lead obsessed with deadlines.")'
            className="project-detail-scroll min-h-[10rem] w-full resize-y rounded-[inherit] border-none bg-transparent px-6 py-3 text-base text-foreground placeholder:text-primary/60 shadow-none focus-visible:outline-none focus-visible:ring-0"
            rows={4}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={profileSaving} className="rounded-full px-6">
          {profileSaving ? "Saving…" : "Save profile"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={profileSaving}
          className="rounded-full"
          onClick={resetProfileForm}
        >
          Reset
        </Button>
      </div>
    </form>
  )

  const avatarBlock = (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className={sectionHeadingClass}>Profile Photo</h3>
        <p className={sectionDescriptionClass}>Show who you are across ASAP.</p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex size-20 items-center justify-center overflow-hidden rounded-full border border-primary/20 bg-primary/5 text-xl font-semibold text-primary">
          {effectiveAvatarUrl ? (
            <Image src={effectiveAvatarUrl} alt="Profile avatar" fill sizes="80px" className="object-cover" priority />
          ) : (
            avatarFallbackLetter
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            className="rounded-full"
            onClick={() => {
              setAvatarDialogOpen(true)
            }}
            disabled={avatarUpdating}
          >
            {avatarUpdating ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {effectiveAvatarUrl ? "Edit photo" : "Upload photo"}
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">PNG, JPG, or GIF up to 5MB.</p>
      <ProfileAvatarDialog
        open={avatarDialogOpen}
        onOpenChange={setAvatarDialogOpen}
        initialImageUrl={effectiveAvatarUrl}
        fallbackImageUrl={fallbackAvatarUrl}
        fallbackLetter={avatarFallbackLetter}
        onComplete={handleAvatarDialogSave}
      />
    </section>
  )

  const passwordBlock = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <h3 className={sectionHeadingClass}>Password</h3>
        </div>
        {passwordFormOpen ? null : (
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => {
              setPasswordError(null)
              setPasswordFormOpen(true)
              window.requestAnimationFrame(() => {
                const container = document.querySelector(".account-settings-scroll")
                if (container instanceof HTMLElement) {
                  container.scrollTo({ top: container.scrollHeight, behavior: "smooth" })
                }
              })
            }}
          >
            {profile.hasPassword ? "Update password" : "Set password"}
          </Button>
        )}
      </div>
      {passwordFormOpen ? (
        <form className="space-y-3" onSubmit={handlePasswordSubmit}>
          {profile.hasPassword ? (
            <div className="relative">
              <Input
                type={showOldPassword ? "text" : "password"}
                value={oldPasswordValue}
                onChange={(event) => setOldPasswordValue(event.target.value)}
                autoComplete="current-password"
                placeholder="Current password"
                className="rounded-2xl border border-primary/20 px-4 py-5 pr-12 text-base bg-white"
              />
              <button
                type="button"
                aria-label={showOldPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-4 flex items-center text-muted-foreground/80 transition hover:text-muted-foreground"
                onClick={() => setShowOldPassword((prev) => !prev)}
                disabled={passwordPending}
              >
                {showOldPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          ) : null}
          <div className="relative">
            <Input
              type={showNewPassword ? "text" : "password"}
              value={passwordValue}
              onChange={(event) => setPasswordValue(event.target.value)}
              autoComplete="new-password"
              placeholder="New password"
              className="rounded-2xl border border-primary/20 px-4 py-5 pr-12 text-base bg-white"
            />
            <button
              type="button"
              aria-label={showNewPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-4 flex items-center text-muted-foreground/80 transition hover:text-muted-foreground"
              onClick={() => setShowNewPassword((prev) => !prev)}
              disabled={passwordPending}
            >
              {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <div className="relative">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              value={passwordConfirmValue}
              onChange={(event) => setPasswordConfirmValue(event.target.value)}
              autoComplete="new-password"
              placeholder="Confirm new password"
              className="rounded-2xl border border-primary/20 px-4 py-5 pr-12 text-base bg-white"
            />
            <button
              type="button"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-4 flex items-center text-muted-foreground/80 transition hover:text-muted-foreground"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              disabled={passwordPending}
            >
              {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {passwordError ? <p className="text-sm font-semibold text-destructive">{passwordError}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={passwordPending} className="rounded-full px-5">
            {passwordPending ? "Saving…" : "Save password"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={passwordPending}
            className="rounded-full"
            onClick={resetPasswordForm}
          >
            Cancel
          </Button>
        </div>
      </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          {profile.hasPassword
            ? "Rotate your password regularly to keep your workspace secure."
            : "Set a password so you can sign in even without Google."}
        </p>
      )}
    </div>
  )

  const profileSection = (
    <section className="space-y-8">
      <div className="space-y-5">
        {avatarBlock}
        {emailBlock}
        {profileFormBlock}
        {passwordBlock}
      </div>
    </section>
  )

  const personalizationSection = (
    <section className="space-y-4">
      <SettingsForm layout={variant === "page" ? "page" : "dialog"} />
    </section>
  )

  const sectionLookup: Record<DialogSectionId, ReactNode> = {
    profile: profileSection,
    personalization: personalizationSection,
  }

  if (variant === "dialog") {
    const activeSection = sectionLookup[activeDialogSection] ?? sectionLookup.profile
    return (
      <div className="flex h-[60vh] min-h-[32rem] flex-col gap-4 overflow-hidden">
        <div className="shrink-0">{header}</div>
        <nav className="shrink-0 flex flex-wrap gap-1 rounded-full border border-primary/20 bg-primary/5 p-0.5">
          {DIALOG_SECTIONS.map((section) => {
            const isActive = section.id === activeDialogSection
            return (
              <button
                key={section.id}
                type="button"
                className={cn(
                  "flex-1 min-w-[12rem] rounded-full px-4 py-1.5 text-sm font-semibold transition inline-flex items-center justify-center gap-2",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-primary hover:bg-primary/10"
                )}
                aria-pressed={isActive}
                onClick={() => setActiveDialogSection(section.id)}
              >
                <section.icon className="size-4" />
                {section.label}
              </button>
            )
          })}
        </nav>
        <div className="account-settings-scroll w-full min-h-[calc(100vh-16rem)] overflow-hidden px-[clamp(3.25rem,4vw,3.25rem)] pt-3 min-h-0 flex-1 overflow-y-auto pl-1 pr-1 asap-scroll [scrollbar-gutter:stable]">
          <div className="space-y-6">{activeSection}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-12 px-6 py-12">
      {header}
      <div className="space-y-12">
        {profileSection}
        {personalizationSection}
      </div>
    </div>
  )
}
