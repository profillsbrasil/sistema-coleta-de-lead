"use client";

import { Button } from "@dashboard-leads-profills/ui/components/button";
import { cn } from "@dashboard-leads-profills/ui/lib/utils";

interface PeriodFilterProps {
	onChange: (period: string) => void;
	value: string;
}

const periods = [
	{ label: "Hoje", value: "hoje" },
	{ label: "Ultima semana", value: "semana" },
	{ label: "Ultimo mes", value: "mes" },
	{ label: "Todos", value: "todos" },
] as const;

export function getPeriodStartDate(period: string): Date {
	const now = new Date();
	switch (period) {
		case "hoje": {
			const start = new Date(now);
			start.setHours(0, 0, 0, 0);
			return start;
		}
		case "semana": {
			const start = new Date(now);
			start.setDate(start.getDate() - 7);
			start.setHours(0, 0, 0, 0);
			return start;
		}
		case "mes": {
			const start = new Date(now);
			start.setDate(start.getDate() - 30);
			start.setHours(0, 0, 0, 0);
			return start;
		}
		default: {
			return new Date(0);
		}
	}
}

export default function PeriodFilter({ value, onChange }: PeriodFilterProps) {
	return (
		<div className="flex flex-wrap gap-1">
			{periods.map((period) => (
				<Button
					className={cn(
						value === period.value &&
							"bg-primary text-primary-foreground hover:bg-primary/90"
					)}
					key={period.value}
					onClick={() => onChange(period.value)}
					size="sm"
					variant={value === period.value ? "default" : "outline"}
				>
					{period.label}
				</Button>
			))}
		</div>
	);
}
