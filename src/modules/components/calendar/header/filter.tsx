"use client";

import { Filter, X } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { useCalendar } from "@/modules/components/calendar/contexts/calendar-context";
import type { ProjectDepartmentRecord } from "@/utils/projects/departments";
import { fetchProjectDepartments } from "@/utils/projects/departments";
import { fetchProjectMembership } from "@/utils/projects/api";
import { useCallback, useEffect, useMemo, useState } from "react";

type TaskScope = "all" | "assignee" | "assigner";

export default function FilterEvents() {
	const {
		availableDepartments,
		departmentMeta,
		selectedDepartmentNames,
		selectedDepartmentIds,
		filterEventsBySelectedUser,
		clearFilter,
		selectedUserId,
		toggleDepartmentFilter,
		projectId,
	} = useCalendar();

	const [menuOpen, setMenuOpen] = useState(false);
	const [taskScope, setTaskScope] = useState<TaskScope>("all");
	const [membershipId, setMembershipId] = useState<string | null>(null);
	const [membershipLoading, setMembershipLoading] = useState(false);
	const [remoteDepartments, setRemoteDepartments] = useState<ProjectDepartmentRecord[]>([]);

	useEffect(() => {
		let active = true;

		if (!projectId) {
			setMembershipId(null);
			setMembershipLoading(false);
			return;
		}

		setMembershipLoading(true);

		fetchProjectMembership(projectId)
			.then((membership) => {
				if (!active) {
					return;
				}
				setMembershipId(membership?.id ?? null);
			})
			.catch(() => {
				if (!active) {
					return;
				}
				setMembershipId(null);
			})
			.finally(() => {
				if (!active) {
					return;
				}
				setMembershipLoading(false);
			});

		return () => {
			active = false;
		};
	}, [projectId]);

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

	useEffect(() => {
		if (!membershipId && taskScope !== "all") {
			setTaskScope("all");
			filterEventsBySelectedUser("all");
		}
	}, [filterEventsBySelectedUser, membershipId, taskScope]);

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

	const hasDepartmentFilters =
		selectedDepartmentNames.length > 0 || selectedDepartmentIds.length > 0;
	const filterActive = hasDepartmentFilters || selectedUserId !== "all";

	const handleToggleDepartmentFilter = useCallback(
		(department: string) => {
			const meta = remoteDepartmentByName[department] ?? departmentMeta[department];
			toggleDepartmentFilter(department, meta?.id ?? null);
		},
		[departmentMeta, remoteDepartmentByName, toggleDepartmentFilter],
	);

	const applyTaskScope = useCallback(
		(nextScope: TaskScope) => {
			if (nextScope === "all" || !membershipId) {
				filterEventsBySelectedUser("all");
				return;
			}
			filterEventsBySelectedUser(membershipId);
		},
		[filterEventsBySelectedUser, membershipId],
	);

	const handleTaskScopeChange = useCallback(
		(nextScope: TaskScope) => {
			if (nextScope !== "all" && !membershipId) {
				return;
			}
			setTaskScope(nextScope);
			applyTaskScope(nextScope);
		},
		[applyTaskScope, membershipId],
	);

	const handleResetFilters = useCallback(() => {
		clearFilter();
		setTaskScope("all");
		filterEventsBySelectedUser("all");
	}, [clearFilter, filterEventsBySelectedUser]);

	const isTaskScopeSelectionDisabled = membershipLoading || !membershipId;

	return (
		<DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
			<DropdownMenuTrigger asChild>
				<Toggle
					variant="outline"
					className={cn(
						"cursor-pointer w-fit",
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

				<DropdownMenuSeparator className="my-1 bg-primary/15" />

				<div className="asap-scroll max-h-[18rem] overflow-y-auto">
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

				<DropdownMenuSeparator className="my-2 bg-primary/20" />

				<DropdownMenuLabel className="px-3 pt-1 text-[0.65rem] font-semibold uppercase tracking-wide text-primary/60">
					Task scope
				</DropdownMenuLabel>

				<DropdownMenuRadioGroup value={taskScope} onValueChange={(value) => handleTaskScopeChange(value as TaskScope)}>
					<DropdownMenuRadioItem
						value="all"
						className="rounded-2xl px-3 py-2 pr-10 focus:bg-primary/10 focus:text-primary [&>span:first-child]:left-auto [&>span:first-child]:right-3"
					>
						All tasks
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem
						value="assignee"
						disabled={isTaskScopeSelectionDisabled}
						className="rounded-2xl px-3 py-2 pr-10 focus:bg-primary/10 focus:text-primary [&>span:first-child]:left-auto [&>span:first-child]:right-3"
					>
						My Tasks (Assignee)
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem
						value="assigner"
						disabled={isTaskScopeSelectionDisabled}
						className="rounded-2xl px-3 py-2 pr-10 focus:bg-primary/10 focus:text-primary [&>span:first-child]:left-auto [&>span:first-child]:right-3"
					>
						Assigned Tasks (Assigner)
					</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>

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
