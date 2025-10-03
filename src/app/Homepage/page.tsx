"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"

export default function Homepage() {
  return (
    <div className="max-w-[min(90rem,90vw)] w-full mx-auto px-[clamp(1.5rem,2vw,4rem)] py-[clamp(2rem,9vh,6rem)]">
      <div className="grid md:grid-cols-2 gap-[clamp(2rem,5vw,3rem)] items-center">
        <div className="space-y-8">
          <h2 className="text-[clamp(0.5rem,4vw,5rem)] text-foreground leading-tight">
            <span className="font-bold">Create your Project</span>
            <br />
            <span className="text-[clamp(0.3rem,3vw,2.5rem)] font-semibold">to WORK ASAP!</span>
          </h2>
          <div className="pl-[clamp(0.75rem,4vw,2.5rem)]">
            <Button
              onClick={() => (window.location.href = "/Projects")}
              className="bg-button-background hover:bg-button-hover-background text-button-foreground rounded-full px-[clamp(1.5rem,3vw,3.8rem)] py-[clamp(0.75rem,4vh,2.25rem)] text-[clamp(0.2rem,3vw,1.35rem)] font-semibold"
            >
              Get Started
            </Button>
          </div>
        </div>

        <div className="flex justify-center" onContextMenu={(event) => event.preventDefault()}>
          <div className="relative w-full max-w-[min(28rem,60vw)] max-h-[55vh] aspect-square select-none">
            <Image
              src="/imageWeb/Homepage/logo.png"
              alt="Project management illustration showing to-do lists, charts, and productivity tools"
              fill
              draggable={false}
              className="object-contain select-none"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  )
}
