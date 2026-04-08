"use client";

import { buttonVariants } from "@dashboard-leads-profills/ui/components/button";
import { Card } from "@dashboard-leads-profills/ui/components/card";
import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import { MessageCircle } from "lucide-react";
import type { Lead } from "@/lib/db/types";
import { relativeTime } from "@/lib/lead/relative-time";
import { formatPhone, unmaskPhone } from "@/lib/masks/phone";

const TAG_CONFIG = {
	quente: {
		label: "Quente",
		className: "bg-tag-quente-bg text-tag-quente-text",
	},
	morno: {
		label: "Morno",
		className: "bg-tag-morno-bg text-tag-morno-text",
	},
	frio: {
		label: "Frio",
		className: "bg-tag-frio-bg text-tag-frio-text",
	},
} as const;

interface LeadCardProps {
	lead: Lead;
	onClick: () => void;
}

export default function LeadCard({ lead, onClick }: LeadCardProps) {
	const contact = lead.phone ? formatPhone(lead.phone) : lead.email;
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
					<span className="truncate font-medium text-sm">{lead.name}</span>
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
								"inline-flex items-center rounded-lg px-2 py-0.5 font-medium text-xs",
								tagConfig.className
							)}
						>
							{tagConfig.label}
						</span>
					</div>
					<span className="text-muted-foreground text-xs">
						{relativeTime(lead.createdAt)}
					</span>
				</div>
			</div>
		</Card>
	);
}
