"use client";

import { authClient } from "@dashboard-leads-profills/auth/client";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@dashboard-leads-profills/ui/components/avatar";
import { Badge } from "@dashboard-leads-profills/ui/components/badge";
import { Button } from "@dashboard-leads-profills/ui/components/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@dashboard-leads-profills/ui/components/card";
import { useLiveQuery } from "dexie-react-hooks";
import {
	AlertTriangle,
	CloudCheck,
	CloudUpload,
	Lock,
	LogOut,
	Moon,
	RefreshCw,
	ShieldCheck,
	Sun,
	Trophy,
	WifiOff,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useRequiredAppAuth } from "@/components/app-auth-provider";
import { deriveSyncState, getTooltipText } from "@/components/sync-status-icon";
import { useSyncStatus } from "@/components/sync-status-provider";
import { clearAuthSnapshot } from "@/lib/auth/auth-snapshot";
import { db } from "@/lib/db/index";
import type { PersonalStats } from "@/lib/lead/stats";
import { getPersonalStats } from "@/lib/lead/stats";
import {
	canRetryAccountSync,
	formatAccountRank,
	getAccountRoleLabel,
	getAccountSyncActionLabel,
} from "./account-presentation";

const ZERO_STATS: PersonalStats = {
	frio: 0,
	hoje: 0,
	morno: 0,
	quente: 0,
	score: 0,
	total: 0,
};

const WHITESPACE_RE = /\s+/;

function getInitials(name: string): string {
	const parts = name.trim().split(WHITESPACE_RE);
	if (parts.length >= 2) {
		return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
	}
	return name.slice(0, 2).toUpperCase();
}

function MetricItem({
	label,
	value,
}: {
	label: string;
	value: number | string;
}) {
	return (
		<div className="flex min-h-16 flex-col justify-center rounded-lg border border-border-subtle bg-muted/30 px-3">
			<span className="font-semibold text-2xl tabular-nums leading-none">
				{value}
			</span>
			<span className="mt-1 text-muted-foreground text-xs">{label}</span>
		</div>
	);
}

function SyncStateIcon({
	state,
}: {
	state: ReturnType<typeof deriveSyncState>;
}) {
	if (state === "synced") {
		return <CloudCheck className="text-success" />;
	}
	if (state === "syncing" || state === "retrying") {
		return <RefreshCw className="animate-spin text-primary" />;
	}
	if (state === "offline") {
		return <WifiOff className="text-destructive" />;
	}
	if (state === "authExpired") {
		return <Lock className="text-destructive" />;
	}
	if (state === "stalled" || state === "error") {
		return <AlertTriangle className="text-warning" />;
	}
	return <CloudUpload className="text-warning" />;
}

export default function AccountPage() {
	const router = useRouter();
	const { setTheme, resolvedTheme } = useTheme();
	const { snapshot } = useRequiredAppAuth();
	const syncStatus = useSyncStatus();
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	const personalStats = useLiveQuery(
		() => getPersonalStats(snapshot.userId),
		[snapshot.userId],
		ZERO_STATS
	);
	const currentRank = useLiveQuery(
		async () => {
			const entry = await db.leaderboardCache.get(snapshot.userId);
			return entry?.rank ?? null;
		},
		[snapshot.userId],
		null
	);

	const stats = personalStats ?? ZERO_STATS;
	const syncState = deriveSyncState(syncStatus);
	const syncLabel = getTooltipText(syncState, syncStatus);
	const canRetrySync = canRetryAccountSync(syncStatus);
	const syncActionLabel = getAccountSyncActionLabel(syncStatus);
	const roleLabel = getAccountRoleLabel(snapshot.userRole);
	const rankLabel = formatAccountRank(currentRank);
	const themeLabel =
		mounted && resolvedTheme === "dark" ? "Tema claro" : "Tema escuro";
	const ThemeIcon = mounted && resolvedTheme === "dark" ? Sun : Moon;

	function handleToggleTheme() {
		setTheme(resolvedTheme === "dark" ? "light" : "dark");
	}

	async function handleSignOut() {
		clearAuthSnapshot();
		await authClient.signOut();
		router.push("/login" as unknown as "/");
	}

	return (
		<main className="mx-auto flex w-full max-w-5xl flex-col gap-4 md:gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="font-semibold text-2xl tracking-normal">Minha Conta</h1>
				<p className="text-muted-foreground text-sm">
					Seu resumo operacional neste dispositivo.
				</p>
			</div>

			<div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
				<div className="flex flex-col gap-4">
					<Card>
						<CardContent className="flex flex-col items-center gap-4 pt-2 text-center">
							<Avatar className="size-20" size="lg">
								<AvatarImage
									alt={snapshot.userName}
									src={snapshot.gravatarUrl}
								/>
								<AvatarFallback className="font-semibold text-xl">
									{getInitials(snapshot.userName)}
								</AvatarFallback>
							</Avatar>
							<div className="flex min-w-0 flex-col items-center gap-2">
								<div className="min-w-0">
									<h2 className="truncate font-semibold text-xl">
										{snapshot.userName}
									</h2>
									<p className="truncate text-muted-foreground text-sm">
										{snapshot.userEmail}
									</p>
								</div>
								<div className="flex flex-wrap justify-center gap-2">
									<Badge
										variant={
											snapshot.userRole === "admin" ? "default" : "secondary"
										}
									>
										<ShieldCheck data-icon="inline-start" />
										{roleLabel}
									</Badge>
									<Badge variant="outline">
										<Trophy data-icon="inline-start" />
										{rankLabel}
									</Badge>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Preferencias</CardTitle>
							<CardDescription>Tema e sessao local.</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-3">
							<Button
								className="justify-start"
								onClick={handleToggleTheme}
								variant="outline"
							>
								<ThemeIcon data-icon="inline-start" />
								{themeLabel}
							</Button>
							<Button
								className="justify-start text-destructive-foreground"
								onClick={handleSignOut}
								variant="destructive"
							>
								<LogOut data-icon="inline-start" />
								Sair da conta
							</Button>
						</CardContent>
					</Card>
				</div>

				<div className="flex flex-col gap-4">
					<Card>
						<CardHeader>
							<CardTitle>Sincronizacao</CardTitle>
							<CardDescription>{syncLabel}</CardDescription>
							<CardAction>
								<span className="inline-flex size-9 items-center justify-center rounded-lg bg-muted">
									<SyncStateIcon state={syncState} />
								</span>
							</CardAction>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<div className="grid grid-cols-2 gap-3">
								<MetricItem label="pendentes" value={syncStatus.pendingCount} />
								<MetricItem
									label="conexao"
									value={syncStatus.isOnline ? "Online" : "Offline"}
								/>
							</div>
							<Button
								disabled={!canRetrySync}
								onClick={syncStatus.manualRetry}
								variant="outline"
							>
								<RefreshCw data-icon="inline-start" />
								{syncActionLabel}
							</Button>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Meu desempenho</CardTitle>
							<CardDescription>Dados locais deste vendedor.</CardDescription>
						</CardHeader>
						<CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
							<MetricItem label="ranking" value={rankLabel} />
							<MetricItem label="leads" value={stats.total} />
							<MetricItem label="hoje" value={stats.hoje} />
							<MetricItem label="score" value={stats.score} />
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Interesses</CardTitle>
							<CardDescription>
								Distribuicao dos leads coletados.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid grid-cols-3 gap-3">
							<MetricItem label="quentes" value={stats.quente} />
							<MetricItem label="mornos" value={stats.morno} />
							<MetricItem label="frios" value={stats.frio} />
						</CardContent>
					</Card>
				</div>
			</div>
		</main>
	);
}
