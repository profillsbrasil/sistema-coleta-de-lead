"use client";

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@dashboard-leads-profills/ui/components/avatar";
import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import { EventCountdown } from "@/components/event-countdown";

interface PersonalStatsBarProps {
	className?: string;
	gravatarUrl: string;
	leads: number;
	leadsToday: number;
	rank: number | null;
	userName: string;
}

const WHITESPACE_RE = /\s+/;

function getInitials(name: string): string {
	const parts = name.trim().split(WHITESPACE_RE);
	if (parts.length >= 2) {
		return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
	}
	return name.slice(0, 2).toUpperCase();
}

export function PersonalStatsBar({
	className,
	gravatarUrl,
	leads,
	leadsToday,
	rank,
	userName,
}: PersonalStatsBarProps) {
	return (
		<div
			className={cn(
				"flex items-center justify-between gap-4 border-b border-border-subtle px-4 py-3",
				className
			)}
		>
			<div className="flex items-center gap-3">
				<Avatar className="size-10">
					<AvatarImage alt={userName} src={gravatarUrl} />
					<AvatarFallback>{getInitials(userName)}</AvatarFallback>
				</Avatar>
				<div>
					<p className="text-sm text-foreground">{userName}</p>
					<p className="text-xs text-muted-foreground">
						Posicao:{" "}
						<span className="font-semibold text-primary">
							#{rank ?? "—"}
						</span>
					</p>
				</div>
			</div>
			<div className="flex-1 text-center">
				<EventCountdown />
			</div>
			<div className="flex items-center gap-6">
				<div className="text-center">
					<p className="text-xl text-foreground">{leads}</p>
					<p className="text-[11px] text-muted-foreground">Leads</p>
				</div>
				<div className="h-8 w-px bg-border-subtle" />
				<div className="text-center">
					<p className="text-xl text-foreground">{leadsToday}</p>
					<p className="text-[11px] text-muted-foreground">Hoje</p>
				</div>
			</div>
		</div>
	);
}
