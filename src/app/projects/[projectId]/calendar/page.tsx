"use client"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/modules/components/calendar/calendar"
import { ArrowLeft } from "lucide-react"
import * as React from "react"
import { useCallback } from "react"
import { useRouter } from "next/navigation"

type ProjectCalendarFullPageProps = {
  params: Promise<{
    projectId: string
  }>
}

export default function ProjectCalendarFullPage({
  params,
}: ProjectCalendarFullPageProps) {
  const { projectId } = React.use(params)
  const router = useRouter()

  const handleBackClick = useCallback(() => {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back()
        return
      }
      router.push("/projects")
    }, [router])

  return (
    <div
      className="asap-scroll w-full min-h-[calc(100vh-6.5rem)] px-[clamp(3.25rem,4vw,3.25rem)] pt-3"
      data-cy="project-calendar-full-page"
    >
      <div className="flex w-full flex-col items-start gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="sticky top-1 z-10 -ml-3 flex flex-shrink-0 items-start justify-start lg:-mt-0">
          <Button
            type="button"
            variant="ghost"
            data-cy="project-calendar-back-button"
            onClick={handleBackClick}
            className="inline-flex size-12 items-center justify-center rounded-full border border-primary/20 bg-white text-primary shadow-sm transition hover:border-primary/40 hover:bg-primary/10 focus-visible:border-primary focus-visible:ring-0"
            aria-label="Back to projects"
          >
            <ArrowLeft className="size-6" aria-hidden="true" />
          </Button>
        </div>
        <div className="mx-auto mt-10 flex w-full max-w-full flex-1 flex-col gap-8 px-[clamp(1.5rem,3vw,3.5rem)] pb-10">
          <div
            className="w-full rounded-[2rem] border border-primary/30 bg-white/95 p-4 shadow-[0_5px_6px_rgba(63,52,120,0.25)]"
            data-cy="project-calendar-body-wrapper"
          >
            <Calendar projectId={projectId} />
          </div>
        </div>
      </div>
    </div>
  )
}
