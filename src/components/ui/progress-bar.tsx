"use client"

import { cn } from "@/lib/utils"

type ProgressBarProps = {
  className?: string
}

export function ProgressBar({ className }: ProgressBarProps) {
  return (
    <div
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-primary/10",
        className
      )}
      role="progressbar"
      aria-valuetext="Loading"
    >
      <div className="progress-bar-stripe" />
      <style jsx>{`
        .progress-bar-stripe {
          position: absolute;
          inset: 0;
          width: 60%;
          background: linear-gradient(
            90deg,
            color-mix(in srgb, var(--primary) 12%, transparent),
            color-mix(in srgb, var(--primary) 65%, transparent),
            color-mix(in srgb, var(--primary) 12%, transparent)
          );
          animation: progress-bar-slide 1.2s ease-in-out infinite;
          transform: translateX(-100%);
        }
        @keyframes progress-bar-slide {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  )
}
