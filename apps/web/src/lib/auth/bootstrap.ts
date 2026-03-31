import type { Session } from "@supabase/supabase-js";
import { type AppAuthSnapshot, createAuthSnapshot } from "./auth-snapshot";

export const SESSION_TIMEOUT_MS = 1200;
export const CLAIMS_TIMEOUT_MS = 1200;

export function coerceSnapshotToOfflineSeller(
	snapshot: AppAuthSnapshot | null
): AppAuthSnapshot | null {
	if (!snapshot) {
		return null;
	}

	return {
		...snapshot,
		userRole: "vendedor",
	};
}

export function createSellerSnapshotFromSession(
	session: Session | null
): Promise<AppAuthSnapshot | null> {
	if (!session?.user) {
		return Promise.resolve(null);
	}

	return createAuthSnapshot(session.user, "vendedor");
}

export function resolveWithTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number
): Promise<T | null> {
	return new Promise((resolve) => {
		const timeoutId = globalThis.setTimeout(() => {
			resolve(null);
		}, timeoutMs);

		promise
			.then((value) => {
				globalThis.clearTimeout(timeoutId);
				resolve(value);
			})
			.catch(() => {
				globalThis.clearTimeout(timeoutId);
				resolve(null);
			});
	});
}
