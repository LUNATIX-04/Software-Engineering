"use client";

import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useLocalStorage } from "@/modules/components/calendar/hooks";
import type { IEvent, IUser } from "@/modules/components/calendar/interfaces";
import type {
	TCalendarView,
	TEventColor,
} from "@/modules/components/calendar/types";

interface ICalendarContext {
	selectedDate: Date;
	view: TCalendarView;
	setView: (view: TCalendarView) => void;
	agendaModeGroupBy: "date" | "color";
	setAgendaModeGroupBy: (groupBy: "date" | "color") => void;
	use24HourFormat: boolean;
	toggleTimeFormat: () => void;
	setSelectedDate: (date: Date | undefined) => void;
	selectedUserId: IUser["id"] | "all";
	setSelectedUserId: (userId: IUser["id"] | "all") => void;
	badgeVariant: "dot" | "colored";
	setBadgeVariant: (variant: "dot" | "colored") => void;
	selectedColors: TEventColor[];
	filterEventsBySelectedColors: (colors: TEventColor) => void;
	filterEventsBySelectedUser: (userId: IUser["id"] | "all") => void;
	selectedDepartmentNames: string[];
	selectedDepartmentIds: string[];
	toggleDepartmentFilter: (departmentName: string, departmentId?: string | null) => void;
	availableDepartments: string[];
	departmentMeta: Record<string, { id?: string | null; color?: string; textColor?: string }>;
	clearDepartmentFilters: () => void;
	users: IUser[];
	events: IEvent[];
	addEvent: (event: IEvent) => void;
	updateEvent: (event: IEvent) => void;
	removeEvent: (eventId: number) => void;
	clearFilter: () => void;
	projectId?: string;
	canCreateTasks: boolean;
}

interface CalendarSettings {
	badgeVariant: "dot" | "colored";
	view: TCalendarView;
	use24HourFormat: boolean;
	agendaModeGroupBy: "date" | "color";
}

const DEFAULT_SETTINGS: CalendarSettings = {
	badgeVariant: "colored",
	view: "day",
	use24HourFormat: true,
	agendaModeGroupBy: "date",
};

const CalendarContext = createContext({} as ICalendarContext);

