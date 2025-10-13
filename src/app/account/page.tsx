"use client"

import Link from "next/link"
import { useMemo } from "react"

import { usePreferences } from "@/components/layout/AppShell"
import { Button } from "@/components/ui/button"

const DEPARTMENT_LABELS = {
  compact: "Compact chips",
  fullWidth: "Full-width chips",
} as const

const THEME_LABELS = {
  standard: "Standard",
  light: "Light",
  dark: "Dark",
  red: "Red",
  blue: "Blue",
} as const

const THEME_SWATCHES: Record<string, string[]> = {
  standard: ["#907ad6", "#4f518c", "#f4effa"],
  light: ["#2563eb", "#a5b4fc", "#fdfbff"],
  dark: ["#111827", "#6366f1", "#0ea5e9"],
  red: ["#e11d48", "#fecdd3", "#fff5f5"],
  blue: ["#1d4ed8", "#38bdf8", "#e6f4ff"],
}

export default function ManageAccountPage() {
  const { profile, loading } = usePreferences()

  const lastSignIn = useMemo(() => {
    if (!profile?.lastSignIn) {
      return "Not available"
    }
    const parsed = new Date(profile.lastSignIn)
    if (Number.isNaN(parsed.getTime())) {
      return "Not available"
    }
    return parsed.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    })
  }, [profile?.lastSignIn])

  if (loading && !profile) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-12 text-center text-foreground/70">
        Loading your account…
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-12 text-center text-foreground/70">
        Please sign in to manage your account.
      </div>
    )
  }

  const themeSwatches = THEME_SWATCHES[profile.theme] ?? THEME_SWATCHES.standard
  const themeLabel =
    THEME_LABELS[profile.theme as keyof typeof THEME_LABELS] ?? THEME_LABELS.standard

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <div className="rounded-[2.5rem] border-2 border-primary/30 bg-card-project px-8 py-10 shadow-[0_4px_2px_0.15px_rgba(0,1,0,0.15)]">
        <h1 className="text-3xl font-bold text-foreground">Manage Account</h1>
        <p className="mt-2 text-base text-foreground/70">
          Review your account details and adjust settings to personalize your workspace.
        </p>

        <dl className="mt-8 space-y-5 text-base text-foreground">
          <div className="grid gap-1">
            <dt className="text-sm uppercase tracking-wide text-muted-foreground">Email</dt>
            <dd className="font-semibold">{profile.email}</dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-sm uppercase tracking-wide text-muted-foreground">Full name</dt>
            <dd className="font-semibold">{profile.fullName || "Not provided"}</dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-sm uppercase tracking-wide text-muted-foreground">Last sign-in</dt>
            <dd className="font-semibold">{lastSignIn}</dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-sm uppercase tracking-wide text-muted-foreground">
              Department layout
            </dt>
            <dd className="font-semibold">
              {DEPARTMENT_LABELS[profile.departmentLayout] ?? DEPARTMENT_LABELS.fullWidth}
            </dd>
          </div>
          <div className="grid gap-2">
            <dt className="text-sm uppercase tracking-wide text-muted-foreground">Theme</dt>
            <dd className="font-semibold">{themeLabel}</dd>
            <div className="flex gap-2">
              {themeSwatches.map((color) => (
                <span
                  key={color}
                  className="h-8 w-8 rounded-full border border-border"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </dl>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/account/settings">
            <Button className="rounded-full bg-button-background px-6 py-3 text-base font-semibold text-button-foreground transition-colors hover:bg-button-hover-background">
              Open Settings
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
