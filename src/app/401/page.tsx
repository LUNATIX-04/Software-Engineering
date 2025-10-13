"use client"

import { useEffect } from "react"
import Link from "next/link"
import { ShieldAlert } from "lucide-react"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { useAppShellLayout } from "@/components/layout/AppShell"

export default function UnauthorizedPage() {
  const { setHeaderVariant } = useAppShellLayout()
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname?.startsWith("/Projects")) {
      return
    }
    setHeaderVariant("minimal")
    return () => setHeaderVariant(null)
  }, [pathname, setHeaderVariant])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-[clamp(1.5rem,2vw,4rem)] py-[clamp(2rem,8vh,6rem)] text-center">
      <div className="inline-flex items-center gap-3 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
        <ShieldAlert className="size-5" />
        Error 401 · Sign in required
      </div>
      <h1 className="mt-8 text-balance text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-tight text-foreground">
        Let&apos;s get you back on track
      </h1>
      <p className="mt-4 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
        Your ASAP workspace is protected. Please sign in with your email to keep
        planning effortlessly.
      </p>
      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
        <Button asChild className="rounded-full px-8 py-3 text-base font-semibold">
          <Link href="/Homepage">Go to Homepage</Link>
        </Button>
      </div>
    </div>
  )
}
