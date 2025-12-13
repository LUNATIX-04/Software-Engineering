"use client"

import { createContext, useContext } from "react"

import type { ProfileSummary } from "@/types/preferences"

export type PreferencesContextValue = {
  profile: ProfileSummary | null
  loading: boolean
  refreshProfile: () => Promise<void>
  updateProfileLocally: (update: Partial<ProfileSummary>) => void
  timezone: string | null
}

export const PreferencesContext = createContext<PreferencesContextValue>({
  profile: null,
  loading: false,
  refreshProfile: async () => {},
  updateProfileLocally: () => {},
  timezone: null,
})

export function usePreferences() {
  return useContext(PreferencesContext)
}
