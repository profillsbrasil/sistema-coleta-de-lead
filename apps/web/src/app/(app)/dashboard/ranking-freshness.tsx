"use client";

import { formatRelativeTime } from "@/lib/dashboard/consistency";

interface RankingFreshnessProps {
	lastSyncAt: string | null;
	leaderboardFailed: boolean;
	onRetry: () => void;
}

export function RankingFreshness({
	lastSyncAt,
	leaderboardFailed,
	onRetry,
}: RankingFreshnessProps) {
	if (leaderboardFailed) {
		return (
			<p className="px-4 text-muted-foreground text-xs">
				Ranking pode estar desatualizado ·{" "}
				<button
					className="text-primary underline underline-offset-2"
					onClick={onRetry}
					type="button"
				>
					tentar de novo
				</button>
			</p>
		);
	}

	if (!lastSyncAt) {
		return null;
	}

	return (
		<p className="px-4 text-muted-foreground text-xs">
			Atualizado {formatRelativeTime(lastSyncAt)}
		</p>
	);
}
