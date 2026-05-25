"use client";

import { Skeleton } from "@dashboard-leads-profills/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

function formatPct(v: number): string {
	return `${(v * 100).toFixed(1)}%`;
}

function Card({
	label,
	value,
	hint,
}: {
	label: string;
	value: string | number;
	hint?: string;
}) {
	return (
		<div className="flex flex-col gap-1 rounded-md border bg-card p-4">
			<p className="text-muted-foreground text-xs uppercase tracking-wide">
				{label}
			</p>
			<p className="font-semibold text-2xl">{value}</p>
			{hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
		</div>
	);
}

export function HealthDashboard() {
	const healthQuery = useQuery(trpc.whatsapp.healthSummary.queryOptions());

	if (healthQuery.isLoading || !healthQuery.data) {
		return (
			<div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 lg:grid-cols-4">
				<Skeleton className="h-24 w-full" />
				<Skeleton className="h-24 w-full" />
				<Skeleton className="h-24 w-full" />
				<Skeleton className="h-24 w-full" />
			</div>
		);
	}

	const data = healthQuery.data;
	const dropRateBad = data.messages.dropRate > 0.05;

	return (
		<div className="flex flex-col gap-6 px-4">
			<section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<Card label="Inbound (24h)" value={data.messages.inbound} />
				<Card label="Outbound OK (24h)" value={data.messages.outboundOk} />
				<Card
					label="Outbound failed (24h)"
					value={data.messages.outboundFailed}
				/>
				<Card
					label="Drop rate"
					value={formatPct(data.messages.dropRate)}
					hint={dropRateBad ? "⚠️ acima de 5% — investigar" : "saudável"}
				/>
			</section>

			<section>
				<h2 className="mb-2 font-semibold text-sm">Leads por estado</h2>
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					{data.participantStates.map((s) => (
						<Card key={s.state} label={s.state} value={s.n} />
					))}
				</div>
			</section>

			{data.topFailedCodes.length > 0 ? (
				<section>
					<h2 className="mb-2 font-semibold text-sm">
						Top códigos de falha (24h)
					</h2>
					<ul className="flex flex-col gap-1 rounded-md border bg-card p-3 text-sm">
						{data.topFailedCodes.map((c) => (
							<li
								className="flex items-center justify-between"
								key={String(c.code)}
							>
								<span>{c.code ?? "(sem code)"}</span>
								<span className="font-medium">{c.n}</span>
							</li>
						))}
					</ul>
				</section>
			) : null}

			{data.pricing.length > 0 ? (
				<section>
					<h2 className="mb-2 font-semibold text-sm">
						Mensagens por categoria de pricing (24h)
					</h2>
					<ul className="flex flex-col gap-1 rounded-md border bg-card p-3 text-sm">
						{data.pricing.map((p) => (
							<li
								className="flex items-center justify-between"
								key={p.category ?? "unknown"}
							>
								<span>{p.category ?? "unknown"}</span>
								<span className="text-muted-foreground">
									{p.billable} cobradas / {p.total} totais
								</span>
							</li>
						))}
					</ul>
				</section>
			) : null}

			<p className="text-muted-foreground text-xs">
				Janela: {new Date(data.window.from).toLocaleString("pt-BR")} →{" "}
				{new Date(data.window.to).toLocaleString("pt-BR")}
			</p>
		</div>
	);
}
