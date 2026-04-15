"use client";

import { deriveSyncState, getTooltipText } from "@/components/sync-status-icon";
import { useSyncStatus } from "@/components/sync-status-provider";

const STATE_DOT_COLORS: Record<string, string> = {
	synced: "bg-success",
	syncing: "bg-primary animate-pulse",
	pending: "bg-warning",
	offline: "bg-destructive",
	error: "bg-warning",
	retrying: "bg-warning animate-pulse",
	authExpired: "bg-destructive",
	stalled: "bg-destructive",
};

export function SyncStatusIndicator() {
	const status = useSyncStatus();
	const state = deriveSyncState(status);
	const label = getTooltipText(state, status);
	const dotColor = STATE_DOT_COLORS[state] ?? "bg-muted-foreground";

	return (
		<div className="flex items-center justify-center gap-1.5 px-4 py-2.5">
			<span className={`size-1.5 shrink-0 rounded-full ${dotColor}`} />
			<span className="text-xs text-muted-foreground">{label}</span>
		</div>
	);
}
