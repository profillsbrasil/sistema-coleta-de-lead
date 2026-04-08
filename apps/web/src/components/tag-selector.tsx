"use client";

import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import InterestIcon, { type InterestTag, getTagConfig } from "./interest-icon";

interface TagSelectorProps {
	disabled?: boolean;
	onChange: (tag: InterestTag) => void;
	value: InterestTag;
}

const TAGS: InterestTag[] = ["quente", "morno", "frio"];

export default function TagSelector({
	value,
	onChange,
	disabled = false,
}: TagSelectorProps) {
	return (
		<div aria-label="Tag de interesse" className="flex gap-5" role="radiogroup">
			{TAGS.map((tag) => {
				const config = getTagConfig(tag);
				const isSelected = value === tag;

				return (
					// biome-ignore lint/a11y/useSemanticElements: custom toggle buttons per UI-SPEC require role="radio" for radiogroup pattern
					<button
						aria-checked={isSelected}
						className={cn(
							"flex flex-col items-center gap-1.5 outline-none transition-all focus-visible:ring-3 focus-visible:ring-ring/50 rounded-xl p-1 disabled:pointer-events-none disabled:opacity-50",
						)}
						disabled={disabled}
						key={tag}
						onClick={() => onChange(tag)}
						role="radio"
						type="button"
					>
						<InterestIcon
							selected={isSelected}
							size="lg"
							tag={tag}
						/>
						<span
							className={cn(
								"font-medium text-xs transition-colors",
								isSelected ? config.textClass : "text-muted-foreground",
							)}
						>
							{config.label}
						</span>
					</button>
				);
			})}
		</div>
	);
}
