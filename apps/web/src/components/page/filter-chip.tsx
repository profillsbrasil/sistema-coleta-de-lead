import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import type { ReactNode } from "react";

interface FilterChipProps {
	active: boolean;
	"aria-label"?: string;
	children: ReactNode;
	count?: number;
	onClick: () => void;
	tone?: "neutral" | "quente" | "morno" | "frio";
}

const TONE_ACTIVE: Record<NonNullable<FilterChipProps["tone"]>, string> = {
	neutral: "border-primary/40 bg-primary/[0.08] text-primary",
	quente: "border-tag-quente-text/40 bg-tag-quente-bg text-tag-quente-text",
	morno: "border-tag-morno-text/40 bg-tag-morno-bg text-tag-morno-text",
	frio: "border-tag-frio-text/40 bg-tag-frio-bg text-tag-frio-text",
};

export function FilterChip({
	active,
	"aria-label": ariaLabel,
	children,
	count,
	onClick,
	tone = "neutral",
}: FilterChipProps) {
	return (
		<button
			aria-label={ariaLabel}
			aria-pressed={active}
			className={cn(
				"inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors",
				active
					? TONE_ACTIVE[tone]
					: "border-border-subtle text-muted-foreground hover:bg-accent"
			)}
			onClick={onClick}
			type="button"
		>
			<span>{children}</span>
			{count !== undefined && (
				<span
					className={cn(
						"font-light text-[11px] tabular-nums tracking-normal",
						active ? "" : "text-foreground"
					)}
				>
					{count}
				</span>
			)}
		</button>
	);
}
