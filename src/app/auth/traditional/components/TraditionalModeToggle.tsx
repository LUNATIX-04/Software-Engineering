"use client"

export type TraditionalMode = "signIn" | "signUp"

export type TraditionalModeToggleProps = {
  isSignUp: boolean
  pending: boolean
  onModeChange: (mode: TraditionalMode) => void
}

export function TraditionalModeToggle({ isSignUp, pending, onModeChange }: TraditionalModeToggleProps) {
  return (
    <div className="inline-flex grid grid-cols-2 gap-2 rounded-full bg-muted p-1 text-xs font-semibold text-muted-foreground">
      <button
        type="button"
        onClick={() => onModeChange("signIn")}
        className={`rounded-full px-2 py-1 transition ${!isSignUp ? "bg-button-background text-button-foreground shadow" : ""}`}
        disabled={pending && !isSignUp}
        data-cy="auth-mode-sign-in"
      >
        Sign In
      </button>
      <button
        type="button"
        onClick={() => onModeChange("signUp")}
        className={`rounded-full px-2 py-1 transition ${isSignUp ? "bg-button-background text-button-foreground shadow" : ""}`}
        disabled={pending && isSignUp}
        data-cy="auth-mode-sign-up"
      >
        Sign Up
      </button>
    </div>
  )
}
