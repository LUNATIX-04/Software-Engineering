"use client"

import type {
  DepartmentLayoutOption,
  ThemeOption,
} from "@/components/layout/AppShell"

export const SETTINGS_THEME_LABELS: Record<ThemeOption, string> = {
  standard: "Standard",
  light: "Light",
  dark: "Dark",
  red: "Red",
  blue: "Blue",
}

export const SETTINGS_DEPARTMENT_LABELS: Record<DepartmentLayoutOption, string> = {
  compact: "Compact chips",
  fullWidth: "Full-width chips",
}

export const SETTINGS_THEME_SWATCHES: Record<ThemeOption, string[]> = {
  standard: ["#907ad6", "#4f518c", "#f4effa"],
  light: ["#2563eb", "#a5b4fc", "#fdfbff"],
  dark: ["#111827", "#6366f1", "#0ea5e9"],
  red: ["#e11d48", "#fecdd3", "#fff5f5"],
  blue: ["#1d4ed8", "#38bdf8", "#e6f4ff"],
}

export const SETTINGS_MESSAGES = {
  mustBeLoggedIn: "You must be logged in to save your settings.",
  success: "Settings saved successfully.",
  genericError: "Unable to save settings. Please try again.",
  loading: "Loading settings…",
  signInRequired: "Please sign in to access your settings.",
}

export const SETTINGS_PLACEHOLDERS = {
  display: "Select Type Display",
  theme: "Select Theme",
}
