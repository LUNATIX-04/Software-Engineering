import Link from "next/link"

import { SettingsForm } from "@/components/settings/SettingsForm"

export default function AccountSettingsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="rounded-[2.5rem] border-2 border-primary/30 bg-card-project px-8 py-10 shadow-[0_4px_2px_0.15px_rgba(0,1,0,0.15)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="mt-2 text-base text-foreground/70">
              Personalize how projects look and choose a theme that matches your vibe.
            </p>
          </div>
          <Link
            href="/account"
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            ← Back to account
          </Link>
        </div>

        <div className="mt-10">
          <SettingsForm layout="page" />
        </div>
      </div>
    </div>
  )
}
