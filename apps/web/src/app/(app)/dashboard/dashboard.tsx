"use client";

import {
	Empty,
	EmptyDescription,
} from "@dashboard-leads-profills/ui/components/empty";
import { Skeleton } from "@dashboard-leads-profills/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { PersonalStatsBar } from "@/components/personal-stats-bar";
import { Podium } from "@/components/podium";
import { RankingList } from "@/components/ranking-list";
import { db } from "@/lib/db/index";
import { getPersonalStats } from "@/lib/lead/stats";
import { trpc } from "@/utils/trpc";

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
	const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

	const personalStats = useLiveQuery(
		() => getPersonalStats(userId),
		[userId]
	);

	const { data: serverData, isLoading } = useQuery(
		trpc.leaderboard.getRanking.queryOptions()
	);

	const cachedEntries = useLiveQuery(
		() => db.leaderboardCache.orderBy("rank").toArray(),
		[]
	);

	useEffect(() => {
		if (!serverData) {
			return;
		}

		const cacheData = async () => {
			await db.leaderboardCache.clear();
			const entries = serverData.ranking.map((r) => ({
				userId: r.userId,
				name: r.name,
				totalLeads: r.totalLeads,
				score: r.score,
				rank: r.rank,
				lastSyncAt: serverData.serverTimestamp,
			}));
			await db.leaderboardCache.bulkPut(entries);
			setLastSyncAt(serverData.serverTimestamp);
		};

		cacheData();
	}, [serverData]);

	useEffect(() => {
		if (cachedEntries && cachedEntries.length > 0 && !lastSyncAt) {
			setLastSyncAt(cachedEntries[0].lastSyncAt);
		}
	}, [cachedEntries, lastSyncAt]);

	const displayEntries = serverData
		? serverData.ranking.map((r) => ({
				...r,
				lastSyncAt: serverData.serverTimestamp,
			}))
		: (cachedEntries ?? []);

	const currentUserRank =
		displayEntries.find((e) => e.userId === userId)?.rank ?? null;

	const maxLeads =
		displayEntries.length > 0
			? Math.max(...displayEntries.map((e) => e.totalLeads))
			: 0;

	if (isLoading && (!cachedEntries || cachedEntries.length === 0)) {
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

	if (displayEntries.length === 0) {
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
			<Podium entries={displayEntries} />
			<div className="mx-4 border-t border-border-subtle" />
			<RankingList
				currentUserId={userId}
				entries={displayEntries}
				maxLeads={maxLeads}
			/>
		</div>
	);
}
