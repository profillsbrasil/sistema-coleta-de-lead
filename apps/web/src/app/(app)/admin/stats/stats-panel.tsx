"use client";

import {
	Empty,
	EmptyDescription,
} from "@dashboard-leads-profills/ui/components/empty";
import { Skeleton } from "@dashboard-leads-profills/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/page/page-header";
import { SectionHeading } from "@/components/page/section-heading";
import { StatCard } from "@/components/stat-card";
import { trpc } from "@/utils/trpc";
import StatsCharts from "./stats-charts";
import StatsFilters from "./stats-filters";

interface AppliedFilters {
	endDate?: string;
	segment?: string;
	startDate?: string;
	tag?: "quente" | "morno" | "frio";
	userId?: string;
}

function StatCardsSkeleton() {
	return (
		<div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
			<Skeleton className="h-20" />
			<Skeleton className="h-20" />
			<Skeleton className="h-20" />
			<Skeleton className="h-20" />
		</div>
	);
}

const SKELETON_ROWS = ["s1", "s2", "s3", "s4", "s5"] as const;

function RankingTableSkeleton() {
	return (
		<div className="flex flex-col gap-2">
			{SKELETON_ROWS.map((k) => (
				<Skeleton className="h-10 w-full" key={k} />
			))}
		</div>
	);
}

function RankingContent({
	isLoading,
	isEmpty,
	ranking,
}: {
	isLoading: boolean;
	isEmpty: boolean;
	ranking: Array<{
		userId: string;
		name: string;
		totalLeads: number;
		score: number;
	}>;
}) {
	if (isLoading) {
		return <RankingTableSkeleton />;
	}
	if (isEmpty) {
		return (
			<Empty>
				<EmptyDescription>
					Sem dados para o periodo. Nao ha leads registrados para os filtros
					selecionados. Ajuste o periodo ou remova filtros.
				</EmptyDescription>
			</Empty>
		);
	}
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b text-left text-muted-foreground">
						<th className="pr-4 pb-2 font-medium">#</th>
						<th className="pr-4 pb-2 font-medium">Nome</th>
						<th className="pr-4 pb-2 font-medium">Leads</th>
						<th className="pb-2 font-medium">Score</th>
					</tr>
				</thead>
				<tbody>
					{ranking.map((entry, index) => (
						<tr className="border-b last:border-0" key={entry.userId}>
							<td className="py-2 pr-4 text-muted-foreground">{index + 1}</td>
							<td className="py-2 pr-4 font-medium">{entry.name ?? "—"}</td>
							<td className="py-2 pr-4">{entry.totalLeads}</td>
							<td className="py-2 font-semibold">{entry.score} pts</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export default function StatsPanel() {
	const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({});

	const statsQuery = useQuery(
		trpc.admin.stats.getGlobalStats.queryOptions(appliedFilters)
	);
	const timelineQuery = useQuery(
		trpc.admin.stats.getTimeline.queryOptions(appliedFilters)
	);
	const rankingQuery = useQuery(
		trpc.admin.stats.getRanking.queryOptions(appliedFilters)
	);
	const segmentsQuery = useQuery(
		trpc.admin.stats.getDistinctSegments.queryOptions()
	);
	const vendorsQuery = useQuery(trpc.admin.leads.listVendors.queryOptions());

	const stats = statsQuery.data;
	const ranking = rankingQuery.data ?? [];
	const isLoadingStats = statsQuery.isLoading;
	const isEmpty = !isLoadingStats && stats?.total === 0 && ranking.length === 0;

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-6">
			<PageHeader eyebrow="Admin" title="Estatísticas globais" />

			<div className="px-4">
				<StatsFilters
					isLoading={statsQuery.isFetching}
					onApply={setAppliedFilters}
					segments={segmentsQuery.data ?? []}
					vendors={vendorsQuery.data ?? []}
				/>
			</div>

			{isLoadingStats ? (
				<div className="px-4">
					<StatCardsSkeleton />
				</div>
			) : (
				<div className="grid grid-cols-2 gap-3 px-4 lg:grid-cols-4">
					<StatCard label="Total" value={stats?.total ?? 0} />
					<StatCard label="Score" value={stats?.score ?? 0} />
					<StatCard label="Hoje" value={stats?.today ?? 0} />
					<StatCard label="Ativos" value={stats?.activeVendors ?? 0} />
				</div>
			)}

			<div className="px-4">
				<StatsCharts
					isLoading={timelineQuery.isLoading}
					tagData={{
						quente: stats?.quente ?? 0,
						morno: stats?.morno ?? 0,
						frio: stats?.frio ?? 0,
					}}
					timelineData={timelineQuery.data ?? []}
				/>
			</div>

			<section aria-labelledby="ranking-section">
				<SectionHeading id="ranking-section" meta="Equipe" title="Ranking" />
				<div className="mt-3 px-4">
					<RankingContent
						isEmpty={isEmpty}
						isLoading={rankingQuery.isLoading}
						ranking={ranking}
					/>
				</div>
			</section>
		</div>
	);
}
