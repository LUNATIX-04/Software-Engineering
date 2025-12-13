import {format, parseISO} from "date-fns";
import type {FC} from "react";
import Image from "next/image";
import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {cn} from "@/lib/utils";
import {useCalendar} from "@/modules/components/calendar/contexts/calendar-context";
import {TaskDetailsDialog} from "@/modules/components/calendar/dialogs/task-details-dialog";
import {
	formatTime,
	getBgColor,
	getColorClass,
	getEventAccentStyles,
	getEventsForMonth,
	getFirstLetters,
	toCapitalize,
} from "@/modules/components/calendar/helpers";
import {EventBullet} from "@/modules/components/calendar/views/month-view/event-bullet";

const sanitizeCyValue = (value: string) =>
	value.replace(/[^a-zA-Z0-9-_]/g, "-");

export const AgendaEvents: FC = () => {
    const {events, use24HourFormat, badgeVariant, agendaModeGroupBy, selectedDate} =
        useCalendar();

    const monthEvents = getEventsForMonth(events, selectedDate)

    const agendaEvents = Object.groupBy(monthEvents, (event) => {
        return agendaModeGroupBy === "date"
            ? format(parseISO(event.startDate), "yyyy-MM-dd")
            : event.color;
    });

    const groupedAndSortedEvents = Object.entries(agendaEvents).sort(
        (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime(),
    );

    return (
        <Command
            className="py-4 h-[80vh] bg-transparent"
            data-cy="project-calendar-agenda-view"
        >
            <div className="mb-4 mx-4">
                <CommandInput
                    placeholder="Type a command or search..."
                    data-cy="calendar-agenda-search-input"
                />
            </div>
            <CommandList className="max-h-max px-3 border-t">
                {groupedAndSortedEvents.map(([date, groupedEvents]) => {
                    const groupCyId = sanitizeCyValue(date);

                    return (
                        <CommandGroup
                            key={date}
                            data-cy={`calendar-agenda-group-${groupCyId}`}
                            heading={
                                agendaModeGroupBy === "date"
                                    ? format(parseISO(date), "EEEE, MMMM d, yyyy")
                                    : toCapitalize(groupedEvents![0].color)
                            }
                        >
                            {groupedEvents!.map((event) => {
                                const eventCyId = sanitizeCyValue(
                                    (event.taskId ?? event.id).toString(),
                                );

                                return (
                                    <CommandItem
                                        key={event.id}
                                        data-cy={`calendar-agenda-task-${eventCyId}`}
                                        className={cn(
                                            "mb-2 p-4 border rounded-md data-[selected=true]:bg-bg transition-all data-[selected=true]:text-none hover:cursor-pointer",
                                            {
                                                [getColorClass(event.color)]:
                                                    badgeVariant === "colored" && !event.accentColor,
                                                "hover:bg-zinc-200 dark:hover:bg-gray-900":
                                                    badgeVariant === "dot",
                                                "hover:opacity-60": badgeVariant === "colored",
                                            },
                                        )}
                                        style={
                                            badgeVariant === "colored"
                                                ? getEventAccentStyles(event, { text: true })
                                                : undefined
                                        }
                                    >
                                        <TaskDetailsDialog event={event}>
                                            <div className="w-full flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-2">
                                                    {badgeVariant === "dot" ? (
                                                        <EventBullet
                                                            color={event.color}
                                                            accentColor={event.accentColor ?? undefined}
                                                        />
                                                    ) : (
                                                        <Avatar>
                                                            {event.user.picturePath ? (
                                                                <Image
                                                                    src={event.user.picturePath}
                                                                    alt={event.user.name}
                                                                    width={32}
                                                                    height={32}
                                                                    className="size-full rounded-full object-cover"
                                                                    data-cy="agenda-event-avatar"
                                                                />
                                                            ) : (
                                                                <AvatarFallback
                                                                    className={getBgColor(event.color)}
                                                                    style={
                                                                        event.accentColor
                                                                            ? {
                                                                                  backgroundColor: event.accentColor,
                                                                                  color: event.accentTextColor ?? undefined,
                                                                              }
                                                                            : undefined
                                                                    }
                                                                >
                                                                    {getFirstLetters(event.title)}
                                                                </AvatarFallback>
                                                            )}
                                                        </Avatar>
                                                    )}
                                                    <div className="flex flex-col">
                                                        <p
                                                            className={cn({
                                                                "font-medium": badgeVariant === "dot",
                                                                "text-foreground": badgeVariant === "dot",
                                                            })}
                                                        >
                                                            {event.title}
                                                        </p>
                                                        <p className="text-muted-foreground text-sm line-clamp-1 text-ellipsis md:text-clip w-1/3">
                                                            {event.description}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="w-40 flex justify-center items-center gap-1">
                                                    {agendaModeGroupBy === "date" ? (
                                                        <>
                                                            <p className="text-sm">
                                                                {formatTime(event.startDate, use24HourFormat)}
                                                            </p>
                                                            <span className="text-muted-foreground">-</span>
                                                            <p className="text-sm">
                                                                {formatTime(event.endDate, use24HourFormat)}
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <p className="text-sm">
                                                                {format(event.startDate, "MM/dd/yyyy")}
                                                            </p>
                                                            <span className="text-sm">at</span>
                                                            <p className="text-sm">
                                                                {formatTime(event.startDate, use24HourFormat)}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </TaskDetailsDialog>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    );
                })}
                <CommandEmpty data-cy="calendar-agenda-empty-state">No results found.</CommandEmpty>
            </CommandList>
        </Command>
    );
};
