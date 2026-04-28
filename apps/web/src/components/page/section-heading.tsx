import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import type { ReactNode } from "react";

interface SectionHeadingProps {
	className?: string;
	id?: string;
	meta?: ReactNode;
	title: ReactNode;
}

export function SectionHeading({
	className,
	id,
	meta,
	title,
}: SectionHeadingProps) {
	return (
		<div
			className={cn(
				"flex items-baseline justify-between gap-3 px-4",
				className
			)}
		>
			<h2
				className="font-medium text-foreground text-lg tracking-tight"
				id={id}
			>
				{title}
			</h2>
			{meta && (
				<span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
					{meta}
				</span>
			)}
		</div>
	);
}
