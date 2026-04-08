"use client";

import {
	Empty,
	EmptyDescription,
} from "@dashboard-leads-profills/ui/components/empty";
import { Skeleton } from "@dashboard-leads-profills/ui/components/skeleton";
import { useLiveQuery } from "dexie-react-hooks";
import { Podium } from "@/components/podium";
import { RankingList } from "@/components/ranking-list";
import { db } from "@/lib/db/index";

interface DashboardProps {
	userId: string;
}

export default function Dashboard({ userId }: DashboardProps) {
	const entries = useLiveQuery(
		() => db.leaderboardCache.orderBy("rank").toArray(),
		[]
	);

	const maxLeads =
		entries && entries.length > 0
			? Math.max(...entries.map((e) => e.totalLeads))
			: 0;

	if (entries === undefined) {
		return (
			<div aria-busy="true" className="flex flex-col gap-4 p-4">
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
			<Podium entries={entries} />
			<div className="mx-4 border-border-subtle border-t" />
			<RankingList
				currentUserId={userId}
				entries={entries}
				maxLeads={maxLeads}
			/>
		</div>
	);
}
