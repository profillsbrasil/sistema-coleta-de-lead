"use client";

import { Card } from "@dashboard-leads-profills/ui/components/card";
import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import type { Lead } from "@/lib/db/types";
import { relativeTime } from "@/lib/lead/relative-time";

const TAG_CONFIG = {
	quente: {
		label: "Quente",
		className:
			"bg-[oklch(0.936_0.032_17)] text-[oklch(0.45_0.18_17)] dark:bg-[oklch(0.3_0.06_17)] dark:text-[oklch(0.85_0.12_17)]",
	},
	morno: {
		label: "Morno",
		className:
			"bg-[oklch(0.945_0.04_85)] text-[oklch(0.5_0.13_85)] dark:bg-[oklch(0.3_0.06_85)] dark:text-[oklch(0.85_0.1_85)]",
	},
	frio: {
		label: "Frio",
		className:
			"bg-[oklch(0.94_0.03_240)] text-[oklch(0.45_0.15_240)] dark:bg-[oklch(0.3_0.05_240)] dark:text-[oklch(0.85_0.1_240)]",
	},
} as const;

interface LeadCardProps {
	lead: Lead;
	onClick: () => void;
}

export default function LeadCard({ lead, onClick }: LeadCardProps) {
	const contact = lead.phone ?? lead.email;
	const tagConfig = TAG_CONFIG[lead.interestTag];

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onClick();
		}
	}

	return (
		<Card
			className={cn("cursor-pointer p-4 transition-colors hover:bg-muted")}
			onClick={onClick}
			onKeyDown={handleKeyDown}
			role="button"
			tabIndex={0}
		>
			<div className="flex items-center justify-between">
				<div className="flex min-w-0 flex-col gap-1">
					<span className="truncate font-semibold text-sm">{lead.name}</span>
					{contact ? (
						<span className="truncate text-muted-foreground text-sm">
							{contact}
						</span>
					) : null}
				</div>
				<div className="flex flex-col items-end gap-1">
					<span
						className={cn(
							"inline-flex items-center rounded-md px-2 py-0.5 font-medium text-xs",
							tagConfig.className
						)}
					>
						{tagConfig.label}
					</span>
					<span className="text-muted-foreground text-xs">
						{relativeTime(lead.createdAt)}
					</span>
				</div>
			</div>
		</Card>
	);
}
