"use client";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@dashboard-leads-profills/ui/components/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@dashboard-leads-profills/ui/components/chart";
import { Skeleton } from "@dashboard-leads-profills/ui/components/skeleton";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { db } from "@/lib/db/index";
import type { FollowUpStatus } from "@/lib/db/types";
import PeriodFilter, { getPeriodStartDate } from "./period-filter";

const temperatureChartConfig: ChartConfig = {
	quente: {
		label: "Quente",
		theme: { light: "oklch(0.45 0.18 17)", dark: "oklch(0.85 0.12 17)" },
	},
	morno: {
		label: "Morno",
		theme: { light: "oklch(0.5 0.13 85)", dark: "oklch(0.85 0.1 85)" },
	},
	frio: {
		label: "Frio",
		theme: { light: "oklch(0.45 0.15 240)", dark: "oklch(0.85 0.1 240)" },
	},
};

const funnelChartConfig: ChartConfig = {
	pendente: {
		label: "Pendente",
		theme: { light: "oklch(0.55 0.02 260)", dark: "oklch(0.7 0.02 260)" },
	},
	contatado: {
		label: "Contatado",
		theme: { light: "oklch(0.45 0.15 240)", dark: "oklch(0.85 0.1 240)" },
	},
	em_negociacao: {
		label: "Em Negociacao",
		theme: { light: "oklch(0.5 0.13 85)", dark: "oklch(0.85 0.1 85)" },
	},
	convertido: {
		label: "Convertido",
		theme: { light: "oklch(0.5 0.15 145)", dark: "oklch(0.85 0.1 145)" },
	},
	perdido: {
		label: "Perdido",
		theme: { light: "oklch(0.45 0.18 17)", dark: "oklch(0.85 0.12 17)" },
	},
};

const FUNNEL_ORDER: FollowUpStatus[] = [
	"pendente",
	"contatado",
	"em_negociacao",
	"convertido",
	"perdido",
];

const FUNNEL_LABELS: Record<FollowUpStatus, string> = {
	pendente: "Pendente",
	contatado: "Contatado",
	em_negociacao: "Em Negociacao",
	convertido: "Convertido",
	perdido: "Perdido",
};

export default function FunnelTab() {
	const [period, setPeriod] = useState("todos");

	const leads = useLiveQuery(
		() => db.leads.filter((l) => !l.deletedAt).toArray(),
		[]
	);

	const filteredLeads = useMemo(() => {
		if (!leads) {
			return [];
		}
		const startDate = getPeriodStartDate(period);
		return leads.filter((l) => new Date(l.createdAt) >= startDate);
	}, [leads, period]);

	const temperatureData = useMemo(() => {
		const counts = { quente: 0, morno: 0, frio: 0 };
		for (const lead of filteredLeads) {
			counts[lead.interestTag] += 1;
		}
		return [
			{ tag: "Quente", count: counts.quente, fill: "var(--color-quente)" },
			{ tag: "Morno", count: counts.morno, fill: "var(--color-morno)" },
			{ tag: "Frio", count: counts.frio, fill: "var(--color-frio)" },
		];
	}, [filteredLeads]);

	const funnelData = useMemo(() => {
		const counts: Record<FollowUpStatus, number> = {
			pendente: 0,
			contatado: 0,
			em_negociacao: 0,
			convertido: 0,
			perdido: 0,
		};
		for (const lead of filteredLeads) {
			counts[lead.followUpStatus] += 1;
		}
		return FUNNEL_ORDER.map((status) => ({
			status: FUNNEL_LABELS[status],
			count: counts[status],
			fill: `var(--color-${status})`,
		}));
	}, [filteredLeads]);

	const conversionRate = useMemo(() => {
		const total = filteredLeads.length;
		if (total === 0) {
			return 0;
		}
		const convertidos = filteredLeads.filter(
			(l) => l.followUpStatus === "convertido"
		).length;
		return Math.round((convertidos / total) * 100);
	}, [filteredLeads]);

	if (!leads) {
		return (
			<div aria-busy="true" className="flex flex-col gap-4">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-[160px]" />
				<Skeleton className="h-[200px]" />
				<Skeleton className="h-20" />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<PeriodFilter onChange={setPeriod} value={period} />

			<Card>
				<CardHeader>
					<CardTitle>Temperatura dos Leads</CardTitle>
				</CardHeader>
				<CardContent>
					<ChartContainer
						className="h-[120px] w-full"
						config={temperatureChartConfig}
					>
						<BarChart data={temperatureData} layout="vertical">
							<XAxis hide type="number" />
							<YAxis dataKey="tag" type="category" width={60} />
							<ChartTooltip content={<ChartTooltipContent />} />
							<Bar dataKey="count" radius={4} />
						</BarChart>
					</ChartContainer>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Funil de Follow-up</CardTitle>
				</CardHeader>
				<CardContent>
					<ChartContainer
						className="h-[200px] w-full"
						config={funnelChartConfig}
					>
						<BarChart data={funnelData} layout="vertical">
							<XAxis hide type="number" />
							<YAxis dataKey="status" type="category" width={110} />
							<ChartTooltip content={<ChartTooltipContent />} />
							<Bar dataKey="count" radius={4} />
						</BarChart>
					</ChartContainer>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="flex flex-col items-center gap-1 py-6">
					<span className="text-muted-foreground text-sm">
						Taxa de Conversao
					</span>
					<span className="font-semibold text-[40px] text-foreground leading-[1.2]">
						{conversionRate}%
					</span>
					<span className="text-muted-foreground text-xs">
						{
							filteredLeads.filter((l) => l.followUpStatus === "convertido")
								.length
						}{" "}
						convertidos de {filteredLeads.length} leads
					</span>
				</CardContent>
			</Card>
		</div>
	);
}
