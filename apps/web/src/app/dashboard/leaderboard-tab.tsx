"use client";

import { Skeleton } from "@dashboard-leads-profills/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { LeaderboardEntry } from "@/components/leaderboard-entry";
import { StalenessIndicator } from "@/components/staleness-indicator";
import { db } from "@/lib/db/index";
import { trpc } from "@/utils/trpc";

export default function LeaderboardTab({ userId }: { userId: string }) {
	const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

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
			const entries = serverData.ranking.map((r, i) => ({
				userId: r.userId,
				name: r.name,
				totalLeads: r.totalLeads,
				score: r.score,
				rank: i + 1,
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

	const [, setTick] = useState(0);
	useEffect(() => {
		const interval = setInterval(() => setTick((t) => t + 1), 60_000);
		return () => clearInterval(interval);
	}, []);

	const displayEntries = serverData
		? serverData.ranking.map((r, i) => ({
				...r,
				rank: i + 1,
				lastSyncAt: serverData.serverTimestamp,
			}))
		: (cachedEntries ?? []);

	if (isLoading && (!cachedEntries || cachedEntries.length === 0)) {
		return (
			<div aria-busy="true" className="space-y-2">
				<Skeleton className="h-4 w-40" />
				<Skeleton className="h-20" />
				<Skeleton className="h-20" />
				<Skeleton className="h-20" />
			</div>
		);
	}

	if (displayEntries.length === 0) {
		return (
			<p className="py-8 text-center text-muted-foreground text-sm">
				Conecte-se a internet para ver o ranking da equipe.
			</p>
		);
	}

	return (
		<div className="space-y-2">
			<StalenessIndicator lastSyncAt={lastSyncAt} />
			<ol className="space-y-2">
				{displayEntries.map((entry) => (
					<li key={entry.userId}>
						<LeaderboardEntry
							isCurrentUser={entry.userId === userId}
							name={entry.name}
							rank={entry.rank}
							score={entry.score}
							totalLeads={entry.totalLeads}
						/>
					</li>
				))}
			</ol>
		</div>
	);
}
