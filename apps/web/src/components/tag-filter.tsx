"use client";

import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import type { FilterTag } from "@/lib/lead/queries";

interface TagFilterProps {
	onChange: (tag: FilterTag) => void;
	value: FilterTag;
}

const FILTER_OPTIONS: {
	className: string;
	label: string;
	value: FilterTag;
}[] = [
	{
		value: "todos",
		label: "Todos",
		className: "bg-primary text-primary-foreground",
	},
	{
		value: "quente",
		label: "Quente",
		className: "bg-tag-quente-bg text-tag-quente-text",
	},
	{
		value: "morno",
		label: "Morno",
		className: "bg-tag-morno-bg text-tag-morno-text",
	},
	{
		value: "frio",
		label: "Frio",
		className: "bg-tag-frio-bg text-tag-frio-text",
	},
];

export default function TagFilter({ value, onChange }: TagFilterProps) {
	return (
		<div
			aria-label="Filtrar por interesse"
			className="flex gap-2"
			role="radiogroup"
		>
			{FILTER_OPTIONS.map((option) => {
				const isSelected = value === option.value;

				return (
					// biome-ignore lint/a11y/useSemanticElements: custom toggle buttons per UI-SPEC require role="radio" for radiogroup pattern
					<button
						aria-checked={isSelected}
						className={cn(
							"inline-flex min-h-[44px] flex-1 select-none items-center justify-center rounded-md border border-transparent px-2 font-medium text-xs outline-none transition-all focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
							isSelected
								? option.className
								: "border-border bg-background hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
						)}
						key={option.value}
						onClick={() => {
							if (isSelected && option.value !== "todos") {
								onChange("todos");
							} else {
								onChange(option.value);
							}
						}}
						role="radio"
						type="button"
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}
