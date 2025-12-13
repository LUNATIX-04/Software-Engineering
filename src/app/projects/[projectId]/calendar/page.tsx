"use client"

import { Calendar } from "@/modules/components/calendar/calendar"
import * as React from "react"
import BackButton from "@/components/navigation/BackButton"

type ProjectCalendarFullPageProps = {
  params: Promise<{
    projectId: string
  }>
}

export default function ProjectCalendarFullPage({
  params,
}: ProjectCalendarFullPageProps) {
  const { projectId } = React.use(params)

  return (
    <div
      className="asap-scroll page-fade w-full min-h-[calc(100vh-6.5rem)] px-[clamp(3.25rem,4vw,3.25rem)] pt-3"
      data-cy="project-calendar-full-page"
    >
      <div className="flex w-full flex-col items-start gap-4 lg:flex-row lg:items-start lg:gap-6">
        <BackButton dataCy="project-calendar-back-button" ariaLabel="Back to projects" />
        <div className="mx-auto mt-10 flex w-full max-w-full flex-1 flex-col gap-8 px-[clamp(1.5rem,3vw,3.5rem)] pb-10 page-slide">
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
