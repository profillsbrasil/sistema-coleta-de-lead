"use client";

import {
	Empty,
	EmptyDescription,
} from "@dashboard-leads-profills/ui/components/empty";
import { Skeleton } from "@dashboard-leads-profills/ui/components/skeleton";
import { useLiveQuery } from "dexie-react-hooks";
import { PersonalStatsBar } from "@/components/personal-stats-bar";
import { Podium } from "@/components/podium";
import { RankingList } from "@/components/ranking-list";
import { db } from "@/lib/db/index";
import { getPersonalStats } from "@/lib/lead/stats";

interface DashboardProps {
	gravatarUrl: string;
	userId: string;
	userName: string;
}

export default function Dashboard({
	gravatarUrl,
	userId,
	userName,
}: DashboardProps) {
	const personalStats = useLiveQuery(
		() => getPersonalStats(userId),
		[userId]
	);

	const entries = useLiveQuery(
		() => db.leaderboardCache.orderBy("rank").toArray(),
		[]
	);

	const currentUserRank =
		entries?.find((e) => e.userId === userId)?.rank ?? null;

	const maxLeads =
		entries && entries.length > 0
			? Math.max(...entries.map((e) => e.totalLeads))
			: 0;

	if (entries === undefined) {
		return (
			<div aria-busy="true" className="flex flex-col gap-4 p-4">
				<Skeleton className="h-16 w-full" />
				<Skeleton className="h-48 w-full" />
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
			</div>
		);
	}

	if (entries.length === 0) {
		return (
			<Empty className="py-16">
				<EmptyDescription>
					Conecte-se a internet para ver o ranking da equipe.
				</EmptyDescription>
			</Empty>
		);
	}

	return (
		<div className="flex flex-col">
			<PersonalStatsBar
				gravatarUrl={gravatarUrl}
				leads={personalStats?.total ?? 0}
				leadsToday={personalStats?.hoje ?? 0}
				rank={currentUserRank}
				userName={userName}
			/>
			<Podium entries={entries} />
			<div className="mx-4 border-t border-border-subtle" />
			<RankingList
				currentUserId={userId}
				entries={entries}
				maxLeads={maxLeads}
			/>
		</div>
	);
}
