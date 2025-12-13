import type { TEventColor } from "@/modules/components/calendar/types";

export interface IUser {
	id: string;
	name: string;
	picturePath: string | null;
}

export interface IEvent {
	id: number;
	startDate: string;
	endDate: string;
	title: string;
	color: TEventColor;
	description: string;
	user: IUser;
	taskId?: string;
	projectId?: string;
	status?: string;
	accentColor?: string | null;
	accentTextColor?: string | null;
	departmentId?: string | null;
	departmentName?: string | null;
	departmentColor?: string | null;
	departmentTextColor?: string | null;
	departmentIds?: string[];
	departmentNames?: string[];
}

export interface ICalendarCell {
	day: number;
	currentMonth: boolean;
	date: Date;
}
