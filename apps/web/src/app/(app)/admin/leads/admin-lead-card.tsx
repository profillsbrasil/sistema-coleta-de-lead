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
import { MessageCircle, MoreVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatPhone, unmaskPhone } from "@/lib/masks/phone";

const TAG_CONFIG: Record<string, { label: string; className: string }> = {
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
};

interface AdminLeadCardProps {
	lead: {
		localId: string;
		name: string;
		phone: string | null;
		email: string | null;
		interestTag: string;
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

	return (
		<Card className="p-3.5">
			<div className="flex items-start justify-between gap-2">
				<div className="flex min-w-0 flex-col gap-1">
					<div className="flex items-center gap-2">
						<span className="truncate font-medium text-[13px]">{lead.name}</span>
						<span
							className={cn(
								"inline-flex shrink-0 items-center rounded-lg px-2 py-0.5 font-medium text-xs",
								tagConfig.className
							)}
						>
							{tagConfig.label}
						</span>
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