export function CalendarProvider({
	children,
	users,
	events,
	badge = "colored",
	view = "day",
	projectId,
	canCreateTasks = true,
}: {
	children: React.ReactNode;
	users: IUser[];
	events: IEvent[];
	view?: TCalendarView;
	badge?: "dot" | "colored";
	projectId?: string;
	canCreateTasks?: boolean;
}) {
	const [settings, setSettings] = useLocalStorage<CalendarSettings>(
		"calendar-settings",
		{
			...DEFAULT_SETTINGS,
			badgeVariant: badge,
			view: view,
		},
	);

	const [badgeVariant, setBadgeVariantState] = useState<"dot" | "colored">(
		settings.badgeVariant,
	);
	const [currentView, setCurrentViewState] = useState<TCalendarView>(
		settings.view,
	);
	const [use24HourFormat, setUse24HourFormatState] = useState<boolean>(
		settings.use24HourFormat,
	);
	const [agendaModeGroupBy, setAgendaModeGroupByState] = useState<
		"date" | "color"
	>(settings.agendaModeGroupBy);

	const [selectedDate, setSelectedDate] = useState(new Date());
	const [selectedUserId, setSelectedUserId] = useState<IUser["id"] | "all">(
		"all",
	);
	const [selectedDepartmentNames, setSelectedDepartmentNames] = useState<string[]>([]);
	const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
	const [selectedColors, setSelectedColors] = useState<TEventColor[]>([]);

	const [allEvents, setAllEvents] = useState<IEvent[]>(events || []);
	const [filteredEvents, setFilteredEvents] = useState<IEvent[]>(events || []);

	useEffect(() => {
		const nextEvents = events || [];
		setAllEvents(nextEvents);
		setFilteredEvents(nextEvents);
	}, [events]);

	const availableDepartments = useMemo(() => {
		const names = new Set<string>();
		allEvents.forEach((event) => {
			const normalized = event.departmentName?.trim();
			if (normalized) {
				names.add(normalized);
			}
		});
		return Array.from(names);
	}, [allEvents]);

	const departmentMeta = useMemo(() => {
		const meta: Record<
			string,
			{ id?: string | null; color?: string; textColor?: string }
		> = {};
		allEvents.forEach((event) => {
			const departmentName = event.departmentName?.trim();
			if (!departmentName) {
				return;
			}
			const existing = meta[departmentName];
			meta[departmentName] = {
				id: event.departmentId ?? existing?.id ?? null,
				color: event.departmentColor ?? existing?.color,
				textColor: event.departmentTextColor ?? existing?.textColor,
			};
		});
		return meta;
	}, [allEvents]);

	const applyFilters = useCallback(() => {
		let nextEvents = allEvents;
		const selectedDepartmentNamesLower = selectedDepartmentNames
			.map((name) => name.trim().toLowerCase())
			.filter(Boolean);
		const selectedDepartmentNamesSet = new Set(selectedDepartmentNamesLower);
		const selectedDepartmentIdsSet = new Set(
			selectedDepartmentIds.map((id) => id.trim()).filter(Boolean),
		);

		if (selectedColors.length > 0) {
			nextEvents = nextEvents.filter((event) => {
				const eventColor = event.color || "blue";
				return selectedColors.includes(eventColor);
			});
		}

		if (selectedDepartmentNames.length > 0 || selectedDepartmentIds.length > 0) {
			nextEvents = nextEvents.filter((event) => {
				const departmentName = event.departmentName?.trim().toLowerCase() ?? "";
				const departmentId = event.departmentId ?? "";
				const matchesName =
					departmentName.length > 0 && selectedDepartmentNamesSet.has(departmentName);
				const matchesId = departmentId && selectedDepartmentIdsSet.has(departmentId);
				if (!matchesName && !matchesId) {
					return false;
				}
				return true;
			});
		}

		if (selectedUserId !== "all") {
			nextEvents = nextEvents.filter(
				(event) => event.user.id === selectedUserId,
			);
		}

		setFilteredEvents(nextEvents);
	}, [allEvents, selectedColors, selectedDepartmentIds, selectedDepartmentNames, selectedUserId]);

	useEffect(() => {
		applyFilters();
	}, [applyFilters]);

	const updateSettings = (newPartialSettings: Partial<CalendarSettings>) => {
		setSettings({
			...settings,
			...newPartialSettings,
		});
	};

	const setBadgeVariant = (variant: "dot" | "colored") => {
		setBadgeVariantState(variant);
		updateSettings({ badgeVariant: variant });
	};

	const setView = (newView: TCalendarView) => {
		setCurrentViewState(newView);
		updateSettings({ view: newView });
	};

	const toggleTimeFormat = () => {
		const newValue = !use24HourFormat;
		setUse24HourFormatState(newValue);
		updateSettings({ use24HourFormat: newValue });
	};

	const setAgendaModeGroupBy = (groupBy: "date" | "color") => {
		setAgendaModeGroupByState(groupBy);
		updateSettings({ agendaModeGroupBy: groupBy });
	};

	const filterEventsBySelectedColors = (color: TEventColor) => {
		setSelectedColors((prev) => {
			if (prev.includes(color)) {
				return prev.filter((c) => c !== color);
			}
			return [...prev, color];
		});
	};

	const filterEventsBySelectedUser = (userId: IUser["id"] | "all") => {
		setSelectedUserId(userId);
	};

	const toggleDepartmentFilter = (departmentName: string, departmentId?: string | null) => {
		const normalizedName = departmentName.trim();
		if (!normalizedName && !departmentId) {
			return;
		}
		setSelectedDepartmentNames((prev) => {
			if (!normalizedName) return prev;
			const exists = prev.some(
				(name) => name.trim().toLowerCase() === normalizedName.toLowerCase(),
			);
			if (exists) {
				return prev.filter(
					(name) => name.trim().toLowerCase() !== normalizedName.toLowerCase(),
				);
			}
			return [...prev, normalizedName];
		});
		if (departmentId) {
			setSelectedDepartmentIds((prev) => {
				const exists = prev.some((id) => id === departmentId);
				if (exists) {
					return prev.filter((id) => id !== departmentId);
				}
				return [...prev, departmentId];
			});
		}
	};

	const clearDepartmentFilters = () => {
		setSelectedDepartmentNames([]);
		setSelectedDepartmentIds([]);
	};

	const handleSelectDate = (date: Date | undefined) => {
		if (!date) return;
		setSelectedDate(date);
	};

	const addEvent = (event: IEvent) => {
		setAllEvents((prev) => [...prev, event]);
		setFilteredEvents((prev) => [...prev, event]);
	};

	const updateEvent = (event: IEvent) => {
		const updated = {
			...event,
			startDate: new Date(event.startDate).toISOString(),
			endDate: new Date(event.endDate).toISOString(),
		};

		setAllEvents((prev) => prev.map((e) => (e.id === event.id ? updated : e)));
		setFilteredEvents((prev) =>
			prev.map((e) => (e.id === event.id ? updated : e)),
		);
	};

	const removeEvent = (eventId: number) => {
		setAllEvents((prev) => prev.filter((e) => e.id !== eventId));
		setFilteredEvents((prev) => prev.filter((e) => e.id !== eventId));
	};

		const clearFilter = () => {
			setSelectedColors([]);
			setSelectedUserId("all");
			setSelectedDepartmentNames([]);
			setSelectedDepartmentIds([]);
		};

		const value = {
			selectedDate,
			setSelectedDate: handleSelectDate,
			selectedUserId,
			setSelectedUserId,
			badgeVariant,
			setBadgeVariant,
			users,
			selectedColors,
			selectedDepartmentNames,
			selectedDepartmentIds,
			toggleDepartmentFilter,
			availableDepartments,
			departmentMeta,
			clearDepartmentFilters,
			filterEventsBySelectedColors,
			filterEventsBySelectedUser,
			events: filteredEvents,
			view: currentView,
			use24HourFormat,
			toggleTimeFormat,
			setView,
			agendaModeGroupBy,
			setAgendaModeGroupBy,
			addEvent,
			updateEvent,
			removeEvent,
			clearFilter,
			projectId,
			canCreateTasks,
		};

	return (
		<CalendarContext.Provider value={value}>
			{children}
		</CalendarContext.Provider>
	);
}

export function useCalendar(): ICalendarContext {
	const context = useContext(CalendarContext);
	if (!context)
		throw new Error("useCalendar must be used within a CalendarProvider.");
	return context;
}
