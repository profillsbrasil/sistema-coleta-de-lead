import { cn } from "@dashboard-leads-profills/ui/lib/utils";
import type { ReactNode } from "react";

interface PageHeaderProps {
	className?: string;
	eyebrow?: string;
	subtitle?: ReactNode;
	title: ReactNode;
	trailing?: ReactNode;
}

export function PageHeader({
	className,
	eyebrow,
	subtitle,
	title,
	trailing,
}: PageHeaderProps) {
	return (
		<header
			className={cn(
				"flex items-start justify-between gap-3 px-4 pt-2 pb-1",
				className
			)}
		>
			<div className="flex min-w-0 flex-col gap-1">
				{eyebrow && (
					<p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
						{eyebrow}
					</p>
				)}
				<h1 className="font-medium text-2xl text-foreground leading-[1.05] tracking-tight">
					{title}
				</h1>
				{subtitle && (
					<div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.14em]">
						{subtitle}
					</div>
				)}
			</div>
			{trailing && <div className="shrink-0">{trailing}</div>}
		</header>
	);
}
