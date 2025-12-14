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
import {
	TASK_STATUS_LABEL,
	type TaskStatus,
} from "@/app/projects/[projectId]/task/data";

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
	selectedStatuses: TaskStatus[];
	filterEventsBySelectedStatuses: (status: TaskStatus) => void;
	filterEventsBySelectedUser: (userId: IUser["id"] | "all") => void;
	selectedDepartmentNames: string[];
	selectedDepartmentIds: string[];
	toggleDepartmentFilter: (departmentName: string, departmentId?: string | null) => void;
	availableDepartments: string[];
	availableColors: string[];
	departmentMeta: Record<string, { id?: string | null; color?: string | null; textColor?: string | null }>;
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
	const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>([]);
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
			(event.departmentNames ?? []).forEach((name) => {
				const derived = name?.trim();
				if (derived) {
					names.add(derived);
				}
			});
		});
		return Array.from(names);
	}, [allEvents]);

	const availableColors = useMemo(() => {
		const set = new Set<string>();
		allEvents.forEach((event) => {
			const candidate = event.accentColor ?? event.color;
			if (candidate) {
				const normalized = candidate.trim().toLowerCase();
				if (normalized) {
					set.add(normalized);
				}
			}
		});
		return Array.from(set);
	}, [allEvents]);

	const departmentMeta = useMemo(() => {
		const meta: Record<
			string,
			{ id?: string | null; color?: string | null; textColor?: string | null }
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
			(event.departmentNames ?? []).forEach((name) => {
				const normalized = name?.trim();
				if (!normalized) return;
				const current = meta[normalized];
				meta[normalized] = {
					id: current?.id ?? event.departmentId ?? null,
					color: current?.color ?? event.departmentColor,
					textColor: current?.textColor ?? event.departmentTextColor,
				};
			});
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
			selectedDepartmentIds
				.map((id) => String(id).trim())
				.filter(Boolean),
		);

		if (selectedColors.length > 0) {
			nextEvents = nextEvents.filter((event) => {
				const eventColor = (event.accentColor ?? event.color)?.toLowerCase().trim();
				if (!eventColor) return false;
				return selectedColors.includes(eventColor);
			});
		}

		if (selectedStatuses.length > 0) {
			const statusSet = new Set<string>(selectedStatuses.map((status) => status.toUpperCase()));
			nextEvents = nextEvents.filter((event) => {
				const normalized = event.status?.trim().toUpperCase();
				if (!normalized) return false;
				return statusSet.has(normalized);
			});
		}

		if (selectedDepartmentNames.length > 0 || selectedDepartmentIds.length > 0) {
			nextEvents = nextEvents.filter((event) => {
				const departmentNameSet = new Set<string>();
				if (event.departmentName?.trim()) {
					departmentNameSet.add(event.departmentName.trim().toLowerCase());
				}
				(event.departmentNames ?? []).forEach((name) => {
					const normalized = name?.trim().toLowerCase();
					if (normalized) {
						departmentNameSet.add(normalized);
					}
				});

				const departmentIdSet = new Set<string>();
				const addDepartmentId = (value?: string | null) => {
					if (!value) return;
					const normalized = String(value).trim();
					if (normalized) {
						departmentIdSet.add(normalized);
					}
				};
				addDepartmentId(event.departmentId ?? null);
				(event.departmentIds ?? []).forEach((id) => addDepartmentId(id));

				const matchesName =
					departmentNameSet.size > 0 &&
					Array.from(departmentNameSet).some((name) => selectedDepartmentNamesSet.has(name));
				const matchesId =
					departmentIdSet.size > 0 &&
					Array.from(departmentIdSet).some((id) => selectedDepartmentIdsSet.has(id));
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
	}, [allEvents, selectedColors, selectedDepartmentIds, selectedDepartmentNames, selectedStatuses, selectedUserId]);

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
		const normalized = color?.toLowerCase().trim() as TEventColor;
		if (!normalized) return;
		setSelectedColors((prev) => {
			if (prev.includes(normalized)) {
				return prev.filter((c) => c !== normalized);
			}
			return [...prev, normalized];
		});
	};

	const filterEventsBySelectedStatuses = (status: TaskStatus) => {
		setSelectedStatuses((prev) => {
			if (prev.includes(status)) {
				return prev.filter((value) => value !== status);
			}
			return [...prev, status];
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
			setSelectedStatuses([]);
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
			availableColors,
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
			selectedStatuses,
			filterEventsBySelectedStatuses,
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
