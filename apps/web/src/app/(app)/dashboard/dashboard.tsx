"use client";

import { Skeleton } from "@dashboard-leads-profills/ui/components/skeleton";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/page/empty-state";
import { SectionHeading } from "@/components/page/section-heading";
import { Podium } from "@/components/podium";
import { RankingList } from "@/components/ranking-list";
import { db } from "@/lib/db/index";
import { DashboardHeader } from "./dashboard-header";
import PersonalDashboard from "./personal-dashboard";
import { YourPosition } from "./your-position";

interface DashboardProps {
	greeting: string;
	userId: string;
}

export default function Dashboard({ greeting, userId }: DashboardProps) {
	const entries = useLiveQuery(
		() => db.leaderboardCache.orderBy("rank").toArray(),
		[]
	);

	const isLoading = entries === undefined;
	const isEmpty = entries !== undefined && entries.length === 0;
	const maxLeads =
		entries && entries.length > 0
			? Math.max(...entries.map((e) => e.totalLeads))
			: 0;

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-6">
			<DashboardHeader greeting={greeting} userId={userId} />

			<section aria-labelledby="personal-stats-heading" className="px-4">
				<h2 className="sr-only" id="personal-stats-heading">
					Seus números
				</h2>
				<PersonalDashboard userId={userId} />
			</section>

			<section
				aria-labelledby="ranking-heading"
				className="flex flex-col gap-3"
			>
				<SectionHeading id="ranking-heading" meta="Equipe" title="Ranking" />

				{isLoading && (
					<div
						aria-busy="true"
						aria-live="polite"
						className="flex flex-col gap-3 px-4"
						role="status"
					>
						<span className="sr-only">Carregando ranking</span>
						<Skeleton className="h-40 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				)}

				{isEmpty && (
					<EmptyState
						cta={{ href: "/leads/new", icon: Plus, label: "Novo lead" }}
						description="Pode coletar leads mesmo sem internet — o ranking aparece quando voltar online."
						title="Sem ranking ainda"
					/>
				)}

				{!(isLoading || isEmpty) && entries && (
					<>
						<YourPosition currentUserId={userId} entries={entries} />
						<Podium entries={entries} />
						{entries.some((e) => e.rank > 3) && (
							<>
								<div className="mx-4 border-border-subtle border-t" />
								<RankingList
									currentUserId={userId}
									entries={entries}
									maxLeads={maxLeads}
								/>
							</>
						)}
					</>
				)}
			</section>
		</div>
	);
}
