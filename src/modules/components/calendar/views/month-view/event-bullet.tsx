import { cva } from "class-variance-authority";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { transition } from "@/modules/components/calendar/animations";
import type { TEventColor } from "@/modules/components/calendar/types";
import { DAY_CELL_COLOR_VARIANTS, DayCellColorVariant } from "@/modules/components/calendar/views/month-view/day-cell";

const eventBulletVariants = cva("size-2 rounded-full", {
	variants: {
		color: {
			blue: "bg-blue-600 dark:bg-blue-500",
			green: "bg-green-600 dark:bg-green-500",
			red: "bg-red-600 dark:bg-red-500",
			yellow: "bg-yellow-600 dark:bg-yellow-500",
			purple: "bg-purple-600 dark:bg-purple-500",
			orange: "bg-orange-600 dark:bg-orange-500",
			gray: "bg-gray-600 dark:bg-gray-500",
		},
	},
	defaultVariants: {
		color: "blue",
	},
});

function resolveBulletVariant(color: TEventColor | undefined): DayCellColorVariant | undefined {
	if (!color) {
		return undefined;
	}
	if (DAY_CELL_COLOR_VARIANTS.includes(color as DayCellColorVariant)) {
		return color as DayCellColorVariant;
	}
	return undefined;
}

export function EventBullet({
	color,
	accentColor,
	className,
}: {
	color: TEventColor;
	accentColor?: string | null;
	className?: string;
}) {
	const style = accentColor ? { backgroundColor: accentColor } : undefined;
	const baseClass = accentColor ? "size-2 rounded-full" : undefined;
	return (
		<motion.div
			className={cn(
				baseClass,
				!accentColor &&
					eventBulletVariants({
						color: resolveBulletVariant(color) ?? "blue",
					}),
				className,
			)}
			style={style}
			initial={{ scale: 0, opacity: 0 }}
			animate={{ scale: 1, opacity: 1 }}
			whileHover={{ scale: 1.2 }}
			transition={transition}
		/>
	);
}
