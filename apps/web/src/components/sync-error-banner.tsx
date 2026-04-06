"use client";

import { Button } from "@dashboard-leads-profills/ui/components/button";
import { AlertTriangle, Lock, RefreshCw } from "lucide-react";
import Link from "next/link";
import { deriveSyncState } from "@/components/sync-status-icon";
import { useSyncStatus } from "@/components/sync-status-provider";

export function SyncErrorBanner() {
	const status = useSyncStatus();
	const state = deriveSyncState(status);

	if (state !== "stalled" && state !== "authExpired") {
		return null;
	}

	return (
		<div
			role="alert"
			className="sticky top-0 z-50 flex items-center justify-between border-b border-destructive/20 bg-destructive/10 px-4 py-2"
		>
			<div className="flex items-center gap-2 text-destructive">
				{state === "authExpired" ? (
					<Lock aria-hidden="true" className="size-4 shrink-0" />
				) : (
					<AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
				)}
				<span className="text-sm">
					{state === "authExpired"
						? "Sessão expirada — faça login para retomar a sincronização"
						: "Sincronização falhou — dados salvos localmente, sem perda"}
				</span>
			</div>
			{state === "stalled" && (
				<Button
					onClick={status.manualRetry}
					size="sm"
					variant="outline"
					className="ml-4 shrink-0"
				>
					<RefreshCw className="mr-1.5 size-3.5" />
					Tentar novamente
				</Button>
			)}
			{state === "authExpired" && (
				<Button asChild size="sm" variant="outline" className="ml-4 shrink-0">
					<Link href="/login">Fazer login</Link>
				</Button>
			)}
		</div>
	);
}
