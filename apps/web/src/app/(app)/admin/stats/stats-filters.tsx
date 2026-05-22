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
import { useEffect, useRef, useState } from "react";

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

const ALL = "all";

const TAG_LABELS = {
	quente: "Quente",
	morno: "Morno",
	frio: "Frio",
} as const;

function formatDateRange(range: DateRange | undefined): string {
	if (!range?.from) {
		return "Selecionar período";
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
}: StatsFiltersProps) {
	const [selectedVendor, setSelectedVendor] = useState<string>(ALL);
	const [selectedTag, setSelectedTag] = useState<string>(ALL);
	const [selectedSegment, setSelectedSegment] = useState<string>(ALL);
	const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
	const [calendarOpen, setCalendarOpen] = useState(false);

	// Auto-apply: dispara onApply sempre que o estado consolidado muda.
	// Evita o disparo inicial usando ref para pular o primeiro effect.
	const isFirstRun = useRef(true);
	useEffect(() => {
		if (isFirstRun.current) {
			isFirstRun.current = false;
			return;
		}
		onApply({
			userId: selectedVendor === ALL ? undefined : selectedVendor,
			tag:
				selectedTag === ALL
					? undefined
					: (selectedTag as "quente" | "morno" | "frio"),
			segment: selectedSegment === ALL ? undefined : selectedSegment,
			startDate: dateRange?.from?.toISOString(),
			endDate: dateRange?.to?.toISOString(),
		});
	}, [selectedVendor, selectedTag, selectedSegment, dateRange, onApply]);

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

	return (
		<Card className="mb-6">
			<CardContent>
				<div className="flex flex-col gap-3 lg:grid lg:grid-cols-4">
					<Select
						onValueChange={(v) => setSelectedVendor(v ?? ALL)}
						value={selectedVendor}
					>
						<SelectTrigger>
							<SelectValue placeholder="Todos os vendedores">
								{(value) => {
									if (!value || value === ALL) {
										return "Todos os vendedores";
									}
									return (
										vendors.find((v) => v.userId === value)?.name ??
										String(value).slice(0, 8)
									);
								}}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={ALL}>Todos os vendedores</SelectItem>
							{vendors.map((v) => (
								<SelectItem key={v.userId} value={v.userId}>
									{v.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select
						onValueChange={(v) => setSelectedTag(v ?? ALL)}
						value={selectedTag}
					>
						<SelectTrigger>
							<SelectValue placeholder="Todas as tags">
								{(value) => {
									if (!value || value === ALL) {
										return "Todas as tags";
									}
									return TAG_LABELS[value as keyof typeof TAG_LABELS] ?? value;
								}}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={ALL}>Todas as tags</SelectItem>
							<SelectItem value="quente">Quente</SelectItem>
							<SelectItem value="morno">Morno</SelectItem>
							<SelectItem value="frio">Frio</SelectItem>
						</SelectContent>
					</Select>

					<Select
						onValueChange={(v) => setSelectedSegment(v ?? ALL)}
						value={selectedSegment}
					>
						<SelectTrigger>
							<SelectValue placeholder="Todos os segmentos">
								{(value) =>
									!value || value === ALL ? "Todos os segmentos" : value
								}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={ALL}>Todos os segmentos</SelectItem>
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
									aria-label="Selecionar período"
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
									Últimos 7 dias
								</Button>
								<Button
									onClick={() => applyPreset("30days")}
									size="sm"
									variant="outline"
								>
									Últimos 30 dias
								</Button>
								<Button
									onClick={() => applyPreset("all")}
									size="sm"
									variant="outline"
								>
									Todo período
								</Button>
								{dateRange?.from ? (
									<Button
										onClick={() => setDateRange(undefined)}
										size="sm"
										variant="ghost"
									>
										Limpar
									</Button>
								) : null}
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
				</div>
			</CardContent>
		</Card>
	);
}
