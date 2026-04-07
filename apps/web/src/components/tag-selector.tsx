"use client";

import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
	Thermometer,
	ThermometerSnowflake,
	ThermometerSun,
} from "lucide-react";

type InterestTag = "quente" | "morno" | "frio";

interface TagSelectorProps {
	disabled?: boolean;
	onChange: (tag: InterestTag) => void;
	value: InterestTag;
}

const TAG_CONFIG: Record<
	InterestTag,
	{ icon: LucideIcon; label: string; selectedClass: string }
> = {
	quente: {
		icon: ThermometerSun,
		label: "Quente",
		selectedClass: "bg-tag-quente-bg text-tag-quente-text",
	},
	morno: {
		icon: Thermometer,
		label: "Morno",
		selectedClass: "bg-tag-morno-bg text-tag-morno-text",
	},
	frio: {
		icon: ThermometerSnowflake,
		label: "Frio",
		selectedClass: "bg-tag-frio-bg text-tag-frio-text",
	},
};

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
							"inline-flex h-8 flex-1 select-none items-center justify-center rounded-md border border-transparent px-2 font-medium text-xs outline-none transition-all focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
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
						<config.icon className="size-3.5" />
						{config.label}
					</button>
				);
			})}
		</div>
	);
}
