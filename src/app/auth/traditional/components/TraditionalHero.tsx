"use client"

export type TraditionalHeroProps = {
  highlights: readonly string[]
}

export function TraditionalHero({ highlights }: TraditionalHeroProps) {
  return (
    <div className="flex flex-col justify-center gap-[clamp(1.5rem,4vh,2.5rem)] text-primary-foreground">
      <div className="space-y-6">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-sm font-semibold uppercase tracking-[0.2em] opacity-90">
            Access Website
          </span>
          <h1 className="text-[clamp(2.1rem,5vw,3.75rem)] font-bold leading-tight">
            Sign in the classic way and jump back into ASAP.
          </h1>
          <p className="text-base/[1.8] opacity-90">
            Keep your projects moving, align the team, and land every deadline. Your ASAP workspace is only a few clicks away.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute inset-0 rounded-[2.5rem] bg-black/20 blur-3xl" />
        </div>

        <ul className="space-y-3 text-base font-medium">
          {highlights.map((highlight) => (
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
    </div>
  )
}
