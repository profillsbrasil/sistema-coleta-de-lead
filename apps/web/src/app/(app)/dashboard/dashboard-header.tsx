"use client";

import { env } from "@dashboard-leads-profills/env/web";
import { useLiveQuery } from "dexie-react-hooks";
import { EventCountdown } from "@/components/event-countdown";
import { useSyncStatus } from "@/components/sync-status-provider";
import { db } from "@/lib/db/index";

const HAS_EVENT = Boolean(env.NEXT_PUBLIC_EVENT_END);

interface DashboardHeaderProps {
	greeting: string;
	userId: string;
}

const TODAY_LABEL_FORMAT = new Intl.DateTimeFormat("pt-BR", {
	day: "2-digit",
	month: "long",
});

function startOfTodayMs(): number {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	return d.getTime();
}

export function DashboardHeader({ greeting, userId }: DashboardHeaderProps) {
	const { isOnline, pendingCount } = useSyncStatus();

	const todayCount = useLiveQuery(
		() => {
			const since = startOfTodayMs();
			return db.leads
				.where("userId")
				.equals(userId)
				.filter(
					(l) =>
						l.deletedAt === null && new Date(l.createdAt).getTime() >= since
				)
				.count();
		},
		[userId],
		0
	);

	const todayLabel = TODAY_LABEL_FORMAT.format(new Date());

	return (
		<header className="flex flex-col gap-1 px-4 pt-4 pb-2">
			<p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
				{todayLabel}
			</p>
			<h1 className="font-medium text-2xl text-foreground leading-[1.05] tracking-tight">
				{greeting}
			</h1>
			<dl className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.14em]">
				<div className="flex items-center gap-1.5">
					<dt className="text-muted-foreground">Hoje</dt>
					<dd className="text-foreground">
						{todayCount}{" "}
						<span className="text-muted-foreground">
							{todayCount === 1 ? "lead" : "leads"}
						</span>
					</dd>
				</div>
				<div aria-live="polite" className="flex items-center gap-1.5">
					<dt className="sr-only">Sincronização</dt>
					<dd className="flex items-center gap-1.5">
						<span
							aria-hidden="true"
							className={
								isOnline
									? "size-1.5 rounded-full bg-success"
									: "size-1.5 rounded-full bg-warning"
							}
						/>
						<span className={isOnline ? "text-foreground" : "text-warning"}>
							{isOnline ? "Online" : "Offline"}
						</span>
						{pendingCount > 0 && (
							<span className="text-muted-foreground">
								• {pendingCount} pendente{pendingCount === 1 ? "" : "s"}
							</span>
						)}
					</dd>
				</div>
				{HAS_EVENT && (
					<div className="flex items-center gap-1.5">
						<dt className="text-muted-foreground">Evento</dt>
						<dd>
							<EventCountdown />
						</dd>
					</div>
				)}
			</dl>
		</header>
	);
}
