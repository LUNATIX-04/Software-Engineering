import type { LinkItemType } from "fumadocs-ui/layouts/links";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { CalendarClockIcon } from "lucide-react";
import { icons } from "@/components/icons";

export const linkItems: LinkItemType[] = [
	{
		icon: <icons.ReactIcon />,
		text: "React",
		url: "/docs/react",
		active: "nested-url",
		description: "Full calendar for React",
	},
];

export const baseOptions: BaseLayoutProps = {
	githubUrl: "https://github.com/yassir-jeraidi/full-calendar",
	nav: {
		title: (
			<div className="flex items-center gap-2 text-lg">
				<CalendarClockIcon fill="currentColor" />
				<span className="hidden md:block">Full calendar</span>
			</div>
		),
		transparentMode: "top",
	},
	links: [...linkItems],
};
