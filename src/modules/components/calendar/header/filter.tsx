"use client";

import { Filter, X } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { useCalendar } from "@/modules/components/calendar/contexts/calendar-context";
import { QUICK_COLOR_OPTIONS } from "@/constants/task-colors";
import { QUICK_DEPARTMENT_COLORS } from "@/components/projects/DepartmentColorMenu";
import type { ProjectDepartmentRecord } from "@/utils/projects/departments";
import { fetchProjectDepartments } from "@/utils/projects/departments";
import { useCallback, useEffect, useMemo, useState } from "react";

type FilterMode = "department" | "color";

export default function FilterEvents() {
	const {
		availableDepartments,
		availableColors,
		departmentMeta,
		selectedDepartmentNames,
		selectedDepartmentIds,
		selectedColors,
		filterEventsBySelectedUser,
		filterEventsBySelectedColors,
		clearFilter,
		selectedUserId,
		toggleDepartmentFilter,
		projectId,
	} = useCalendar();

	const [menuOpen, setMenuOpen] = useState(false);
	const [filterMode, setFilterMode] = useState<FilterMode>("department");
	const [remoteDepartments, setRemoteDepartments] = useState<ProjectDepartmentRecord[]>([]);

	useEffect(() => {
		let active = true;

		if (!projectId) {
			setRemoteDepartments([]);
			return;
		}

		fetchProjectDepartments(projectId)
			.then((departments) => {
				if (!active) {
					return;
				}
				setRemoteDepartments(departments);
			})
			.catch(() => {
				if (!active) {
					return;
				}
				setRemoteDepartments([]);
			})
			.finally(() => {
				if (!active) {
					return;
				}
			});

		return () => {
			active = false;
		};
	}, [projectId]);

	const remoteDepartmentByName = useMemo(
		() =>
			remoteDepartments.reduce<Record<string, ProjectDepartmentRecord>>((acc, department) => {
				acc[department.name] = department;
				return acc;
			}, {}),
		[remoteDepartments],
	);

	const departmentOptions = useMemo(() => {
		const names = new Set<string>(availableDepartments);
		remoteDepartments.forEach((department) => {
			if (department.name.trim().length > 0) {
				names.add(department.name);
			}
		});
		return Array.from(names).sort((a, b) =>
			a.localeCompare(b, undefined, { sensitivity: "base" }),
		);
	}, [availableDepartments, remoteDepartments]);

	const departmentFilterCount = useMemo(() => {
		const nameSet = new Set(
			selectedDepartmentNames.map((name) => name.trim().toLowerCase()).filter(Boolean),
		);
		selectedDepartmentIds.forEach((id) => {
			if (id) {
				nameSet.add(String(id).trim());
			}
		});
		return nameSet.size;
	}, [selectedDepartmentIds, selectedDepartmentNames]);
	const userFilterCount = selectedUserId !== "all" ? 1 : 0;
	const colorFilterCount = selectedColors.length;
	const filterCount = departmentFilterCount + userFilterCount + colorFilterCount;
	const filterActive = filterCount > 0;
	const departmentFilterActive = departmentFilterCount > 0;
	const colorFilterActive = colorFilterCount > 0;

	const handleToggleDepartmentFilter = useCallback(
		(department: string) => {
			const meta = remoteDepartmentByName[department] ?? departmentMeta[department];
			toggleDepartmentFilter(department, meta?.id ?? null);
		},
		[departmentMeta, remoteDepartmentByName, toggleDepartmentFilter],
	);

	const handleResetFilters = useCallback(() => {
		clearFilter();
		filterEventsBySelectedUser("all");
	}, [clearFilter, filterEventsBySelectedUser]);

	const { paletteColors, customColors } = useMemo(() => {
		const paletteLabelMap = new Map<string, string>();
		[...QUICK_COLOR_OPTIONS, ...QUICK_DEPARTMENT_COLORS].forEach((item) => {
			if (item?.value) {
				paletteLabelMap.set(item.value.toLowerCase(), item.label);
			}
		});

		const normalizedColors = availableColors
			.map((color) => color?.trim().toLowerCase())
			.filter((color): color is string => Boolean(color));

		const seen = new Set<string>();
		let customIndex = 0;
		const palette: Array<{ label: string; value: string }> = [];
		const custom: string[] = [];

		normalizedColors.forEach((color) => {
			if (seen.has(color)) {
				return;
			}
			seen.add(color);
			const paletteLabel = paletteLabelMap.get(color);
			if (paletteLabel) {
				palette.push({ label: paletteLabel, value: color });
			} else {
				customIndex += 1;
				custom.push(color);
				palette.push({ label: `Custom Color ${customIndex}`, value: color });
			}
		});

		return { paletteColors: palette, customColors: custom };
	}, [availableColors]);

	const renderColorItem = useCallback(
		(color: string, label?: string) => {
			const normalized = color.trim().toLowerCase();
			const isChecked = selectedColors.includes(normalized);
			return (
				<DropdownMenuCheckboxItem
					key={normalized}
					checked={isChecked}
					onCheckedChange={() => filterEventsBySelectedColors(normalized)}
					onSelect={(event) => event.preventDefault()}
					className="rounded-2xl px-3 py-2 pr-10 text-foreground focus:bg-primary/10 focus:text-primary [&>span:first-child]:left-auto [&>span:first-child]:right-3"
				>
					<span className="inline-flex items-center gap-2">
						<span
							className="size-3 rounded-full border border-black/10"
							style={{ backgroundColor: normalized }}
						/>
						<span className="block max-w-[10rem] truncate">
							{label ?? normalized.charAt(0).toUpperCase() + normalized.slice(1)}
						</span>
					</span>
				</DropdownMenuCheckboxItem>
			);
		},
		[filterEventsBySelectedColors, selectedColors],
	);

	return (
		<DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
			<DropdownMenuTrigger asChild>
				<Toggle
					variant="outline"
					className={cn(
						"cursor-pointer w-fit relative",
						filterActive ? "border-primary bg-primary/10 text-primary" : "",
					)}
					aria-label="Open calendar filters"
				>
					<Filter className="h-4 w-4" />
				</Toggle>
			</DropdownMenuTrigger>

			<DropdownMenuContent
				align="start"
				className="w-60 rounded-3xl border border-primary/40 bg-white px-3 py-2 text-sm font-semibold text-primary shadow-[0_10px_30px_rgba(72,68,110,0.2)]"
			>
				<div className="flex items-center justify-between px-1 pb-2 pt-1">
					<span className="text-[0.65rem] font-semibold uppercase tracking-wide text-primary/60">
						Filters
					</span>
					<button
						type="button"
						className="rounded-full p-1 text-primary/60 transition hover:bg-primary/10 hover:text-primary focus:outline-none"
						onClick={() => setMenuOpen(false)}
						aria-label="Close filters"
					>
						<X className="size-4" />
					</button>
				</div>

				<div className="flex items-center justify-end gap-2 px-1 pb-2">
					<button
						type="button"
						className={cn(
							"rounded-full px-3 py-1 text-xs font-semibold transition",
							filterMode === "department"
								? "bg-primary/10 text-primary"
								: "text-primary/70 hover:bg-primary/10 hover:text-primary",
						)}
						onClick={() => setFilterMode("department")}
					>
						Departments
					</button>
					<button
						type="button"
						className={cn(
							"rounded-full px-3 py-1 text-xs font-semibold transition",
							filterMode === "color"
								? "bg-primary/10 text-primary"
								: "text-primary/70 hover:bg-primary/10 hover:text-primary",
						)}
						onClick={() => setFilterMode("color")}
					>
						Colors
					</button>
				</div>

				<DropdownMenuSeparator className="my-1 bg-primary/15" />

				{filterMode === "department" ? (
					<div className="member-filter-scroll max-h-[22rem] overflow-y-auto px-2 py-1">
						{departmentOptions.length === 0 ? (
							<div className="px-2 py-3 text-xs font-semibold uppercase tracking-wide text-primary/60">
								No departments yet
							</div>
						) : (
							departmentOptions.map((department) => {
								const meta = remoteDepartmentByName[department] ?? departmentMeta[department];
								const isChecked =
									selectedDepartmentNames.some(
										(name) => name.trim().toLowerCase() === department.trim().toLowerCase(),
									) ||
									(meta?.id ? selectedDepartmentIds.includes(meta.id) : false);
								return (
									<DropdownMenuCheckboxItem
										key={department}
										checked={isChecked}
										onCheckedChange={() => handleToggleDepartmentFilter(department)}
										onSelect={(event) => event.preventDefault()}
										className="rounded-2xl px-3 py-2 pr-10 text-foreground focus:bg-primary/10 focus:text-primary [&>span:first-child]:left-auto [&>span:first-child]:right-3"
									>
										<span className="inline-flex items-center gap-2">
											<span
												className="size-3 rounded-full border border-black/10"
												style={{
													backgroundColor: meta?.color ?? "#D9D6FF",
												}}
											/>
											<span className="block max-w-[10rem] truncate">{department}</span>
										</span>
									</DropdownMenuCheckboxItem>
								);
							})
						)}
					</div>
				) : (
					<div className="member-filter-scroll max-h-[22rem] overflow-y-auto space-y-2 px-2 py-1">
						{paletteColors
							.filter((item) => item.label && !item.label.toLowerCase().startsWith("custom color"))
							.map((item) => renderColorItem(item.value, item.label))}
						{paletteColors.length === 0 && customColors.length === 0 ? (
							<div className="px-2 py-3 text-xs font-semibold uppercase tracking-wide text-primary/60">
								No colors available
							</div>
						) : null}
						{customColors.length > 0 ? (
							<>
								{customColors.map((color, index) =>
									renderColorItem(color, `Custom Color ${index + 1}`),
								)}
							</>
						) : null}
					</div>
				)}

				<DropdownMenuSeparator className="my-2 bg-primary/20" />

				<DropdownMenuItem
					onSelect={(event) => {
						event.preventDefault();
						handleResetFilters();
					}}
					className="rounded-2xl px-3 py-2 text-primary/70 focus:bg-primary/10 focus:text-primary"
				>
					Reset filters
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
