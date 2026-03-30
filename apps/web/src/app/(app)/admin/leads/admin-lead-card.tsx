"use client";

import { buttonVariants } from "@dashboard-leads-profills/ui/components/button";
import { Card } from "@dashboard-leads-profills/ui/components/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@dashboard-leads-profills/ui/components/dropdown-menu";
import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import {
	CheckCircle2,
	Handshake,
	MessageCircle,
	MoreVertical,
	Pencil,
	PhoneCall,
	Trash2,
	XCircle,
} from "lucide-react";
import Link from "next/link";
import { formatPhone, unmaskPhone } from "@/lib/masks/phone";

const FOLLOW_UP_CONFIG: Record<
	string,
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

const TAG_CONFIG: Record<string, { label: string; className: string }> = {
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
};

interface AdminLeadCardProps {
	lead: {
		localId: string;
		name: string;
		phone: string | null;
		email: string | null;
		interestTag: string;
		followUpStatus?: string;
		segment: string | null;
		createdAt: string | Date;
	};
	onDelete: (localId: string) => void;
	vendorName: string;
}

export function AdminLeadCard({
	lead,
	vendorName,
	onDelete,
}: AdminLeadCardProps) {
	const tagConfig = TAG_CONFIG[lead.interestTag] ?? TAG_CONFIG.morno;
	const followUpConfig =
		lead.followUpStatus && lead.followUpStatus !== "pendente"
			? FOLLOW_UP_CONFIG[lead.followUpStatus]
			: null;

	return (
		<Card className="p-4">
			<div className="flex items-start justify-between gap-2">
				<div className="flex min-w-0 flex-col gap-1">
					<div className="flex items-center gap-2">
						<span className="truncate font-semibold text-sm">{lead.name}</span>
						<span
							className={cn(
								"inline-flex shrink-0 items-center rounded-md px-2 py-0.5 font-medium text-xs",
								tagConfig.className
							)}
						>
							{tagConfig.label}
						</span>
						{followUpConfig ? (
							<span
								className={cn(
									"inline-flex shrink-0 items-center gap-0.5 text-[0.65rem] leading-none",
									followUpConfig.className
								)}
							>
								<followUpConfig.icon className="size-3" />
								{followUpConfig.label}
							</span>
						) : null}
					</div>
					<span className="text-muted-foreground text-sm">
						Vendedor: {vendorName}
					</span>
					<span className="flex items-center gap-1 text-muted-foreground text-sm">
						<span className="truncate">
							{lead.phone ? formatPhone(lead.phone) : (lead.email ?? "-")}
						</span>
						{lead.phone ? (
							<a
								aria-label="Abrir conversa no WhatsApp"
								className={cn(
									buttonVariants({ variant: "ghost", size: "icon-sm" })
								)}
								href={`https://wa.me/55${unmaskPhone(lead.phone)}`}
								rel="noopener noreferrer"
								target="_blank"
							>
								<MessageCircle className="size-4" />
							</a>
						) : null}
					</span>
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<button
								aria-label="Abrir menu de acoes"
								className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg hover:bg-muted"
								type="button"
							/>
						}
					>
						<MoreVertical className="size-4" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							render={
								<Link href={`/admin/leads/${lead.localId}` as unknown as "/"} />
							}
						>
							<Pencil className="size-4" />
							Editar lead
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={() => onDelete(lead.localId)}
							variant="destructive"
						>
							<Trash2 className="size-4" />
							Excluir lead
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</Card>
	);
}
