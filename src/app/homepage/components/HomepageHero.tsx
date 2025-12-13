"use client"

import { Button } from "@/components/ui/button"
import type { CSSProperties, MouseEventHandler } from "react"

export type HomepageHeroProps = {
  onGetStarted: MouseEventHandler<HTMLButtonElement>
}

export function HomepageHero({ onGetStarted }: HomepageHeroProps) {
  return (
    <div className="space-y-8" data-animate="fade-up">
      <h2 className="text-[clamp(0.5rem,4vw,5rem)] text-foreground leading-tight">
        <span className="font-bold">Create your Project</span>
        <br />
        <span className="text-[clamp(0.3rem,3vw,2.5rem)] font-semibold">to WORK ASAP!</span>
      </h2>
      <div
        className="pl-[clamp(0.75rem,4vw,2.5rem)]"
        data-animate="pop"
        style={{ ["--animate-delay" as keyof CSSProperties]: "120ms" }}
      >
        <Button
          onClick={onGetStarted}
          className="bg-button-background hover:bg-button-hover-background text-button-foreground rounded-full px-[clamp(1.5rem,3vw,3.8rem)] py-[clamp(0.75rem,4vh,2.25rem)] text-[clamp(0.2rem,3vw,1.35rem)] font-semibold"
          data-cy="get-started"
        >
          Get Started
        </Button>
      </div>
    </div>
  )
}
