"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"

import {
  DepartmentLayoutOption,
  ThemeOption,
  usePreferences,
} from "@/components/layout/AppShell"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getSupabaseBrowserClient } from "@/utils/supabase/client"

type StatusState =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }

const themeLabels: Record<ThemeOption, string> = {
  standard: "Standard",
  light: "Light",
  dark: "Dark",
  red: "Red",
  blue: "Blue",
}

const departmentLabels: Record<DepartmentLayoutOption, string> = {
  compact: "Compact chips",
  fullWidth: "Full-width chips",
}

const themeSwatches: Record<ThemeOption, string[]> = {
  standard: ["#907ad6", "#4f518c", "#f4effa"],
  light: ["#2563eb", "#a5b4fc", "#fdfbff"],
  dark: ["#111827", "#6366f1", "#0ea5e9"],
  red: ["#e11d48", "#fecdd3", "#fff5f5"],
  blue: ["#1d4ed8", "#38bdf8", "#e6f4ff"],
}

export type SettingsFormProps = {
  layout?: "page" | "dialog"
  onSaved?: () => void
}

export function SettingsForm({ layout = "page", onSaved }: SettingsFormProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const { profile, loading, refreshProfile, updateProfileLocally } = usePreferences()

  const [departmentLayout, setDepartmentLayout] = useState<DepartmentLayoutOption | null>(null)
  const [theme, setTheme] = useState<ThemeOption | null>(null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<StatusState>({ kind: "idle" })

  useEffect(() => {
    if (profile) {
      setDepartmentLayout(profile.departmentLayout)
      setTheme(profile.theme)
    }
  }, [profile])

  const hasChanges =
    !!profile &&
    departmentLayout !== null &&
    theme !== null &&
    (profile.departmentLayout !== departmentLayout || profile.theme !== theme)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profile) {
      setStatus({
        kind: "error",
        message: "You must be logged in to save your settings.",
      })
      return
    }

    if (!hasChanges) {
      setStatus({ kind: "idle" })
      return
    }

    setSaving(true)
    setStatus({ kind: "idle" })

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        throw new Error("Authentication required")
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          department_layout: departmentLayout,
          theme,
        })
        .eq("id", user.id)

      if (error) {
        throw error
      }

      updateProfileLocally({ departmentLayout, theme })
      await refreshProfile()

      setStatus({ kind: "success", message: "Settings saved successfully." })
      onSaved?.()
    } catch (error) {
      console.error("Failed to save settings", error)
      setStatus({
        kind: "error",
        message: "Unable to save settings. Please try again.",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading && !profile) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        Loading settings…
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        Please sign in to access your settings.
      </div>
    )
  }

  const effectiveDepartmentLayout =
    departmentLayout ?? profile.departmentLayout ?? "fullWidth"
  const effectiveTheme = theme ?? profile.theme ?? "standard"

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <section className="space-y-3">
        <header>
          <h2 className="text-xl font-semibold text-foreground">Project Department</h2>
          <p className="text-sm text-foreground/70">
            Pick the chip style you want to see by default when you create or edit projects.
          </p>
        </header>
        <Select
          value={effectiveDepartmentLayout}
          onValueChange={(value) => setDepartmentLayout(value as DepartmentLayoutOption)}
        >
          <SelectTrigger className="w-full max-w-sm justify-between rounded-full border-2 border-primary/30 bg-white/80 px-5 py-3 text-base font-semibold">
            <SelectValue placeholder="Select Type Display" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="compact">{departmentLabels.compact}</SelectItem>
            <SelectItem value="fullWidth">{departmentLabels.fullWidth}</SelectItem>
          </SelectContent>
        </Select>
      </section>

      <section className="space-y-3">
        <header>
          <h2 className="text-xl font-semibold text-foreground">Theme</h2>
          <p className="text-sm text-foreground/70">
            Switch between curated color palettes. Your choice updates instantly.
          </p>
        </header>
        <Select
          value={effectiveTheme}
          onValueChange={(value) => setTheme(value as ThemeOption)}
        >
          <SelectTrigger className="w-full max-w-sm justify-between rounded-full border-2 border-primary/30 bg-white/80 px-5 py-3 text-base font-semibold">
            <SelectValue placeholder="Select Theme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="standard">{themeLabels.standard}</SelectItem>
            <SelectItem value="light">{themeLabels.light}</SelectItem>
            <SelectItem value="dark">{themeLabels.dark}</SelectItem>
            <SelectItem value="red">{themeLabels.red}</SelectItem>
            <SelectItem value="blue">{themeLabels.blue}</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex flex-wrap items-center gap-3">
          {(themeSwatches[effectiveTheme] ?? themeSwatches.standard).map((color) => (
            <span
              key={color}
              className="h-10 w-10 rounded-full border border-border shadow-sm"
              style={{ backgroundColor: color }}
              aria-hidden
            />
          ))}
          <span className="text-sm text-muted-foreground">
            {themeLabels[effectiveTheme]} palette preview
          </span>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          disabled={saving || !hasChanges}
          className={cn(
            "rounded-full bg-button-background px-8 py-3 text-base font-semibold text-button-foreground transition-colors hover:bg-button-hover-background",
            saving && "opacity-80"
          )}
        >
          {saving ? "Saving..." : "Save changes"}
        </Button>
        {hasChanges ? (
          <span className="text-sm text-muted-foreground">You have unsaved changes.</span>
        ) : null}
      </div>

      {status.kind === "success" ? (
        <p
          className={cn(
            "text-sm font-semibold",
            layout === "dialog" ? "text-foreground" : "text-foreground"
          )}
        >
          {status.message}
        </p>
      ) : null}
      {status.kind === "error" ? (
        <p className="text-sm font-semibold text-destructive">{status.message}</p>
      ) : null}
    </form>
  )
}
