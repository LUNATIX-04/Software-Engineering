"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { Session } from "@supabase/supabase-js"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import Image from "next/image"

import { getSupabaseBrowserClient } from "@/utils/supabase/client"
import { handleGoogleSignIn, useAppShellLayout } from "@/components/layout/AppShell"
import { useNotifications } from "@/components/notifications/Notification"

import { TraditionalHero } from "./components/TraditionalHero"
import { TraditionalMode, TraditionalModeToggle } from "./components/TraditionalModeToggle"
import { TraditionalAuthForm } from "./components/TraditionalAuthForm"
import { TraditionalSocialAuth } from "./components/TraditionalSocialAuth"
import { formSchema, type FormValues } from "./components/types"

const HERO_HIGHLIGHTS = [
  "Share tasks with your crew in seconds.",
  "Keep departments aligned with visual boards.",
  "Track deadlines, owners, and blockers in one view.",
] as const

type TraditionalAuthResponse = {
  session?: Session | null
  requiresEmailConfirmation?: boolean
  error?: string
  errors?: Record<string, string[] | string>
}

export default function TraditionalAuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { notify } = useNotifications()
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const { setHeaderVariant, setHeaderSpacing } = useAppShellLayout()
  const [mode, setMode] = useState<TraditionalMode>("signIn")
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const modeInitializedRef = useRef(false)

  const redirectTarget = useMemo(() => {
    const target = searchParams.get("redirectTo")
    if (!target) {
      return null
    }
    if (target.startsWith("/")) {
      return target
    }
    return `/${target.replace(/^\/?/, "")}`
  }, [searchParams])

  useEffect(() => {
    setHeaderVariant("minimal")
    setHeaderSpacing("none")
    return () => {
      setHeaderVariant(null)
      setHeaderSpacing("auto")
    }
  }, [setHeaderVariant, setHeaderSpacing])

  useEffect(() => {
    if (modeInitializedRef.current) {
      return
    }
    const modeParam = searchParams.get("mode")
    if (modeParam === "signUp" || modeParam === "signIn") {
      setMode(modeParam)
      modeInitializedRef.current = true
    } else {
      modeInitializedRef.current = true
    }
  }, [searchParams])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
    },
  })

  const isSignUp = mode === "signUp"

  useEffect(() => {
    setPasswordVisible(false)
  }, [mode])

  useEffect(() => {
    if (!isSignUp) {
      form.clearErrors("fullName")
    }
  }, [isSignUp, form])

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

      const payload = (await response
        .json()
        .catch(() => ({} as TraditionalAuthResponse))) as TraditionalAuthResponse

      if (!response.ok) {
        if (payload?.errors && typeof payload.errors === "object") {
          const entries = Object.entries(payload.errors)
          entries.forEach(([field, messages]) => {
            if (field === "email" || field === "password" || field === "fullName") {
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

      await syncSession(payload.session)

      if (isSignUp) {
        if (payload.requiresEmailConfirmation) {
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
          router.push(redirectTarget ?? "/projects")
        }
        return
      }

      notify({
        title: "You are in!",
        description: "Let’s build something awesome together.",
        variant: "success",
      })
      router.push(redirectTarget ?? "/projects")
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

  const handlePasswordToggle = () => {
    setPasswordVisible((prev) => !prev)
  }

  const handleModeChange = (selectedMode: TraditionalMode) => {
    setMode(selectedMode)
  }

  return (
    <div className="relative flex justify-center asap-scroll w-full min-h-[calc(100vh-6.3rem)] px-[clamp(3.25rem,4vw,3.25rem)] pt-3 w-full overflow-y-auto px-[clamp(1.5rem,5vw,4rem)] pt-6 mt-[3.25rem]">
      <div className="absolute right-[8%] top-10 size-48 rounded-full bg-white/20 blur-3xl" />
      <div className="absolute left-[12%] bottom-10 size-56 rounded-[45%] bg-accent/30 blur-3xl" />
      <div className="relative z-10 grid w-full max-w-6xl gap-x-[clamp(2rem,6vw,4rem)] lg:grid-cols-[1.1fr_1fr]">
        <div
          className="flex flex-col justify-center gap-[clamp(1.5rem,4vh,2.5rem)] text-primary-foreground"
          data-animate="fade-up"
          style={{ ["--animate-delay" as keyof CSSProperties]: "80ms" }}
        >
          <TraditionalHero highlights={HERO_HIGHLIGHTS} />
        </div>

        <div className="flex items-center">
          <div
            className="relative w-full min-h-[32rem] overflow-hidden rounded-[2.5rem] border border-white/40 bg-card/90 pt-[clamp(1.4rem,1vw,2.75rem)] px-[clamp(1.75rem,4vw,2.75rem)] pb-[clamp(1.75rem,4vw,2.75rem)] shadow-[0_30px_80px_-20px_rgba(44,42,74,0.35)] backdrop-blur-md transition-[min-height] duration-300"
            data-animate="pop"
            style={{ ["--animate-delay" as keyof CSSProperties]: "140ms" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[clamp(1.6rem,3.2vw,2.2rem)] font-semibold text-card-foreground">
                  Welcome!
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isSignUp
                    ? "Fill in your details to launch your ASAP space."
                    : "Sign in with your email to work your projects."}
                </p>
                {!isSignUp && (
                  <div className="pointer-events-none absolute left-1/2 translate-y-2 h-25 w-25 -translate-x-1/2 md:block">
                    <Image
                      src="/imageWeb/homepage/logo.png"
                      alt="ASAP project preview"
                      fill
                      className="object-cover opacity-80"
                      priority
                      data-cy="auth-preview-image"
                    />
                  </div>
                )}
              </div>
              <TraditionalModeToggle
                isSignUp={isSignUp}
                pending={pending}
                onModeChange={handleModeChange}
              />
            </div>

            <div className="mt-6">
              <TraditionalAuthForm
                form={form}
                isSignUp={isSignUp}
                pending={pending}
                passwordVisible={passwordVisible}
                formError={formError}
                onSubmit={handleSubmit}
                onTogglePassword={handlePasswordToggle}
              />
            </div>

            <TraditionalSocialAuth onGoogleSignIn={handleGoogleSignIn} disabled={pending} />
          </div>
        </div>
        <div aria-hidden className="h-8" />
      </div>
    </div>
  )
}
