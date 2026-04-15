"use client";

import {
	ToggleGroup,
	ToggleGroupItem,
} from "@dashboard-leads-profills/ui/components/toggle-group";
import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import InterestIcon, { getTagConfig, type InterestTag } from "./interest-icon";

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
		<ToggleGroup
			aria-label="Tag de interesse"
			className="gap-5"
			disabled={disabled}
			onValueChange={(val) => {
				if (val) {
					onChange(val as InterestTag);
				}
			}}
			spacing={20}
			type="single"
			value={value}
		>
			{TAGS.map((tag) => {
				const config = getTagConfig(tag);
				const isSelected = value === tag;

				return (
					<ToggleGroupItem
						className="flex h-auto min-w-0 flex-col items-center gap-1.5 rounded-xl p-1 hover:bg-transparent data-[state=on]:bg-transparent"
						key={tag}
						value={tag}
					>
						<InterestIcon selected={isSelected} size="lg" tag={tag} />
						<span
							className={cn(
								"font-medium text-xs transition-colors",
								isSelected ? config.textClass : "text-muted-foreground"
							)}
						>
							{config.label}
						</span>
					</ToggleGroupItem>
				);
			})}
		</ToggleGroup>
	);
}
