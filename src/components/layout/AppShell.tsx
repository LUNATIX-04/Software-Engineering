"use client"

import { ReactNode, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import { User } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { cn } from "@/lib/utils"

type AppShellProps = {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isHomepage = pathname === "/Homepage"
  const isProjects = pathname?.startsWith("/Projects") ?? false
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)

  const activeAccount: { avatarPath?: string } | null = {
    avatarPath: "/api/image?path=Account_Test/Person1.png", // Just Test
  }

  const avatar = activeAccount?.avatarPath ? (
    <Image
      src={activeAccount.avatarPath}
      alt="User avatar"
      width={36}
      height={36}
      className="size-full rounded-full object-cover"
      priority
    />
  ) : (
    <User className="size-7 text-button-foreground-on-nav" />
  )

  const header = (() => {
    if (isHomepage) {
      return (
        <header className="bg-primary px-[clamp(1.5rem,1vw,3rem)] py-[clamp(0.6rem,1vh,1rem)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-[clamp(1.5rem,7vw,7rem)]">
              <h1 className="text-primary-foreground text-3xl font-bold leading-none select-none" draggable={false}>
                ASAP
              </h1>
            </div>
            <Button
              variant="secondary"
              className="bg-button-background-on-nav text-button-foreground-on-nav hover:bg-button-hover-background-on-nav rounded-full ml-40 px-[clamp(2.5rem,5vw,4rem)] py-[clamp(0.5rem,1.6vh,0.85rem)] text-[clamp(1rem,2.1vw,1.15rem)] font-semibold"
            >
              Login
            </Button>
          </div>
        </header>
      )
    }

    if (isProjects) {
      return (
        <header className="bg-primary px-[clamp(1.5rem,1vw,3rem)] py-[clamp(0.6rem,1vh,1rem)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-[clamp(1.5rem,7vw,7rem)]">
              <h1 className="text-primary-foreground text-3xl font-bold leading-none select-none" draggable={false}>
                ASAP
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu onOpenChange={setAccountMenuOpen}>
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
                  <DropdownMenuItem className="text-button-foreground-on-nav hover:bg-button-hover-background-on-nav rounded-xl py-3 px-4 cursor-pointer text-base">
                    Manage my Account
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-button-foreground-on-nav hover:bg-button-hover-background-on-nav rounded-xl py-3 px-4 cursor-pointer text-base"
                    onSelect={() => {
                      setAccountMenuOpen(false)
                      router.push("/Homepage")
                    }}
                  >
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
      )
    }

    return null
  })()

  const mainClassName = isHomepage
    ? "flex-1 bg-background flex items-center justify-center"
    : "flex-1 bg-background"

  return (
    <div className="min-h-dvh flex flex-col overflow-hidden">
      {header}
      <main className={mainClassName}>{children}</main>
      <footer className="bg-footer-bar py-[clamp(1.5rem,1vh,1rem)]">
        <div className="max-w-7xl mx-auto px-6" />
      </footer>
    </div>
  )
}
