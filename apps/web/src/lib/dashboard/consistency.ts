const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** Formata a distância de `iso` até `now` como texto curto em PT-BR. */
export function formatRelativeTime(
	iso: string,
	now: number = Date.now()
): string {
	const elapsed = now - new Date(iso).getTime();
	if (elapsed < MINUTE_MS) {
		return "agora";
	}
	if (elapsed < HOUR_MS) {
		return `há ${Math.floor(elapsed / MINUTE_MS)} min`;
	}
	if (elapsed < DAY_MS) {
		return `há ${Math.floor(elapsed / HOUR_MS)} h`;
	}
	return `há ${Math.floor(elapsed / DAY_MS)} d`;
}

interface DivergenceInput {
	isSyncing: boolean;
	localTotal: number;
	pendingCount: number;
	serverTotal: number | null;
}

/**
 * True quando os números locais divergem do ranking do servidor em estado
 * estável. Durante o sync ou com operações pendentes a diferença é esperada,
 * então não é sinalizada.
 */
export function hasPersonalDivergence({
	isSyncing,
	localTotal,
	pendingCount,
	serverTotal,
}: DivergenceInput): boolean {
	if (serverTotal === null || pendingCount > 0 || isSyncing) {
		return false;
	}
	return localTotal !== serverTotal;
}
