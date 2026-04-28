"use client";

import { FilterChip } from "@/components/page/filter-chip";
import type { FilterTag } from "@/lib/lead/queries";

interface TagFilterProps {
	onChange: (tag: FilterTag) => void;
	value: FilterTag;
}

const TAGS: {
	tag: FilterTag;
	label: string;
	tone: "neutral" | "quente" | "morno" | "frio";
}[] = [
	{ tag: "todos", label: "Todos", tone: "neutral" },
	{ tag: "quente", label: "Quentes", tone: "quente" },
	{ tag: "morno", label: "Mornos", tone: "morno" },
	{ tag: "frio", label: "Frios", tone: "frio" },
];

export default function TagFilter({ value, onChange }: TagFilterProps) {
	return (
		<fieldset
			aria-label="Filtrar por interesse"
			className="flex flex-wrap items-center gap-2 border-0 p-0"
		>
			{TAGS.map(({ tag, label, tone }) => (
				<FilterChip
					active={value === tag}
					aria-label={`Filtrar ${label}`}
					key={tag}
					onClick={() => onChange(tag)}
					tone={tone}
				>
					{label}
				</FilterChip>
			))}
		</fieldset>
	);
}
