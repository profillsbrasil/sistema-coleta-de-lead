"use client";

import {
	Avatar,
	AvatarFallback,
} from "@dashboard-leads-profills/ui/components/avatar";
import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import { Star } from "lucide-react";

export interface PodiumEntry {
	name: string;
	rank: number;
	score: number;
	totalLeads: number;
	userId: string;
}

interface PodiumProps {
	entries: PodiumEntry[];
	eventName?: string;
}

const WHITESPACE_RE = /\s+/;

function getInitials(name: string): string {
	const parts = name.trim().split(WHITESPACE_RE);
	if (parts.length >= 2) {
		return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
	}
	return name.slice(0, 2).toUpperCase();
}

function getShortName(name: string): string {
	const parts = name.trim().split(WHITESPACE_RE);
	if (parts.length >= 2) {
		return `${parts[0]} ${parts.at(-1)?.[0] ?? ""}.`;
	}
	return name;
}

const PODIUM_CONFIG = {
	1: {
		avatarSize: "size-12",
		avatarText: "text-base",
		border: "border-2 border-primary shadow-[0_0_16px_rgba(62,207,142,0.25)]",
		barHeight: "h-[88px]",
		barBg: "bg-gradient-to-b from-primary/10 to-primary/[0.02] border border-primary/20",
		numberColor: "text-primary",
		numberSize: "text-3xl",
		nameColor: "text-foreground font-medium",
		statsColor: "text-primary text-[11px] font-medium",
	},
	2: {
		avatarSize: "size-10",
		avatarText: "text-sm",
		border: "border-2 border-secondary-foreground/50",
		barHeight: "h-16",
		barBg: "bg-gradient-to-b from-secondary-foreground/10 to-secondary-foreground/[0.03] border border-secondary-foreground/20",
		numberColor: "text-secondary-foreground",
		numberSize: "text-2xl",
		nameColor: "text-foreground",
		statsColor: "text-muted-foreground text-[10px]",
	},
	3: {
		avatarSize: "size-9",
		avatarText: "text-xs",
		border: "border-2 border-muted-foreground/30",
		barHeight: "h-12",
		barBg: "bg-gradient-to-b from-muted-foreground/8 to-muted-foreground/[0.02] border border-muted-foreground/15",
		numberColor: "text-muted-foreground",
		numberSize: "text-xl",
		nameColor: "text-foreground",
		statsColor: "text-muted-foreground text-[10px]",
	},
} as const;

function PodiumSlot({
	entry,
	position,
}: {
	entry: PodiumEntry;
	position: 1 | 2 | 3;
}) {
	const config = PODIUM_CONFIG[position];

	return (
		<div
			className={cn(
				"flex flex-col items-center",
				position === 1 ? "w-[110px]" : "w-[96px]"
			)}
			style={{
				animation: `podium-rise 0.6s ease-out ${position === 3 ? "0s" : position === 2 ? "0.15s" : "0.3s"} both`,
			}}
		>
			{position === 1 && (
				<Star
					className="mb-1 size-5 animate-pulse fill-yellow-500 text-yellow-500"
				/>
			)}
			<Avatar
				className={cn(
					config.avatarSize,
					config.border,
					"mb-1.5 bg-card"
				)}
			>
				<AvatarFallback className={config.avatarText}>
					{getInitials(entry.name)}
				</AvatarFallback>
			</Avatar>
			<p className={cn("text-[11px]", config.nameColor)}>
				{getShortName(entry.name)}
			</p>
			<p className={config.statsColor}>
				{entry.totalLeads} leads
			</p>
			<div
				className={cn(
					"mt-2 w-full rounded-t-lg",
					config.barHeight,
					config.barBg,
					"flex items-center justify-center"
				)}
			>
				<span className={cn("font-light", config.numberColor, config.numberSize)}>
					{position}
				</span>
			</div>
		</div>
	);
}

export function Podium({ entries, eventName }: PodiumProps) {
	const top3 = entries.filter((e) => e.rank <= 3).sort((a, b) => a.rank - b.rank);
	const first = top3.find((e) => e.rank === 1);
	const second = top3.find((e) => e.rank === 2);
	const third = top3.find((e) => e.rank === 3);

	if (!first) {
		return null;
	}

	return (
		<div className="relative bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent px-4 py-6">
			{eventName && (
				<div className="mb-6 text-center">
					<p className="font-mono text-[10px] uppercase tracking-[2px] text-muted-foreground">
						{eventName}
					</p>
					<p className="mt-1 text-lg text-foreground">
						Ranking de Vendedores
					</p>
				</div>
			)}
			<div className="flex items-end justify-center gap-2">
				{second && <PodiumSlot entry={second} position={2} />}
				<PodiumSlot entry={first} position={1} />
				{third && <PodiumSlot entry={third} position={3} />}
			</div>
		</div>
	);
}
