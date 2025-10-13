"use client"

import { ReactNode, SetStateAction, useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import { User as UserIcon } from "lucide-react"
import type { Session } from "@supabase/supabase-js"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { cn } from "@/lib/utils"
import { getSupabaseBrowserClient } from "@/utils/supabase/client"
import { DropdownMenuLabel } from "@radix-ui/react-dropdown-menu"

type AppShellProps = {
  children: ReactNode
}

type SignOutRedirect = "homepage" | "google" | "none"

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isHomepage = pathname === "/Homepage"
  const isProjects = pathname?.startsWith("/Projects") ?? false
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (!isMounted) return
      setSession(data.session ?? null)
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, nextSession: SetStateAction<Session | null>) => {
      setSession(nextSession)
      setAuthLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleGoogleSignIn = useCallback(async () => {
    setAuthLoading(true)
    const {
      data: { url },
      error,
    } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      console.error("Failed to sign in with Google", error)
      setAuthLoading(false)
      return
    }

    if (url) {
      window.location.assign(url)
    }
  }, [supabase])

  const handleSignOut = useCallback(async (options?: { redirect?: SignOutRedirect }) => {
    setAuthLoading(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error("Failed to sign out", error)
      setAuthLoading(false)
      return
    }
    setAccountMenuOpen(false)
    const redirect = options?.redirect ?? "homepage"
    if (redirect === "google") {
      await handleGoogleSignIn()
      return
    }
    setAuthLoading(false)
    if (redirect === "homepage") {
      router.push("/Homepage")
    }
  }, [handleGoogleSignIn, router, supabase])

  const handleLogoClick = useCallback(() => {
    if (isHomepage) {
      return
    }
    router.push("/Homepage")
  }, [isHomepage, router])

  const authenticatedUser = session?.user ?? null
  const avatarUrl =
    (authenticatedUser?.user_metadata?.avatar_url as string | undefined) ?? undefined

  const avatar = authenticatedUser ? (
    avatarUrl ? (
      <Image
        src={avatarUrl}
        alt="User avatar"
        width={36}
        height={36}
        className="size-full rounded-full object-cover"
        priority
      />
    ) : (
      <div className="flex size-full items-center justify-center rounded-full bg-button-background-on-nav text-button-foreground-on-nav text-sm font-semibold">
        {authenticatedUser.email?.[0]?.toUpperCase() ?? "U"}
      </div>
    )
  ) : (
    <UserIcon className="size-7 text-button-foreground-on-nav" />
  )

  const renderAccountDropdown = (redirect: SignOutRedirect) => {
    if (!authenticatedUser) {
      return null
    }

    return (
      <DropdownMenu modal={false} onOpenChange={setAccountMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            className={cn(
              "bg-button-background-on-nav hover:bg-button-hover-background-on-nav active:bg-button-hover-background-on-nav rounded-full size-9 p-0 transition-colors select-none",
              accountMenuOpen && "ring-2 ring-button-foreground-on-nav/40"
            )}
            aria-pressed={accountMenuOpen}
          >
            {avatar}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-button-background-on-nav text-button-foreground-on-nav border-none rounded-2xl p-2"
        >
          <DropdownMenuLabel className="text-button-foreground-on-nav rounded-xl py-3 px-4 cursor-text text-base">
            {authenticatedUser.email ?? "My Account"}
          </DropdownMenuLabel>
          <DropdownMenuItem className="text-button-foreground-on-nav hover:bg-button-hover-background-on-nav rounded-xl py-3 px-4 cursor-pointer text-base">
            Manage my Account
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-button-foreground-on-nav hover:bg-button-hover-background-on-nav rounded-xl py-3 px-4 cursor-pointer text-base"
            onSelect={() => handleSignOut({ redirect })}
          >
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const header = (() => {
    if (isHomepage) {
      return (
        <header className="fixed inset-x-0 top-0 z-50 bg-primary px-[clamp(1.5rem,1vw,3rem)] py-[clamp(0.6rem,1vh,1rem)] ">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-[clamp(1.5rem,7vw,7rem)]">
              <button
                type="button"
                onClick={handleLogoClick}
                disabled={isHomepage}
                className={cn(
                  "rounded-full bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-button-foreground-on-nav/40",
                  isHomepage ? "cursor-default" : "cursor-pointer"
                )}
                aria-label={isHomepage ? "ASAP" : "Go to homepage"}
              >
                <span
                  className="text-primary-foreground text-3xl font-bold leading-none select-none"
                  draggable={false}
                  role="heading"
                  aria-level={1}
                >
                  ASAP
                </span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              {authenticatedUser ? (
                renderAccountDropdown("google")
              ) : (
                <Button
                  variant="secondary"
                  className="bg-button-background-on-nav text-button-foreground-on-nav hover:bg-button-hover-background-on-nav rounded-full px-[clamp(2.5rem,5vw,4rem)] py-[clamp(0.5rem,1.6vh,0.85rem)] text-[clamp(1rem,2.1vw,1.15rem)] font-semibold"
                  onClick={handleGoogleSignIn}
                  disabled={authLoading}
                >
                  {authLoading ? "Loading..." : "Login"}
                </Button>
              )}
            </div>
          </div>
        </header>
      )
    }

    if (isProjects) {
      return (
        <header className="fixed inset-x-0 top-0 z-50 bg-primary px-[clamp(1.5rem,1vw,3rem)] py-[clamp(0.6rem,1vh,1rem)] ">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-[clamp(1.5rem,7vw,7rem)]">
              <button
                type="button"
                onClick={handleLogoClick}
                disabled={isHomepage}
                className={cn(
                  "rounded-full bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-button-foreground-on-nav/40",
                  isHomepage ? "cursor-default" : "cursor-pointer"
                )}
                aria-label={isHomepage ? "ASAP" : "Go to homepage"}
              >
                <span
                  className="text-primary-foreground text-3xl font-bold leading-none select-none"
                  draggable={false}
                  role="heading"
                  aria-level={1}
                >
                  ASAP
                </span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              {authenticatedUser ? (
                renderAccountDropdown("homepage")
              ) : (
                <Button
                  variant="secondary"
                  className="bg-button-background-on-nav text-button-foreground-on-nav hover:bg-button-hover-background-on-nav rounded-full px-6 py-2 text-base font-semibold"
                  onClick={handleGoogleSignIn}
                  disabled={authLoading}
                >
                  {authLoading ? "Loading..." : "Login"}
                </Button>
              )}
            </div>
          </div>
        </header>
      )
    }

    return null
  })()

  const hasHeader = Boolean(header)

  const mainClassName = cn(
    "flex-1 bg-background",
    hasHeader && "pt-[clamp(4.5rem,12vh,6rem)]",
    isHomepage && "flex items-center justify-center"
  )

  return (
    <div className="min-h-dvh flex flex-col overflow-x-hidden">
      {header}
      <main className={mainClassName}>{children}</main>
      <footer className="bg-footer-bar py-[clamp(1.5rem,1vh,1rem)]">
        <div className="max-w-7xl mx-auto px-6" />
      </footer>
    </div>
  )
}
