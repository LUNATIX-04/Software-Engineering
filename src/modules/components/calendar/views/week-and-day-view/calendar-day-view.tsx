import { format, isWithinInterval, parseISO } from "date-fns";
import { Clock, User } from "lucide-react";
import { useEffect, useRef } from "react";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCalendar } from "@/modules/components/calendar/contexts/calendar-context";

import { DroppableArea } from "@/modules/components/calendar/dnd/droppable-area";
import { groupEvents } from "@/modules/components/calendar/helpers";
import type { IEvent } from "@/modules/components/calendar/interfaces";
import { CalendarTimeline } from "@/modules/components/calendar/views/week-and-day-view/calendar-time-line";
import { DayViewMultiDayEventsRow } from "@/modules/components/calendar/views/week-and-day-view/day-view-multi-day-events-row";
import { RenderGroupedEvents } from "@/modules/components/calendar/views/week-and-day-view/render-grouped-events";

interface IProps {
	singleDayEvents: IEvent[];
	multiDayEvents: IEvent[];
}

export function CalendarDayView({ singleDayEvents, multiDayEvents }: IProps) {
	const { selectedDate, setSelectedDate, users, use24HourFormat } =
		useCalendar();
	const scrollAreaRef = useRef<HTMLDivElement>(null);

	const hours = Array.from({ length: 24 }, (_, i) => i);

	useEffect(() => {
		const handleDragOver = (e: DragEvent) => {
			if (!scrollAreaRef.current) return;

			const scrollArea = scrollAreaRef.current;
			const rect = scrollArea.getBoundingClientRect();
			const scrollSpeed = 15;

			const scrollContainer =
				scrollArea.querySelector("[data-radix-scroll-area-viewport]") ||
				scrollArea;

			if (e.clientY < rect.top + 60) {
				scrollContainer.scrollTop -= scrollSpeed;
			}

			if (e.clientY > rect.bottom - 60) {
				scrollContainer.scrollTop += scrollSpeed;
			}
		};

		document.addEventListener("dragover", handleDragOver);
		return () => {
			document.removeEventListener("dragover", handleDragOver);
		};
	}, []);

	const getCurrentEvents = (events: IEvent[]) => {
		const now = new Date();

		return (
			events.filter((event) =>
				isWithinInterval(now, {
					start: parseISO(event.startDate),
					end: parseISO(event.endDate),
				}),
			) || []
		);
	};

	const currentEvents = getCurrentEvents(singleDayEvents);

	const dayEvents = singleDayEvents.filter((event) => {
		const eventDate = parseISO(event.startDate);
		return (
			eventDate.getDate() === selectedDate.getDate() &&
			eventDate.getMonth() === selectedDate.getMonth() &&
			eventDate.getFullYear() === selectedDate.getFullYear()
		);
	});

	const groupedEvents = groupEvents(dayEvents);

	return (
		<div className="flex w-full flex-col gap-4 lg:flex-row">
			<div className="flex w-full flex-1 flex-col gap-3 rounded-3xl border border-primary/40 bg-background">
				<div>
					<DayViewMultiDayEventsRow
						selectedDate={selectedDate}
						multiDayEvents={multiDayEvents}
					/>

					<div className="relative z-20 flex border-b">
						<div className="w-18" />
						<span className="flex-1 border-l py-2 text-center text-xs font-medium text-t-quaternary">
							{format(selectedDate, "EE")}{" "}
							<span className="font-semibold text-t-secondary">
								{format(selectedDate, "d")}
							</span>
						</span>
					</div>
				</div>

				<ScrollArea
					className="flex h-[700px] flex-1 overflow-hidden rounded-b-3xl"
					type="always"
					ref={scrollAreaRef}
				>
					<div className="flex w-full">
						<div className="relative w-18 border-r border-primary/20 bg-background/70">
							{hours.map((hour, index) => (
								<div key={hour} className="relative h-[96px]">
									<div className="absolute -top-3 right-2 flex h-6 items-center">
										{index !== 0 && (
											<span className="text-xs text-t-quaternary">
												{format(
													new Date().setHours(hour, 0, 0, 0),
													use24HourFormat ? "HH:00" : "h a",
												)}
											</span>
										)}
									</div>
								</div>
							))}
						</div>

						<div className="relative flex-1 border-l border-primary/20 bg-white">
							<div className="relative">
								{hours.map((hour, index) => (
									<div
										key={hour}
										className="relative h-[96px]"
									>
										{index !== 0 && (
											<div className="pointer-events-none absolute inset-x-0 top-0 border-b" />
										)}

										<DroppableArea
											date={selectedDate}
											hour={hour}
											minute={0}
											className="absolute inset-x-0 top-0 h-[48px]"
										>
											<div className="absolute inset-0 cursor-pointer transition-colors hover:bg-secondary" />
										</DroppableArea>

										<div className="pointer-events-none absolute inset-x-0 top-1/2 border-b border-dashed border-b-tertiary" />

										<DroppableArea
											date={selectedDate}
											hour={hour}
											minute={30}
											className="absolute inset-x-0 bottom-0 h-[48px]"
										>
											<div className="absolute inset-0 cursor-pointer transition-colors hover:bg-secondary" />
										</DroppableArea>
									</div>
								))}

								<RenderGroupedEvents
									groupedEvents={groupedEvents}
									day={selectedDate}
								/>
							</div>

							<CalendarTimeline />
						</div>
					</div>
				</ScrollArea>
			</div>

			<div className="hidden w-72 divide-y border-l md:block">
				<Calendar
					className="mx-auto w-fit bg-white calendar-no-past"
					mode="single"
					selected={selectedDate}
					onSelect={(date) => date && setSelectedDate(date)}
					initialFocus
					allowPastDates
				/>

				<div className="flex-1 space-y-3">
					{currentEvents.length > 0 ? (
						<div className="flex items-start gap-2 px-4 pt-4">
							<span className="relative mt-[5px] flex size-2.5">
								<span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75"></span>
								<span className="relative inline-flex size-2.5 rounded-full bg-green-600"></span>
							</span>

							<p className="text-sm font-semibold text-t-secondary">
								Happening now
							</p>
						</div>
					) : (
						<p className="p-4 text-center text-sm italic text-t-tertiary">
							No appointments or consultations at the moment
						</p>
					)}

					{currentEvents.length > 0 && (
						<ScrollArea className="h-[422px] px-4" type="always">
							<div className="space-y-6 pb-4">
								{currentEvents.map((event) => {
									const user = users.find((user) => user.id === event.user.id);

									return (
										<div key={event.id} className="space-y-1.5">
											<p className="line-clamp-2 text-sm font-semibold">
												{event.title}
											</p>

											{user && (
												<div className="flex items-center gap-1.5">
													<User className="size-4 text-t-quinary" />
													<span className="text-sm text-t-tertiary">
														{user.name}
													</span>
												</div>
											)}

											<div className="flex items-center gap-1.5">
												<Calendar className="size-4 text-t-quinary" />
												<span className="text-sm text-t-tertiary">
													{format(new Date(event.startDate), "MMM d, yyyy")}
												</span>
											</div>

											<div className="flex items-center gap-1.5">
												<Clock className="size-4 text-t-quinary" />
												<span className="text-sm text-t-tertiary">
													{format(
														parseISO(event.startDate),
														use24HourFormat ? "HH:mm" : "hh:mm a",
													)}{" "}
													-
													{format(
														parseISO(event.endDate),
														use24HourFormat ? "HH:mm" : "hh:mm a",
													)}
												</span>
											</div>
										</div>
									);
								})}
							</div>
						</ScrollArea>
					)}
				</div>
			</div>
		</div>
	);
}
