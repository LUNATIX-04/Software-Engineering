"use client"

import { FormEvent, useEffect, useState } from "react"

import { usePreferences } from "@/contexts/preferences"
import { useNotifications } from "@/components/notifications/Notification"
import type { DepartmentLayoutOption, ThemeOption } from "@/types/preferences"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { loadTooltipPreference, setTooltipPreference, TOOLTIP_PREF_EVENT } from "@/components/ui/tooltip"

type StatusState =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }

const themeLabels: Record<ThemeOption, string> = {
  standard: "Standard",
  blue: "Blue",
  dark: "Dark",
  red: "Red",
  green: "Green",
  yellow: "Yellow",
}

const departmentLabels: Record<DepartmentLayoutOption, string> = {
  compact: "Compact chips",
  fullWidth: "Full-width chips",
}

const themeSwatches: Record<ThemeOption, string[]> = {
  standard: ["#907ad6", "#c6b6f2", "#f4effa"],
  blue: ["#2563eb", "#93c5fd", "#fdfbff"],
  dark: ["#0b1220", "#1f2937", "#4b5563"],
  red: ["#e11d48", "#fda4af", "#fff5f5"],
  green: ["#059669", "#34d399", "#ecfdf5"],
  yellow: ["#c89407", "#fcd34d", "#fef3c7"],
}

const themeOptions: ThemeOption[] = ["standard", "blue", "dark", "red", "green", "yellow"]

export type SettingsFormProps = {
  layout?: "page" | "dialog"
  onSaved?: () => void
}

export function SettingsForm({ layout = "page", onSaved }: SettingsFormProps) {
  const { profile, loading, refreshProfile, updateProfileLocally } = usePreferences()
  const { notify } = useNotifications()

  const [departmentLayout, setDepartmentLayout] = useState<DepartmentLayoutOption | null>(null)
  const [theme, setTheme] = useState<ThemeOption | null>(null)
  const [initialTooltipsEnabled, setInitialTooltipsEnabled] = useState<boolean>(() => loadTooltipPreference())
  const [tooltipsEnabled, setTooltipsEnabled] = useState<boolean>(() => loadTooltipPreference())
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<StatusState>({ kind: "idle" })

  useEffect(() => {
    if (profile) {
      setDepartmentLayout(profile.departmentLayout)
      setTheme(profile.theme)
    }
  }, [profile])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    const handlePreferenceChange = () => {
      const next = loadTooltipPreference()
      setInitialTooltipsEnabled(next)
      setTooltipsEnabled(next)
    }
    window.addEventListener(TOOLTIP_PREF_EVENT, handlePreferenceChange)
    return () => window.removeEventListener(TOOLTIP_PREF_EVENT, handlePreferenceChange)
  }, [])

  const hasChanges =
    !!profile &&
    departmentLayout !== null &&
    theme !== null &&
    (profile.departmentLayout !== departmentLayout ||
      profile.theme !== theme ||
      tooltipsEnabled !== initialTooltipsEnabled)

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
      updateProfileLocally({ departmentLayout, theme })
      await refreshProfile()
      setTooltipPreference(tooltipsEnabled)
      setInitialTooltipsEnabled(tooltipsEnabled)

      //setStatus({ kind: "success", message: "Settings saved successfully." })
      notify({
        title: "Settings saved successfully.",
        description: "Your display preferences are stored on this device.",
        variant: "success",
      })
      onSaved?.()
    } catch (error) {
      console.error("Failed to save settings", error)
      /*setStatus({
        kind: "error",
        message: "Unable to save settings. Please try again.",
      })*/
       notify({
        title: "Settings saved successfully.",
        description: "Unable to save settings. Please try again.",
        variant: "destructive",
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
          <h2 className="text-xl font-semibold text-foreground">Chips UI</h2>
          <p className="text-sm text-foreground/70">
            Pick the chip style you want to see by default.
          </p>
        </header>
        <Select
          value={effectiveDepartmentLayout}
          onValueChange={(value) => setDepartmentLayout(value as DepartmentLayoutOption)}
        >
          <SelectTrigger
            className="settings-select-trigger w-full max-w-sm justify-between rounded-full border-2 px-5 py-3 text-base font-semibold"
            data-cy="settings-department-select"
          >
            <SelectValue placeholder="Select Type Display" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="compact" data-cy="settings-department-option-compact">
              {departmentLabels.compact}
            </SelectItem>
            <SelectItem value="fullWidth" data-cy="settings-department-option-fullWidth">
              {departmentLabels.fullWidth}
            </SelectItem>
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
          <SelectTrigger
            className="settings-select-trigger w-full max-w-sm justify-between rounded-full border-2 px-5 py-3 text-base font-semibold"
            data-cy="settings-theme-select"
          >
            <SelectValue placeholder="Select Theme" />
          </SelectTrigger>
          <SelectContent>
            {themeOptions.map((option) => (
              <SelectItem
                key={option}
                value={option}
                data-cy={`settings-theme-option-${option}`}
                className="settings-select-item flex items-center gap-3"
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    className="size-3.5 rounded-full border border-border shadow-[0_0_0_1px_rgba(0,0,0,0.04)]"
                    style={{ backgroundColor: themeSwatches[option]?.[0] ?? "#000000" }}
                  />
                  <span>{themeLabels[option]}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="settings-palette-preview flex flex-wrap items-center gap-3">
          {(themeSwatches[effectiveTheme] ?? themeSwatches.standard).map((color) => (
            <span
              key={color}
              className="settings-palette-swatch h-10 w-10 rounded-full border shadow-sm"
              style={{ backgroundColor: color }}
              aria-hidden
            />
          ))}
          <span className="settings-palette-label text-sm">
            {themeLabels[effectiveTheme]} palette preview
          </span>
        </div>
      </section>

      <section className="space-y-3">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Hints & Tooltips</h2>
            <p className="text-sm text-foreground/70">
              Toggle helper hints across the workspace.
            </p>
          </div>
          <Switch
            checked={tooltipsEnabled}
            onCheckedChange={(checked) => {
              setTooltipsEnabled(Boolean(checked))
            }}
            aria-label="Toggle tooltips"
            data-cy="settings-tooltips-toggle"
          />
        </header>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          disabled={saving || !hasChanges}
          className={cn(
            "rounded-full bg-button-background px-8 py-3 text-base font-semibold text-button-foreground transition-colors hover:bg-button-hover-background",
            saving && "opacity-80"
          )}
          data-cy="settings-save-button"
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
