"use client";

import { Button } from "@dashboard-leads-profills/ui/components/button";
import { Calendar } from "@dashboard-leads-profills/ui/components/calendar";
import {
	Card,
	CardContent,
} from "@dashboard-leads-profills/ui/components/card";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@dashboard-leads-profills/ui/components/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@dashboard-leads-profills/ui/components/select";
import { CalendarDaysIcon } from "lucide-react";
import { useState } from "react";

// Matches react-day-picker DateRange shape
interface DateRange {
	from: Date | undefined;
	to?: Date | undefined;
}

interface StatsFiltersProps {
	isLoading?: boolean;
	onApply: (filters: {
		userId?: string;
		tag?: "quente" | "morno" | "frio";
		segment?: string;
		startDate?: string;
		endDate?: string;
	}) => void;
	segments: string[];
	vendors: Array<{ userId: string; name: string }>;
}

function formatDateRange(range: DateRange | undefined): string {
	if (!range?.from) {
		return "Selecionar periodo";
	}
	const from = range.from.toLocaleDateString("pt-BR");
	if (!range.to) {
		return from;
	}
	return `${from} - ${range.to.toLocaleDateString("pt-BR")}`;
}

export default function StatsFilters({
	vendors,
	segments,
	onApply,
	isLoading,
}: StatsFiltersProps) {
	const [selectedVendor, setSelectedVendor] = useState<string>("");
	const [selectedTag, setSelectedTag] = useState<string>("");
	const [selectedSegment, setSelectedSegment] = useState<string>("");
	const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
	const [calendarOpen, setCalendarOpen] = useState(false);

	function applyPreset(preset: "today" | "7days" | "30days" | "all") {
		const now = new Date();
		if (preset === "today") {
			const start = new Date(now);
			start.setHours(0, 0, 0, 0);
			setDateRange({ from: start, to: now });
		} else if (preset === "7days") {
			const start = new Date(now);
			start.setDate(start.getDate() - 7);
			setDateRange({ from: start, to: now });
		} else if (preset === "30days") {
			const start = new Date(now);
			start.setDate(start.getDate() - 30);
			setDateRange({ from: start, to: now });
		} else {
			setDateRange(undefined);
		}
	}

	function handleApply() {
		onApply({
			userId: selectedVendor || undefined,
			tag: (selectedTag as "quente" | "morno" | "frio") || undefined,
			segment: selectedSegment || undefined,
			startDate: dateRange?.from?.toISOString(),
			endDate: dateRange?.to?.toISOString(),
		});
	}

	return (
		<Card className="mb-6">
			<CardContent>
				<div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
					<Select
						onValueChange={(v) => setSelectedVendor(v ?? "")}
						value={selectedVendor}
					>
						<SelectTrigger>
							<SelectValue placeholder="Selecionar vendedor" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="">Todos</SelectItem>
							{vendors.map((v) => (
								<SelectItem key={v.userId} value={v.userId}>
									{v.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select
						onValueChange={(v) => setSelectedTag(v ?? "")}
						value={selectedTag}
					>
						<SelectTrigger>
							<SelectValue placeholder="Todas as tags" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="">Todas as tags</SelectItem>
							<SelectItem value="quente">Quente</SelectItem>
							<SelectItem value="morno">Morno</SelectItem>
							<SelectItem value="frio">Frio</SelectItem>
						</SelectContent>
					</Select>

					<Select
						onValueChange={(v) => setSelectedSegment(v ?? "")}
						value={selectedSegment}
					>
						<SelectTrigger>
							<SelectValue placeholder="Todos os segmentos" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="">Todos os segmentos</SelectItem>
							{segments.map((s) => (
								<SelectItem key={s} value={s}>
									{s}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Popover onOpenChange={setCalendarOpen} open={calendarOpen}>
						<PopoverTrigger
							render={
								<Button
									className="w-full justify-start font-normal"
									variant="outline"
								/>
							}
						>
							<CalendarDaysIcon className="mr-2 size-4" />
							<span className="truncate">{formatDateRange(dateRange)}</span>
						</PopoverTrigger>
						<PopoverContent align="start" className="w-auto p-3">
							<div className="mb-3 flex flex-wrap gap-2">
								<Button
									onClick={() => applyPreset("today")}
									size="sm"
									variant="outline"
								>
									Hoje
								</Button>
								<Button
									onClick={() => applyPreset("7days")}
									size="sm"
									variant="outline"
								>
									Ultimos 7 dias
								</Button>
								<Button
									onClick={() => applyPreset("30days")}
									size="sm"
									variant="outline"
								>
									Ultimos 30 dias
								</Button>
								<Button
									onClick={() => applyPreset("all")}
									size="sm"
									variant="outline"
								>
									Todo periodo
								</Button>
							</div>
							<Calendar
								mode="range"
								// biome-ignore lint/suspicious/noExplicitAny: react-day-picker type mismatch across package boundaries
								onSelect={(range: any) => setDateRange(range)}
								// biome-ignore lint/suspicious/noExplicitAny: react-day-picker type mismatch across package boundaries
								selected={dateRange as any}
							/>
						</PopoverContent>
					</Popover>

					<Button disabled={isLoading} onClick={handleApply}>
						Aplicar filtros
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
