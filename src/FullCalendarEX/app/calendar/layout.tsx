import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Full Calendar",
	description: "Calendar page",
	authors: [
		{
			name: "Jeraidi Yassir",
			url: "https://jeraidi.tech",
		},
	],
	keywords: [
		"calendar",
		"big calendar",
		"full calendar",
		"next.js",
		"tailwind css",
		"shadcn ui",
		"events",
		"react.js",
	],
};

export default function CalendarLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
