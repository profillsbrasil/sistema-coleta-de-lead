export const SYNC_CONFIG = {
	maxRetries: 5,
	baseDelayMs: 1000,
	maxDelayMs: 30_000,
	pollIntervalMs: 30_000,
	pushPullTimeoutMs: 30_000,
	photoUploadTimeoutMs: 60_000,
} as const;

export function getBackoffDelay(retryCount: number): number {
	return Math.min(
		SYNC_CONFIG.baseDelayMs * 2 ** retryCount +
			Math.random() * SYNC_CONFIG.baseDelayMs,
		SYNC_CONFIG.maxDelayMs
	);
}
