"use client"

import Image from "next/image"
import type React from "react"

export function HomepageHeroImage() {
  return (
    <div
      className="flex justify-center"
      onContextMenu={(event) => event.preventDefault()}
      data-animate="fade-up"
      style={{ ["--animate-delay" as keyof React.CSSProperties]: "120ms" }}
    >
      <div className="relative w-full max-w-[min(28rem,60vw)] max-h-[55vh] aspect-square select-none">
        <Image
          src="/imageWeb/homepage/logo.png"
          alt="Project management illustration showing to-do lists, charts, and productivity tools"
          fill
          draggable={false}
          className="object-contain select-none"
          priority
          data-cy="homepage-hero-image"
        />
      </div>
    </div>
  )
}
