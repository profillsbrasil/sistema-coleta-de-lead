"use client";

import {
	Avatar,
	AvatarFallback,
} from "@dashboard-leads-profills/ui/components/avatar";
import { cn } from "@dashboard-leads-profills/ui/lib/utils";

export interface RankingEntry {
	name: string;
	rank: number;
	score: number;
	totalLeads: number;
	userId: string;
}

interface RankingListProps {
	currentUserId: string;
	entries: RankingEntry[];
	maxLeads: number;
}

const WHITESPACE_RE = /\s+/;

function getInitials(name: string): string {
	const parts = name.trim().split(WHITESPACE_RE);
	if (parts.length >= 2) {
		return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
	}
	return name.slice(0, 2).toUpperCase();
}

export function RankingList({
	currentUserId,
	entries,
	maxLeads,
}: RankingListProps) {
	const restEntries = entries.filter((e) => e.rank > 3);

	if (restEntries.length === 0) {
		return null;
	}

	const MAX_STAGGER_DELAY = 1.2;
	const PER_ITEM_DELAY = 0.08;
	const BASE_DELAY = 0.4;

	return (
		<ol className="flex list-none flex-col divide-y divide-border-subtle px-4 pb-4">
			{restEntries.map((entry, index) => {
				const isCurrentUser = entry.userId === currentUserId;
				const progress = maxLeads > 0 ? (entry.totalLeads / maxLeads) * 100 : 0;
				const delay = Math.min(
					BASE_DELAY + index * PER_ITEM_DELAY,
					MAX_STAGGER_DELAY
				);

				return (
					<li
						aria-current={isCurrentUser ? "true" : undefined}
						className={cn(
							"py-2.5",
							isCurrentUser &&
								"-mx-3 rounded-lg border border-primary/15 bg-primary/[0.04] px-3"
						)}
						key={entry.userId}
						style={{
							animation: `ranking-fade-in 0.4s ease-out ${delay}s both`,
						}}
					>
						<div className="mb-1.5 flex items-center gap-2">
							<span
								className={cn(
									"w-5 text-xs",
									isCurrentUser
										? "font-semibold text-primary"
										: "text-muted-foreground"
								)}
							>
								<span className="sr-only">Posição </span>
								{entry.rank}
							</span>
							<Avatar aria-hidden="true" className="size-6 bg-card">
								<AvatarFallback className="text-xs">
									{getInitials(entry.name)}
								</AvatarFallback>
							</Avatar>
							<span
								className={cn(
									"flex-1 text-sm",
									isCurrentUser
										? "text-foreground"
										: "text-secondary-foreground"
								)}
							>
								{isCurrentUser ? "Você" : entry.name}
							</span>
							<span
								className={cn(
									"text-sm",
									isCurrentUser
										? "font-medium text-foreground"
										: "text-muted-foreground"
								)}
							>
								{entry.totalLeads}
								<span className="sr-only"> leads</span>
							</span>
						</div>
						<div
							aria-label={`Progresso: ${entry.totalLeads} de ${maxLeads} leads`}
							aria-valuemax={maxLeads}
							aria-valuemin={0}
							aria-valuenow={entry.totalLeads}
							className="ml-[52px] h-1 overflow-hidden rounded-full bg-secondary"
							role="progressbar"
						>
							<div
								className={cn(
									"h-full rounded-full transition-all duration-700",
									isCurrentUser ? "bg-primary" : "bg-muted-foreground/40"
								)}
								style={{ width: `${progress}%` }}
							/>
						</div>
					</li>
				);
			})}
		</ol>
	);
}
