"use client"

import type { DepartmentLayoutOption, ThemeOption } from "@/types/preferences"

export const SETTINGS_THEME_LABELS: Record<ThemeOption, string> = {
  standard: "Standard",
  blue: "Blue",
  dark: "Dark",
  red: "Red",
  green: "Green",
  yellow: "Yellow",
}

export const SETTINGS_DEPARTMENT_LABELS: Record<DepartmentLayoutOption, string> = {
  compact: "Compact chips",
  fullWidth: "Full-width chips",
}

export const SETTINGS_THEME_SWATCHES: Record<ThemeOption, string[]> = {
  standard: ["#907ad6", "#4f518c", "#f4effa"],
  blue: ["#2563eb", "#a5b4fc", "#fdfbff"],
  dark: ["#111827", "#6366f1", "#0ea5e9"],
  red: ["#e11d48", "#fecdd3", "#fff5f5"],
  green: ["#059669", "#34d399", "#ecfdf5"],
  yellow: ["#c89407", "#fcd34d", "#fef3c7"],
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
