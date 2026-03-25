"use client";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@dashboard-leads-profills/ui/components/card";
import {
	Empty,
	EmptyDescription,
} from "@dashboard-leads-profills/ui/components/empty";
import { Skeleton } from "@dashboard-leads-profills/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { StatCard } from "@/components/stat-card";
import { trpc } from "@/utils/trpc";
import StatsCharts from "./stats-charts";
import StatsFilters from "./stats-filters";

interface AppliedFilters {
	userId?: string;
	tag?: "quente" | "morno" | "frio";
	segment?: string;
	startDate?: string;
	endDate?: string;
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

function RankingTableSkeleton() {
	return (
		<div className="space-y-2">
			{Array.from({ length: 5 }).map((_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows have no meaningful key
				<Skeleton key={i} className="h-10 w-full" />
			))}
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
		<div>
			<h1 className="mb-6 font-semibold text-xl">Estatisticas Globais</h1>

			<StatsFilters
				isLoading={statsQuery.isFetching}
				onApply={setAppliedFilters}
				segments={segmentsQuery.data ?? []}
				vendors={vendorsQuery.data ?? []}
			/>

			{isLoadingStats ? (
				<StatCardsSkeleton />
			) : (
				<div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
					<StatCard label="Total de Leads" value={stats?.total ?? 0} />
					<StatCard
						label="Score Total"
						value={`${stats?.score ?? 0} pts`}
					/>
					<StatCard label="Leads Hoje" value={stats?.today ?? 0} />
					<StatCard
						label="Vendedores Ativos"
						value={stats?.activeVendors ?? 0}
					/>
				</div>
			)}

			<div className="mb-6">
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

			<Card>
				<CardHeader>
					<CardTitle>Ranking</CardTitle>
				</CardHeader>
				<CardContent>
					{rankingQuery.isLoading ? (
						<RankingTableSkeleton />
					) : isEmpty ? (
						<Empty>
							<EmptyDescription>
								Sem dados para o periodo. Nao ha leads registrados para os
								filtros selecionados. Ajuste o periodo ou remova filtros.
							</EmptyDescription>
						</Empty>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b text-left text-muted-foreground">
										<th className="pb-2 pr-4 font-medium">#</th>
										<th className="pb-2 pr-4 font-medium">Nome</th>
										<th className="pb-2 pr-4 font-medium">Leads</th>
										<th className="pb-2 font-medium">Score</th>
									</tr>
								</thead>
								<tbody>
									{ranking.map((entry, index) => (
										<tr
											key={entry.userId}
											className="border-b last:border-0"
										>
											<td className="py-2 pr-4 text-muted-foreground">
												{index + 1}
											</td>
											<td className="py-2 pr-4 font-medium">
												{entry.name ?? "—"}
											</td>
											<td className="py-2 pr-4">{entry.totalLeads}</td>
											<td className="py-2 font-semibold">
												{entry.score} pts
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
