"use client";

import { Button } from "@dashboard-leads-profills/ui/components/button";
import { Skeleton } from "@dashboard-leads-profills/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";

const SEVERITY_STYLE: Record<string, string> = {
	critical: "bg-destructive/15 text-destructive",
	high: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
	warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
	info: "bg-muted text-muted-foreground",
};

export function AlertsInbox() {
	const queryClient = useQueryClient();
	const [showRead, setShowRead] = useState(false);

	const alertsQuery = useQuery(
		trpc.whatsapp.alertsList.queryOptions({
			onlyUnread: !showRead,
			limit: 100,
		})
	);

	const markRead = useMutation(
		trpc.whatsapp.alertMarkRead.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: trpc.whatsapp.alertsList.queryKey(),
				});
			},
			onError: (err) => toast.error(`Falha: ${err.message}`),
		})
	);

	if (alertsQuery.isLoading) {
		return (
			<div className="flex flex-col gap-2 px-4">
				<Skeleton className="h-16 w-full" />
				<Skeleton className="h-16 w-full" />
				<Skeleton className="h-16 w-full" />
			</div>
		);
	}

	const items = alertsQuery.data?.items ?? [];
	const unread = alertsQuery.data?.unread ?? 0;

	return (
		<div className="flex flex-col gap-4 px-4">
			<div className="flex items-center justify-between gap-2">
				<p className="text-muted-foreground text-sm">
					{unread} alerta{unread === 1 ? "" : "s"} não lido{unread === 1 ? "" : "s"}
				</p>
				<Button
					onClick={() => setShowRead((v) => !v)}
					size="sm"
					variant="outline"
				>
					{showRead ? "Só não lidos" : "Mostrar todos"}
				</Button>
			</div>

			{items.length === 0 ? (
				<p className="rounded-md border border-dashed py-8 text-center text-muted-foreground text-sm">
					Sem alertas.
				</p>
			) : (
				<ul className="flex flex-col gap-2">
					{items.map((alert) => (
						<li
							key={alert.id}
							className="flex flex-col gap-2 rounded-md border bg-card p-3"
						>
							<div className="flex flex-wrap items-center gap-2">
								<span
									className={`rounded-full px-2 py-0.5 font-medium text-xs ${
										SEVERITY_STYLE[alert.severity] ?? SEVERITY_STYLE.info
									}`}
								>
									{alert.severity}
								</span>
								<span className="font-medium text-sm">{alert.event}</span>
								<span className="ml-auto text-muted-foreground text-xs">
									{new Date(alert.createdAt).toLocaleString("pt-BR")}
								</span>
							</div>
							<pre className="overflow-x-auto rounded bg-muted/40 p-2 text-xs">
								{JSON.stringify(alert.payload, null, 2)}
							</pre>
							{alert.readAt === null && (
								<div className="flex justify-end">
									<Button
										disabled={markRead.isPending}
										onClick={() => markRead.mutate({ id: alert.id })}
										size="sm"
										variant="ghost"
									>
										Marcar como lido
									</Button>
								</div>
							)}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
