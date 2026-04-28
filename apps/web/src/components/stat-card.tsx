"use client";

import {
	Card,
	CardContent,
} from "@dashboard-leads-profills/ui/components/card";
import { cn } from "@dashboard-leads-profills/ui/lib/utils";

interface StatCardProps {
	className?: string;
	label: string;
	value: number | string;
}

export function StatCard({ label, value, className }: StatCardProps) {
	return (
		<Card className={cn(className)}>
			<CardContent className="flex flex-col gap-2">
				<span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
					{label}
				</span>
				<span className="font-light text-3xl text-foreground leading-[1.0] tracking-tight">
					{value}
				</span>
			</CardContent>
		</Card>
	);
}
