"use client";

import { Clock } from "lucide-react";
import { relativeTime } from "@/lib/lead/relative-time";

interface StalenessIndicatorProps {
	lastSyncAt: string | null;
}

export function StalenessIndicator({ lastSyncAt }: StalenessIndicatorProps) {
	if (!lastSyncAt) {
		return (
			<span className="text-muted-foreground text-xs">Nunca sincronizado</span>
		);
	}

	return (
		<span
			aria-live="polite"
			className="flex items-center gap-1 text-muted-foreground text-xs"
		>
			<Clock className="size-3" />
			Atualizado {relativeTime(lastSyncAt)}
		</span>
	);
}
