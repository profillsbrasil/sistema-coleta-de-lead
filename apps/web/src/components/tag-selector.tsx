"use client";

import { cn } from "@dashboard-leads-profills/ui/lib/utils";

type InterestTag = "quente" | "morno" | "frio";

interface TagSelectorProps {
	disabled?: boolean;
	onChange: (tag: InterestTag) => void;
	value: InterestTag;
}

const TAG_CONFIG = {
	quente: {
		label: "Quente",
		selectedClass:
			"bg-[oklch(0.936_0.032_17)] text-[oklch(0.45_0.18_17)] dark:bg-[oklch(0.3_0.06_17)] dark:text-[oklch(0.85_0.12_17)]",
	},
	morno: {
		label: "Morno",
		selectedClass:
			"bg-[oklch(0.945_0.04_85)] text-[oklch(0.5_0.13_85)] dark:bg-[oklch(0.3_0.06_85)] dark:text-[oklch(0.85_0.1_85)]",
	},
	frio: {
		label: "Frio",
		selectedClass:
			"bg-[oklch(0.94_0.03_240)] text-[oklch(0.45_0.15_240)] dark:bg-[oklch(0.3_0.05_240)] dark:text-[oklch(0.85_0.1_240)]",
	},
} as const;

const TAGS: InterestTag[] = ["quente", "morno", "frio"];

export default function TagSelector({
	value,
	onChange,
	disabled = false,
}: TagSelectorProps) {
	return (
		<div aria-label="Tag de interesse" className="flex gap-2" role="radiogroup">
			{TAGS.map((tag) => {
				const config = TAG_CONFIG[tag];
				const isSelected = value === tag;

				return (
					// biome-ignore lint/a11y/useSemanticElements: custom toggle buttons per UI-SPEC require role="radio" for radiogroup pattern
					<button
						aria-checked={isSelected}
						className={cn(
							"inline-flex min-h-[44px] flex-1 select-none items-center justify-center rounded-lg border border-transparent px-2.5 font-medium text-sm outline-none transition-all focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
							isSelected
								? config.selectedClass
								: "border-border bg-background hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
						)}
						disabled={disabled}
						key={tag}
						onClick={() => onChange(tag)}
						role="radio"
						type="button"
					>
						{config.label}
					</button>
				);
			})}
		</div>
	);
}
