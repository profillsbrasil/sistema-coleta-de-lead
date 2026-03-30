"use client";

import { buttonVariants } from "@dashboard-leads-profills/ui/components/button";
import { Card } from "@dashboard-leads-profills/ui/components/card";
import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import {
	CheckCircle2,
	Handshake,
	MessageCircle,
	PhoneCall,
	XCircle,
} from "lucide-react";
import type { FollowUpStatus, Lead } from "@/lib/db/types";
import { relativeTime } from "@/lib/lead/relative-time";
import { formatPhone, unmaskPhone } from "@/lib/masks/phone";

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

const FOLLOW_UP_CONFIG: Record<
	Exclude<FollowUpStatus, "pendente">,
	{ icon: typeof PhoneCall; label: string; className: string }
> = {
	contatado: {
		icon: PhoneCall,
		label: "Contatado",
		className: "text-[oklch(0.45_0.15_240)] dark:text-[oklch(0.85_0.1_240)]",
	},
	em_negociacao: {
		icon: Handshake,
		label: "Negociando",
		className: "text-[oklch(0.5_0.13_85)] dark:text-[oklch(0.85_0.1_85)]",
	},
	convertido: {
		icon: CheckCircle2,
		label: "Convertido",
		className: "text-[oklch(0.45_0.15_145)] dark:text-[oklch(0.85_0.1_145)]",
	},
	perdido: {
		icon: XCircle,
		label: "Perdido",
		className: "text-[oklch(0.45_0.18_17)] dark:text-[oklch(0.85_0.12_17)]",
	},
};

interface LeadCardProps {
	lead: Lead;
	onClick: () => void;
}

export default function LeadCard({ lead, onClick }: LeadCardProps) {
	const contact = lead.phone ? formatPhone(lead.phone) : lead.email;
	const tagConfig = TAG_CONFIG[lead.interestTag];
	const followUpConfig =
		lead.followUpStatus === "pendente"
			? null
			: FOLLOW_UP_CONFIG[lead.followUpStatus];

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
						<span className="flex items-center gap-1 text-muted-foreground text-sm">
							<span className="truncate">{contact}</span>
							{lead.phone ? (
								<a
									aria-label="Abrir conversa no WhatsApp"
									className={cn(
										buttonVariants({ variant: "ghost", size: "icon-sm" })
									)}
									href={`https://wa.me/55${unmaskPhone(lead.phone)}`}
									onClick={(e) => e.stopPropagation()}
									rel="noopener noreferrer"
									target="_blank"
								>
									<MessageCircle className="size-4" />
								</a>
							) : null}
						</span>
					) : null}
				</div>
				<div className="flex flex-col items-end gap-1">
					<div className="flex items-center gap-1.5">
						<span
							className={cn(
								"inline-flex items-center rounded-md px-2 py-0.5 font-medium text-xs",
								tagConfig.className
							)}
						>
							{tagConfig.label}
						</span>
						{followUpConfig ? (
							<span
								className={cn(
									"inline-flex items-center gap-0.5 text-[0.65rem] leading-none",
									followUpConfig.className
								)}
							>
								<followUpConfig.icon className="size-3" />
								{followUpConfig.label}
							</span>
						) : null}
					</div>
					<span className="text-muted-foreground text-xs">
						{relativeTime(lead.createdAt)}
					</span>
				</div>
			</div>
		</Card>
	);
}
