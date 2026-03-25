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
			<CardContent className="flex flex-col gap-1">
				<span className="text-muted-foreground text-sm">{label}</span>
				<span className="font-semibold text-[28px] text-foreground leading-[1.2]">
					{value}
				</span>
			</CardContent>
		</Card>
	);
}
