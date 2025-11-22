"use client"

export type DepartmentLayoutOption = "compact" | "fullWidth"
export type ThemeOption = "standard" | "blue" | "dark" | "red" | "green" | "yellow"

export type ProfileSummary = {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  bio: string | null
  lastSignIn: string | null
  departmentLayout: DepartmentLayoutOption
  theme: ThemeOption
  hasPassword: boolean
}
