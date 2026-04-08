import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import { Flame, Snowflake, Sun } from "lucide-react";

type InterestTag = "quente" | "morno" | "frio";

const TAG_CONFIG = {
	quente: {
		icon: Flame,
		label: "Quente",
		activeClasses: "border-tag-quente-text bg-tag-quente-bg text-tag-quente-text",
		inactiveClasses: "border-border bg-background text-muted-foreground",
	},
	morno: {
		icon: Sun,
		label: "Morno",
		activeClasses: "border-tag-morno-text bg-tag-morno-bg text-tag-morno-text",
		inactiveClasses: "border-border bg-background text-muted-foreground",
	},
	frio: {
		icon: Snowflake,
		label: "Frio",
		activeClasses: "border-tag-frio-text bg-tag-frio-bg text-tag-frio-text",
		inactiveClasses: "border-border bg-background text-muted-foreground",
	},
} as const;

const SIZE_CONFIG = {
	sm: { circle: "size-7", icon: "size-3.5", border: "border" },
	md: { circle: "size-8", icon: "size-4", border: "border-[1.5px]" },
	lg: { circle: "size-13", icon: "size-6", border: "border-2" },
} as const;

interface InterestIconProps {
	tag: InterestTag;
	size?: "sm" | "md" | "lg";
	selected?: boolean;
	className?: string;
}

export type { InterestTag };

export function getTagConfig(tag: InterestTag) {
	return TAG_CONFIG[tag];
}

export default function InterestIcon({
	tag,
	size = "sm",
	selected = true,
	className,
}: InterestIconProps) {
	const config = TAG_CONFIG[tag];
	const sizeConfig = SIZE_CONFIG[size];
	const Icon = config.icon;

	return (
		<span
			aria-label={config.label}
			className={cn(
				"inline-flex shrink-0 items-center justify-center rounded-full",
				sizeConfig.circle,
				sizeConfig.border,
				selected ? config.activeClasses : config.inactiveClasses,
				className,
			)}
		>
			<Icon className={sizeConfig.icon} />
		</span>
	);
}
