"use client";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@dashboard-leads-profills/ui/components/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@dashboard-leads-profills/ui/components/chart";
import { Skeleton } from "@dashboard-leads-profills/ui/components/skeleton";
import { Bar, BarChart, Line, LineChart, XAxis, YAxis } from "recharts";

interface StatsChartsProps {
	isLoading?: boolean;
	tagData: { quente: number; morno: number; frio: number };
	timelineData: Array<{ date: string; count: number }>;
}

const tagChartConfig: ChartConfig = {
	count: { label: "Leads" },
};

const timelineChartConfig: ChartConfig = {
	count: { label: "Leads", color: "var(--chart-1)" },
};

function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function StatsCharts({
	tagData,
	timelineData,
	isLoading,
}: StatsChartsProps) {
	if (isLoading) {
		return (
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<Skeleton className="h-[160px]" />
				<Skeleton className="h-[160px]" />
			</div>
		);
	}

	const barData = [
		{ tag: "Quente", count: tagData.quente, fill: "oklch(0.45 0.18 17)" },
		{ tag: "Morno", count: tagData.morno, fill: "oklch(0.5 0.13 85)" },
		{ tag: "Frio", count: tagData.frio, fill: "oklch(0.45 0.15 240)" },
	];

	const lineData = timelineData.map((d) => ({
		date: formatDate(d.date),
		count: d.count,
	}));

	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle>Leads por Tag</CardTitle>
				</CardHeader>
				<CardContent>
					<ChartContainer className="h-[160px] w-full" config={tagChartConfig}>
						<BarChart data={barData}>
							<XAxis dataKey="tag" />
							<YAxis />
							<ChartTooltip content={<ChartTooltipContent />} />
							<Bar dataKey="count" radius={4} />
						</BarChart>
					</ChartContainer>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Leads ao Longo do Tempo</CardTitle>
				</CardHeader>
				<CardContent>
					<ChartContainer
						className="h-[160px] w-full"
						config={timelineChartConfig}
					>
						<LineChart data={lineData}>
							<XAxis dataKey="date" />
							<YAxis />
							<ChartTooltip content={<ChartTooltipContent />} />
							<Line
								dataKey="count"
								dot={false}
								stroke="var(--chart-1)"
								strokeWidth={2}
								type="monotone"
							/>
						</LineChart>
					</ChartContainer>
				</CardContent>
			</Card>
		</div>
	);
}
