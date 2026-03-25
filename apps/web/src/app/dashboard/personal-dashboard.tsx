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
import { useLiveQuery } from "dexie-react-hooks";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { StatCard } from "@/components/stat-card";
import { getPersonalStats } from "@/lib/lead/stats";

const chartConfig: ChartConfig = {
	quente: { label: "Quente", color: "oklch(0.45 0.18 17)" },
	morno: { label: "Morno", color: "oklch(0.5 0.13 85)" },
	frio: { label: "Frio", color: "oklch(0.45 0.15 240)" },
};

export default function PersonalDashboard({ userId }: { userId: string }) {
	const stats = useLiveQuery(() => getPersonalStats(userId), [userId]);

	if (!stats) {
		return (
			<div aria-busy="true" className="space-y-4">
				<div className="grid grid-cols-2 gap-2">
					<Skeleton className="h-20" />
					<Skeleton className="h-20" />
				</div>
				<div className="grid grid-cols-3 gap-2">
					<Skeleton className="h-20" />
					<Skeleton className="h-20" />
					<Skeleton className="h-20" />
				</div>
				<Skeleton className="h-20" />
				<Skeleton className="h-[160px]" />
			</div>
		);
	}

	const chartData = [
		{ tag: "Quente", count: stats.quente, fill: "oklch(0.45 0.18 17)" },
		{ tag: "Morno", count: stats.morno, fill: "oklch(0.5 0.13 85)" },
		{ tag: "Frio", count: stats.frio, fill: "oklch(0.45 0.15 240)" },
	];

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-2">
				<StatCard label="Total de Leads" value={stats.total} />
				<StatCard label="Leads Hoje" value={stats.hoje} />
			</div>

			<div className="grid grid-cols-3 gap-2">
				<StatCard
					className="[&_span:first-child]:text-[oklch(0.45_0.18_17)] dark:[&_span:first-child]:text-[oklch(0.85_0.12_17)]"
					label="Quentes"
					value={stats.quente}
				/>
				<StatCard
					className="[&_span:first-child]:text-[oklch(0.5_0.13_85)] dark:[&_span:first-child]:text-[oklch(0.85_0.1_85)]"
					label="Mornos"
					value={stats.morno}
				/>
				<StatCard
					className="[&_span:first-child]:text-[oklch(0.45_0.15_240)] dark:[&_span:first-child]:text-[oklch(0.85_0.1_240)]"
					label="Frios"
					value={stats.frio}
				/>
			</div>

			<StatCard label="Seu Score" value={`${stats.score} pts`} />

			<Card>
				<CardHeader>
					<CardTitle>Leads por Tag</CardTitle>
				</CardHeader>
				<CardContent>
					<ChartContainer className="h-[120px] w-full" config={chartConfig}>
						<BarChart data={chartData} layout="vertical">
							<XAxis hide type="number" />
							<YAxis dataKey="tag" type="category" width={60} />
							<ChartTooltip content={<ChartTooltipContent />} />
							<Bar dataKey="count" radius={4} />
						</BarChart>
					</ChartContainer>
				</CardContent>
			</Card>
		</div>
	);
}
