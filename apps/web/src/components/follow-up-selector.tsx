"use client";

import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
	CheckCircle2,
	Clock,
	Handshake,
	PhoneCall,
	XCircle,
} from "lucide-react";
import type { FollowUpStatus } from "@/lib/db/types";

interface FollowUpSelectorProps {
	disabled?: boolean;
	onChange: (status: FollowUpStatus) => void;
	value: FollowUpStatus;
}

const STATUS_CONFIG: Record<
	FollowUpStatus,
	{ icon: LucideIcon; label: string; selectedClass: string }
> = {
	pendente: {
		icon: Clock,
		label: "Pendente",
		selectedClass:
			"bg-[oklch(0.94_0.01_260)] text-[oklch(0.45_0.03_260)] dark:bg-[oklch(0.3_0.02_260)] dark:text-[oklch(0.85_0.03_260)]",
	},
	contatado: {
		icon: PhoneCall,
		label: "Contatado",
		selectedClass:
			"bg-[oklch(0.94_0.03_240)] text-[oklch(0.45_0.15_240)] dark:bg-[oklch(0.3_0.05_240)] dark:text-[oklch(0.85_0.1_240)]",
	},
	em_negociacao: {
		icon: Handshake,
		label: "Negociando",
		selectedClass:
			"bg-[oklch(0.945_0.04_85)] text-[oklch(0.5_0.13_85)] dark:bg-[oklch(0.3_0.06_85)] dark:text-[oklch(0.85_0.1_85)]",
	},
	convertido: {
		icon: CheckCircle2,
		label: "Convertido",
		selectedClass:
			"bg-[oklch(0.94_0.03_145)] text-[oklch(0.45_0.15_145)] dark:bg-[oklch(0.3_0.05_145)] dark:text-[oklch(0.85_0.1_145)]",
	},
	perdido: {
		icon: XCircle,
		label: "Perdido",
		selectedClass:
			"bg-[oklch(0.936_0.032_17)] text-[oklch(0.45_0.18_17)] dark:bg-[oklch(0.3_0.06_17)] dark:text-[oklch(0.85_0.12_17)]",
	},
};

const STATUSES: FollowUpStatus[] = [
	"pendente",
	"contatado",
	"em_negociacao",
	"convertido",
	"perdido",
];

export default function FollowUpSelector({
	value,
	onChange,
	disabled = false,
}: FollowUpSelectorProps) {
	return (
		<div
			aria-label="Status de follow-up"
			className="flex gap-1.5 overflow-x-auto"
			role="radiogroup"
		>
			{STATUSES.map((status) => {
				const config = STATUS_CONFIG[status];
				const isSelected = value === status;

				return (
					// biome-ignore lint/a11y/useSemanticElements: custom toggle buttons per UI-SPEC require role="radio" for radiogroup pattern
					<button
						aria-checked={isSelected}
						className={cn(
							"inline-flex h-7 shrink-0 select-none items-center gap-1 rounded-md border border-transparent px-2 font-medium text-xs outline-none transition-all focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
							isSelected
								? config.selectedClass
								: "border-border bg-background hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
						)}
						disabled={disabled}
						key={status}
						onClick={() => onChange(status)}
						role="radio"
						type="button"
					>
						<config.icon className="size-3.5" />
						{config.label}
					</button>
				);
			})}
		</div>
	);
}
