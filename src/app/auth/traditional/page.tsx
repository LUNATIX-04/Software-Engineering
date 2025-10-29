"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { Session } from "@supabase/supabase-js"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useNotifications } from "@/components/notifications/NotificationCenter"
import { getSupabaseBrowserClient } from "@/utils/supabase/client"
import { handleGoogleSignIn, useAppShellLayout } from "@/components/layout/AppShell"

const formSchema = z.object({
  email: z.string().email("Enter a valid email to continue."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  fullName: z
    .string()
    .trim()
    .max(120, "Name is a bit too long.")
    .optional(),
})

type FormValues = z.infer<typeof formSchema>

type TraditionalAuthResponse = {
  session?: Session | null
  requiresEmailConfirmation?: boolean
  error?: string
  errors?: Record<string, string[] | string>
}

const HERO_HIGHLIGHTS = [
  "Share tasks with your crew in seconds.",
  "Keep departments aligned with visual boards.",
  "Track deadlines, owners, and blockers in one view.",
] as const

export default function TraditionalAuthPage() {
  const router = useRouter()
  const { notify } = useNotifications()
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const { setHeaderVariant, setHeaderSpacing } = useAppShellLayout()
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn")
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    setHeaderVariant("minimal")
    setHeaderSpacing("none")
    return () => {
      setHeaderVariant(null)
      setHeaderSpacing("auto")
    }
  }, [setHeaderVariant, setHeaderSpacing])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
    },
  })

  const isSignUp = mode === "signUp"

  const syncSession = async (session: Session | null | undefined) => {
    if (!session) {
      await supabase.auth.getSession()
      return
    }
    await supabase.auth.setSession(session)
  }

  const handleSubmit = async (values: FormValues) => {
    setFormError(null)
    setPending(true)
    try {
      const body = {
        email: values.email,
        password: values.password,
        fullName: values.fullName?.trim(),
      }

      const endpoint = isSignUp
        ? "/api/auth/traditional/signup"
        : "/api/auth/traditional/login"

      if (isSignUp) {
        if (!body.fullName) {
          form.setError("fullName", { message: "Let us know what to call you." })
          setPending(false)
          return
        }
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      })

      const payload: TraditionalAuthResponse = await response
        .json()
        .catch(() => ({} as TraditionalAuthResponse))

      if (!response.ok) {
        if (payload?.errors && typeof payload.errors === "object") {
          const entries = Object.entries(payload.errors)
          entries.forEach(([field, messages]) => {
            if (
              field === "email" ||
              field === "password" ||
              field === "fullName"
            ) {
              const messageArray = Array.isArray(messages) ? messages : [messages]
              const message = messageArray.find(
                (item) => typeof item === "string" && item.trim().length > 0
              )
              if (message) {
                form.setError(field as keyof FormValues, { message })
              }
            }
          })
        }
        const errorMessage =
          typeof payload?.error === "string" && payload.error.trim().length > 0
            ? payload.error
            : "We couldn’t complete that request. Please try again."
        throw new Error(errorMessage)
      }

      await syncSession(payload?.session)

      if (isSignUp) {
        if (payload?.requiresEmailConfirmation) {
          notify({
            title: "Confirm your email",
            description: "Check your inbox to activate your ASAP account.",
            variant: "info",
            durationMs: 4000,
          })
          setMode("signIn")
          form.reset({
            email: values.email,
            password: "",
            fullName: values.fullName?.trim(),
          })
        } else {
          notify({
            title: "Account created",
            description: "Welcome to ASAP! Redirecting you to your workspace.",
            variant: "success",
          })
          router.push("/projects")
        }
        return
      }

      notify({
        title: "You are in!",
        description: "Let’s build something awesome together.",
        variant: "success",
      })
      router.push("/projects")
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Something went wrong while talking to ASAP. Try again."
      setFormError(message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="relative isolate flex min-h-[calc(100dvh-4.5rem)] items-stretch justify-center overflow-hidden bg-gradient-to-br from-primary via-primary-soft to-secondary px-[clamp(1.5rem,6vw,4rem)] pb-[clamp(2rem,8vh,5rem)] pt-[clamp(4.5rem,12vh,6.5rem)]">
      <div className="absolute right-[8%] top-10 size-48 rounded-full bg-white/20 blur-3xl" />
      <div className="absolute left-[12%] bottom-10 size-56 rounded-[45%] bg-accent/30 blur-3xl" />
      <div className="relative z-10 grid w-full max-w-6xl items-start gap-[clamp(2rem,6vw,4rem)] lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col justify-center gap-[clamp(1.5rem,4vh,2.5rem)] text-primary-foreground">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-sm font-semibold uppercase tracking-[0.2em] opacity-90">
              Traditional access
            </span>
            <h1 className="text-[clamp(2.1rem,5vw,3.75rem)] font-bold leading-tight">
              Sign in the classic way and jump back into ASAP.
            </h1>
            <p className="text-base/[1.8] opacity-90">
              Keep your projects moving, align the team, and land every deadline. Your ASAP
              workspace is only a few clicks away.
            </p>
          </div>
          <ul className="space-y-3 text-base font-medium">
            {HERO_HIGHLIGHTS.map((highlight) => (
              <li
                key={highlight}
                className="flex items-start gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm"
              >
                <span className="mt-[0.35rem] inline-flex size-3 rounded-full bg-primary-foreground shadow-[0_0_0_4px_rgba(244,239,250,0.35)]" />
                <span className="leading-relaxed opacity-95">{highlight}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center">
          <div className="w-full rounded-[2.5rem] border border-white/40 bg-card/90 pt-[clamp(1.4rem,1vw,2.75rem)] px-[clamp(1.75rem,4vw,2.75rem)] pb-[clamp(1.75rem,4vw,2.75rem)] shadow-[0_30px_80px_-20px_rgba(44,42,74,0.35)] backdrop-blur-md">
            <div className="flex items-center justify-between ">
              <div>
                <h2 className="text-[clamp(1.6rem,3.2vw,2.2rem)] font-semibold text-card-foreground">
                  {isSignUp ? "Welcome!" : "Welcome!"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isSignUp
                    ? "Fill in your details to launch your ASAP space."
                    : "Sign in with your email and pick up where you left off."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-full bg-muted p-1 text-xs font-semibold text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setMode("signIn")}
                  className={`rounded-full px-3 py-1 transition ${
                    !isSignUp ? "bg-button-background text-button-foreground shadow" : ""
                  }`}
                  disabled={pending && !isSignUp}
                  data-cy="auth-mode-sign-in"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signUp")}
                  className={`rounded-full px-3 py-1 transition ${
                    isSignUp ? "bg-button-background text-button-foreground shadow" : ""
                  }`}
                  disabled={pending && isSignUp}
                  data-cy="auth-mode-sign-up"
                >
                  Sign Up
                </button>
              </div>
            </div>

            <div className="mt-6">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="space-y-[clamp(1rem,3vh,1.5rem)]"
                >
                  {isSignUp ? (
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-card-foreground">
                            Full name
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Sasiwimon Thammasat"
                              disabled={pending}
                              className="h-12 rounded-2xl border border-primary/20 bg-white/80 text-base"
                              data-cy="auth-fullname-input"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-card-foreground">
                          Email
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            autoComplete="email"
                            placeholder="you@university.edu"
                            disabled={pending}
                            className="h-12 rounded-2xl border border-primary/20 bg-white/80 text-base"
                            data-cy="auth-email-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-card-foreground">
                          Password
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            autoComplete={isSignUp ? "new-password" : "current-password"}
                            placeholder="At least 6 characters"
                            disabled={pending}
                            className="h-12 rounded-2xl border border-primary/20 bg-white/80 text-base"
                            data-cy="auth-password-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {formError ? (
                    <p className="text-sm font-semibold text-destructive">{formError}</p>
                  ) : null}

                  <Button
                    type="submit"
                    className="h-12 w-full rounded-2xl bg-button-background text-lg font-semibold text-button-foreground transition hover:bg-button-hover-background"
                    disabled={pending}
                    data-cy="auth-submit"
                  >
                    {pending
                      ? isSignUp
                        ? "Creating your space..."
                        : "Signing you in..."
                      : isSignUp
                        ? "Create account"
                        : "Sign in"}
                  </Button>
                </form>
              </Form>
            </div>

            <div className="mt-[clamp(1.25rem,3vh,1.75rem)] space-y-4">
              <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                <span className="h-px flex-1 bg-muted" />
                or continue with
                <span className="h-px flex-1 bg-muted" />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={pending}
                className="h-12 w-full rounded-2xl border-primary/30 bg-white/90 text-base font-semibold text-card-foreground transition hover:border-primary hover:bg-white"
                data-cy="auth-google-signin"
              >
                Continue with Google
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Prefer the fast lane? Use your Google account to jump right into ASAP.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
