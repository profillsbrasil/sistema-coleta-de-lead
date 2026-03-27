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
import { useSidebar } from "@dashboard-leads-profills/ui/components/sidebar";
import { Skeleton } from "@dashboard-leads-profills/ui/components/skeleton";
import { useLiveQuery } from "dexie-react-hooks";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { StatCard } from "@/components/stat-card";
import { getPersonalStats, type PersonalStats } from "@/lib/lead/stats";

const chartConfig: ChartConfig = {
	quente: {
		label: "Quente",
		theme: { light: "oklch(0.45 0.18 17)", dark: "oklch(0.85 0.12 17)" },
	},
	morno: {
		label: "Morno",
		theme: { light: "oklch(0.5 0.13 85)", dark: "oklch(0.85 0.1 85)" },
	},
	frio: {
		label: "Frio",
		theme: { light: "oklch(0.45 0.15 240)", dark: "oklch(0.85 0.1 240)" },
	},
};

interface PersonalDashboardProps {
	overrideStats?: PersonalStats | null;
	userId: string;
}

export default function PersonalDashboard({
	userId,
	overrideStats = null,
}: PersonalDashboardProps) {
	const localStats = useLiveQuery(() => getPersonalStats(userId), [userId]);
	const { open } = useSidebar();

	const stats = overrideStats ?? localStats;

	if (!stats) {
		return (
			<div aria-busy="true" className="flex flex-col gap-4">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<Skeleton className="h-20" />
					<Skeleton className="h-20" />
					<Skeleton className="h-20" />
					<Skeleton className="h-20" />
				</div>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Skeleton className="h-20" />
					<Skeleton className="h-20" />
				</div>
				<Skeleton className="h-[160px]" />
			</div>
		);
	}

	const chartData = [
		{ tag: "Quente", count: stats.quente, fill: "var(--color-quente)" },
		{ tag: "Morno", count: stats.morno, fill: "var(--color-morno)" },
		{ tag: "Frio", count: stats.frio, fill: "var(--color-frio)" },
	];

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard label="Total de Leads" value={stats.total} />
				<StatCard label="Leads Hoje" value={stats.hoje} />
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
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<StatCard
					className="[&_span:first-child]:text-[oklch(0.45_0.15_240)] dark:[&_span:first-child]:text-[oklch(0.85_0.1_240)]"
					label="Frios"
					value={stats.frio}
				/>
				<StatCard label="Seu Score" value={`${stats.score} pts`} />
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Leads por Tag</CardTitle>
				</CardHeader>
				<CardContent>
					<ChartContainer
						className="h-[120px] w-full"
						config={chartConfig}
						key={`leads-chart-${String(open)}`}
					>
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
