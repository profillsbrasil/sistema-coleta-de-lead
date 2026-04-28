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
import { getPersonalStats, type PersonalStats } from "@/lib/lead/stats";

const chartConfig: ChartConfig = {
	quente: {
		label: "Quente",
		color: "var(--tag-quente-text)",
	},
	morno: {
		label: "Morno",
		color: "var(--tag-morno-text)",
	},
	frio: {
		label: "Frio",
		color: "var(--tag-frio-text)",
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

	const stats = overrideStats ?? localStats;

	if (!stats) {
		return (
			<div
				aria-busy="true"
				aria-live="polite"
				className="flex flex-col gap-4"
				role="status"
			>
				<span className="sr-only">Carregando suas estatísticas</span>
				<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
					<Skeleton className="h-20" />
					<Skeleton className="h-20" />
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
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<StatCard label="Total" value={stats.total} />
				<StatCard label="Hoje" value={stats.hoje} />
				<StatCard label="Score" value={stats.score} />
				<StatCard
					className="[&_span:nth-child(2)]:text-tag-quente-text"
					label="Quentes"
					value={stats.quente}
				/>
			</div>

			{stats.total > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
							Leads por tag
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer className="h-[120px] w-full" config={chartConfig}>
							<BarChart data={chartData} layout="vertical">
								<XAxis hide type="number" />
								<YAxis
									axisLine={false}
									dataKey="tag"
									tickLine={false}
									type="category"
									width={60}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="count" radius={4} />
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
