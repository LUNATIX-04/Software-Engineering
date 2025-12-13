"use client"

import { ReactNode } from "react"
import { LogOut } from "lucide-react"
import { Settings as SettingsIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DropdownMenuLabel } from "@radix-ui/react-dropdown-menu"

import { cn } from "@/lib/utils"
import type { Session } from "@supabase/supabase-js"

import type { SignOutRedirect } from "./types"

export type AccountDropdownProps = {
  accountMenuOpen: boolean
  authenticatedUser: Session["user"] | null
  avatar: ReactNode
  handleSignOut: (options?: { redirect?: SignOutRedirect }) => void
  setAccountMenuOpen: (open: boolean) => void
  setSettingsDialogOpen: (open: boolean) => void
  signOutRedirect: SignOutRedirect
}

export function AccountDropdown({
  accountMenuOpen,
  authenticatedUser,
  avatar,
  handleSignOut,
  setAccountMenuOpen,
  setSettingsDialogOpen,
  signOutRedirect,
}: AccountDropdownProps) {
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
        className="bg-button-background-on-nav text-foreground border-none rounded-2xl p-2"
      >
        <DropdownMenuLabel className="text-primary rounded-xl py-3 px-4 cursor-text text-base font-semibold">
          {authenticatedUser.email ?? "My Account"}
        </DropdownMenuLabel>
        <DropdownMenuItem
          data-cy="account-menu-settings"
          className="text-foreground hover:bg-button-hover-background-on-nav rounded-xl py-3 px-4 cursor-pointer text-base"
          onSelect={() => {
            setAccountMenuOpen(false)
            setSettingsDialogOpen(true)
          }}
        >
          <span className="inline-flex items-center gap-2">
            <SettingsIcon className="size-4" />
            Account Settings
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          data-cy="account-menu-signout"
          className="rounded-xl py-3 px-4 cursor-pointer text-base text-destructive transition hover:bg-destructive/10 focus:bg-destructive/10"
          onSelect={() => handleSignOut({ redirect: signOutRedirect })}
        >
          <span className="inline-flex items-center gap-2 font-semibold text-destructive">
            <LogOut className="size-4 text-destructive" />
            Log out
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
