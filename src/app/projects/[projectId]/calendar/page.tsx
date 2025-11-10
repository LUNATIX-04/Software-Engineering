import { Calendar } from "@/modules/components/calendar/calendar"

type ProjectCalendarFullPageProps = {
  params: {
    projectId: string
  }
}

export default function ProjectCalendarFullPage({
  params,
}: ProjectCalendarFullPageProps) {
  return (
    <main className="flex min-h-[calc(100vh-6.5rem)] w-full flex-col px-[clamp(1.75rem,3vw,2.5rem)] py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="overflow-hidden rounded-[2rem] border border-primary/30 bg-white/95 p-4 shadow-[0_25px_60px_rgba(63,52,120,0.25)]">
          <Calendar projectId={params.projectId} />
        </div>
      </div>
    </main>
  )
}
