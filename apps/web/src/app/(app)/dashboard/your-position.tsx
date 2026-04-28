"use client";

import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import { ChevronUp } from "lucide-react";

interface YourPositionEntry {
	rank: number;
	totalLeads: number;
	userId: string;
}

interface YourPositionProps {
	currentUserId: string;
	entries: YourPositionEntry[];
}

export function YourPosition({ currentUserId, entries }: YourPositionProps) {
	const me = entries.find((e) => e.userId === currentUserId);

	if (!me) {
		return null;
	}

	const ahead = entries.find((e) => e.rank === me.rank - 1);
	const gap = ahead ? ahead.totalLeads - me.totalLeads : 0;
	const isLeader = me.rank === 1;

	return (
		<aside
			aria-label="Sua posição no ranking"
			className="mx-4 mt-3 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/[0.04] px-4 py-3"
		>
			<div className="flex items-baseline gap-2">
				<span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
					Você
				</span>
				<span className="font-light text-2xl text-primary leading-none tracking-tight">
					{me.rank}º
				</span>
				<span className="text-muted-foreground text-xs">
					/ {entries.length}
				</span>
			</div>
			<div className="text-right">
				{isLeader ? (
					<span className="font-mono text-[11px] text-primary uppercase tracking-[0.14em]">
						Liderando
					</span>
				) : (
					<span
						className={cn(
							"flex items-center justify-end gap-1 text-xs",
							gap > 0 ? "text-foreground" : "text-muted-foreground"
						)}
					>
						<ChevronUp aria-hidden="true" className="size-3 text-primary" />
						<span className="font-mono tracking-tight">
							+{gap || 1} para {me.rank - 1}º
						</span>
					</span>
				)}
				<p className="mt-0.5 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.14em]">
					{me.totalLeads} {me.totalLeads === 1 ? "lead" : "leads"}
				</p>
			</div>
		</aside>
	);
}
