"use client";

import {
	ToggleGroup,
	ToggleGroupItem,
} from "@dashboard-leads-profills/ui/components/toggle-group";
import type { FilterTag } from "@/lib/lead/queries";
import InterestIcon, { type InterestTag } from "./interest-icon";

interface TagFilterProps {
	onChange: (tag: FilterTag) => void;
	value: FilterTag;
}

const INTEREST_TAGS: InterestTag[] = ["quente", "morno", "frio"];

export default function TagFilter({ value, onChange }: TagFilterProps) {
	return (
		<ToggleGroup
			aria-label="Filtrar por interesse"
			className="items-center gap-2"
			onValueChange={(val) => onChange((val as FilterTag) || "todos")}
			spacing={8}
			type="single"
			value={value}
		>
			<ToggleGroupItem
				className="min-h-11 rounded-md border border-transparent px-3 font-medium text-xs hover:bg-input/80 data-[state=off]:border-border data-[state=off]:bg-input data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
				value="todos"
			>
				Todos
			</ToggleGroupItem>
			{INTEREST_TAGS.map((tag) => (
				<ToggleGroupItem
					className="min-h-11 min-w-11 rounded-full hover:bg-transparent data-[state=on]:bg-transparent"
					key={tag}
					value={tag}
				>
					<InterestIcon selected={value === tag} size="md" tag={tag} />
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}
