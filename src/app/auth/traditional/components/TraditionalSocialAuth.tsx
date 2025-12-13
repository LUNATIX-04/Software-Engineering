"use client"

import { Button } from "@/components/ui/button"

export type TraditionalSocialAuthProps = {
  onGoogleSignIn: () => void
  disabled: boolean
}

export function TraditionalSocialAuth({ onGoogleSignIn, disabled }: TraditionalSocialAuthProps) {
  return (
    <div className="mt-[clamp(1.25rem,3vh,1.75rem)] space-y-4">
      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
        <span className="h-px flex-1 bg-muted" />
        or continue with
        <span className="h-px flex-1 bg-muted" />
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={onGoogleSignIn}
        disabled={disabled}
        className="h-12 w-full rounded-2xl border-primary/30 bg-white/90 text-base font-semibold text-card-foreground transition hover:border-primary hover:bg-white"
        data-cy="auth-google-signin"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5">
          <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true" role="img" focusable="false">
            <path fill="#EA4335" d="M23.5 12.3c0-.82-.07-1.42-.22-2.05H12v3.72h6.61c-.13.92-.83 2.31-2.38 3.24l-.02.13 3.46 2.66.24.02c2.24-2.07 3.54-5.12 3.54-8.94z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.96-1.06 7.95-2.88l-3.79-2.91c-1.02.66-2.39 1.12-4.16 1.12-3.18 0-5.87-2.07-6.83-4.94l-.12.01-3.71 2.84-.05.11C2.38 21.68 6.83 24 12 24z" />
            <path fill="#4A90E2" d="M5.17 14.39c-.25-.73-.39-1.51-.39-2.39s.14-1.66.38-2.39l-.01-.16-3.76-2.9-.12.05C.45 8.98 0 10.93 0 12c0 1.07.45 3.02 1.28 4.4l3.89-3z" />
            <path fill="#FBBC05" d="M12 4.73c2.25 0 3.76.97 4.62 1.78l3.37-3.3C17.94 1.19 15.24 0 12 0 6.83 0 2.38 2.32 1.28 7.6l3.88 2.98C6.13 6.8 8.82 4.73 12 4.73z" />
          </svg>
        </span>
        <span>Continue with Google</span>
      </Button>
    </div>
  )
}
