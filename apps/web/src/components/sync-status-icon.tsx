"use client";

import { buttonVariants } from "@dashboard-leads-profills/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@dashboard-leads-profills/ui/components/tooltip";
import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
	AlertTriangle,
	CloudCheck,
	CloudUpload,
	Lock,
	RefreshCw,
	WifiOff,
	XCircle,
} from "lucide-react";
import { useSyncStatus } from "@/components/sync-status-provider";
import { relativeTime } from "@/lib/lead/relative-time";

export type SyncState =
	| "offline"
	| "authExpired"
	| "stalled"
	| "retrying"
	| "syncing"
	| "error"
	| "pending"
	| "synced";

interface SyncStatus {
	authExpired: boolean;
	isOnline: boolean;
	isStalled: boolean;
	isSyncing: boolean;
	lastError: string | null;
	lastSync: string | null;
	pendingCount: number;
	retryAttempt: number | null;
	totalRetries: number;
}

export function deriveSyncState(status: SyncStatus): SyncState {
	if (!status.isOnline) {
		return "offline";
	}
	if (status.authExpired) {
		return "authExpired";
	}
	if (status.isStalled) {
		return "stalled";
	}
	if (status.retryAttempt != null) {
		return "retrying";
	}
	if (status.isSyncing) {
		return "syncing";
	}
	if (status.lastError !== null) {
		return "error";
	}
	if (status.pendingCount > 0) {
		return "pending";
	}
	return "synced";
}

export function getTooltipText(state: SyncState, status: SyncStatus): string {
	if (state === "offline") {
		return "Sem conexao";
	}
	if (state === "authExpired") {
		return "Sessao expirada — faca login";
	}
	if (state === "stalled") {
		return "Sync falhou — clique para tentar de novo";
	}
	if (state === "retrying") {
		return `Tentando novamente... (${status.retryAttempt}/${status.totalRetries})`;
	}
	if (state === "syncing") {
		return "Sincronizando...";
	}
	if (state === "error") {
		return "Erro no ultimo sync";
	}
	if (state === "pending") {
		return status.pendingCount === 1
			? "1 alteracao pendente"
			: `${status.pendingCount} alteracoes pendentes`;
	}
	if (status.lastSync) {
		return `Atualizado ${relativeTime(status.lastSync)}`;
	}
	return "Sincronizado";
}

export function formatBadgeCount(count: number): string | null {
	if (count <= 0) {
		return null;
	}
	if (count > 99) {
		return "99+";
	}
	return String(count);
}

const STATE_CONFIG = {
	offline: { icon: WifiOff, className: "text-destructive" },
	authExpired: { icon: Lock, className: "text-destructive" },
	stalled: { icon: XCircle, className: "text-destructive" },
	retrying: { icon: RefreshCw, className: "text-warning animate-spin" },
	syncing: { icon: RefreshCw, className: "text-primary animate-spin" },
	error: { icon: AlertTriangle, className: "text-warning" },
	pending: { icon: CloudUpload, className: "text-muted-foreground" },
	synced: { icon: CloudCheck, className: "text-primary" },
} as const satisfies Record<SyncState, { icon: LucideIcon; className: string }>;

export function SyncStatusIcon() {
	const status = useSyncStatus();
	const state = deriveSyncState(status);
	const tooltipText = getTooltipText(state, status);
	const badgeText = formatBadgeCount(status.pendingCount);
	const { icon: Icon, className: iconClassName } = STATE_CONFIG[state];

	return (
		<TooltipProvider delay={500}>
			<Tooltip>
				<TooltipTrigger
					render={
						<span
							aria-hidden="true"
							className={cn(
								buttonVariants({ size: "icon-sm", variant: "ghost" }),
								"cursor-inherit"
							)}
						/>
					}
				>
					<span className="relative inline-flex items-center justify-center">
						<Icon aria-hidden="true" className={cn("size-4", iconClassName)} />
						{badgeText !== null && (
							<span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-0.5 font-semibold text-xs text-warning-foreground tabular-nums">
								{badgeText}
							</span>
						)}
					</span>
				</TooltipTrigger>
				<TooltipContent side="top">{tooltipText}</TooltipContent>
			</Tooltip>
			<span aria-live="polite" className="sr-only">
				{tooltipText}
			</span>
		</TooltipProvider>
	);
}
