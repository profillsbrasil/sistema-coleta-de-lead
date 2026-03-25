"use client";

import { Card } from "@dashboard-leads-profills/ui/components/card";

interface LeaderboardEntryProps {
	isCurrentUser: boolean;
	name: string;
	rank: number;
	score: number;
	totalLeads: number;
}

export function LeaderboardEntry({
	rank,
	name,
	totalLeads,
	score,
	isCurrentUser,
}: LeaderboardEntryProps) {
	return (
		<Card
			className={`p-4 ${isCurrentUser ? "border-2 border-primary bg-primary/5 dark:bg-primary/10" : "border border-border"}`}
			{...(isCurrentUser ? { "aria-current": "true" as const } : {})}
		>
			<div className="flex items-start gap-3">
				<span className="min-w-6 text-muted-foreground text-xs">#{rank}</span>
				<div className="flex-1">
					<p className="font-semibold text-sm">
						{name}
						{isCurrentUser ? " (voce)" : ""}
					</p>
					<div className="flex justify-between">
						<span className="text-muted-foreground text-xs">
							{totalLeads} leads
						</span>
						<span className="font-semibold text-sm">{score} pts</span>
					</div>
				</div>
			</div>
		</Card>
	);
}
