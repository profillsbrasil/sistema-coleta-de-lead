"use client";

import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import InterestIcon, { type InterestTag } from "./interest-icon";
import type { FilterTag } from "@/lib/lead/queries";

interface TagFilterProps {
	onChange: (tag: FilterTag) => void;
	value: FilterTag;
}

const INTEREST_TAGS: InterestTag[] = ["quente", "morno", "frio"];

export default function TagFilter({ value, onChange }: TagFilterProps) {
	return (
		<div
			aria-label="Filtrar por interesse"
			className="flex items-center gap-2"
			role="radiogroup"
		>
			{/* biome-ignore lint/a11y/useSemanticElements: custom toggle buttons per UI-SPEC require role="radio" for radiogroup pattern */}
			<button
				aria-checked={value === "todos"}
				className={cn(
					"inline-flex min-h-[44px] select-none items-center justify-center rounded-md border border-transparent px-3 font-medium text-xs outline-none transition-all focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
					value === "todos"
						? "bg-primary text-primary-foreground"
						: "border-border bg-input hover:bg-input/80",
				)}
				onClick={() => onChange("todos")}
				role="radio"
				type="button"
			>
				Todos
			</button>
			{INTEREST_TAGS.map((tag) => {
				const isSelected = value === tag;

				return (
					// biome-ignore lint/a11y/useSemanticElements: custom toggle buttons per UI-SPEC require role="radio" for radiogroup pattern
					<button
						aria-checked={isSelected}
						className="outline-none transition-all focus-visible:ring-3 focus-visible:ring-ring/50 rounded-full"
						key={tag}
						onClick={() => {
							if (isSelected) {
								onChange("todos");
							} else {
								onChange(tag);
							}
						}}
						role="radio"
						type="button"
					>
						<InterestIcon
							selected={isSelected}
							size="md"
							tag={tag}
						/>
					</button>
				);
			})}
		</div>
	);
}
