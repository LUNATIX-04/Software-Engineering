"use client"

import { format, parseISO } from "date-fns"
import Link from "next/link"
import { Calendar, Clock, Text, User } from "lucide-react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useCalendar } from "@/modules/components/calendar/contexts/calendar-context"
import { formatTime } from "@/modules/components/calendar/helpers"
import type { IEvent } from "@/modules/components/calendar/interfaces"

interface TaskDetailsDialogProps {
  event: IEvent
  children: ReactNode
}

export function TaskDetailsDialog({ event, children }: TaskDetailsDialogProps) {
  const { use24HourFormat } = useCalendar()
  const startDate = event.startDate ? parseISO(event.startDate) : null
  const endDate = event.endDate ? parseISO(event.endDate) : null
  const startLabel = startDate ? format(startDate, "EEEE dd MMMM") : "—"
  const endLabel = endDate ? format(endDate, "EEEE dd MMMM") : "—"
  const linkHref =
    event.projectId && event.taskId ? `/projects/${event.projectId}/task/${event.taskId}` : null

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event.title}</DialogTitle>
          <DialogDescription>
            {event.description || "No additional details provided."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-4 p-4">
            <div className="flex items-start gap-2">
              <User className="mt-1 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Responsible</p>
                <p className="text-sm text-muted-foreground">{event.user.name}</p>
              </div>
            </div>

            {event.status ? (
              <div className="flex items-start gap-2">
                <Text className="mt-1 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <p className="text-sm text-muted-foreground">{event.status}</p>
                </div>
              </div>
            ) : null}

            <div className="flex items-start gap-2">
              <Calendar className="mt-1 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Start Date</p>
                <p className="text-sm text-muted-foreground">
                  {startLabel}
                  {event.startDate ? (
                    <>
                      <span className="mx-1">at</span>
                      {formatTime(event.startDate, use24HourFormat)}
                    </>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Clock className="mt-1 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Due Date</p>
                <p className="text-sm text-muted-foreground">
                  {endLabel}
                  {event.endDate ? (
                    <>
                      <span className="mx-1">at</span>
                      {formatTime(event.endDate, use24HourFormat)}
                    </>
                  ) : null}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex flex-wrap justify-end gap-2 px-4 pb-4">
          {linkHref && (
            <Button asChild>
              <Link href={linkHref}>View task</Link>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
