"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
	type AppAuthSnapshot,
	clearAuthSnapshot,
	createAuthSnapshot,
	getSessionUser,
	getSessionUserRole,
	readAuthSnapshot,
	writeAuthSnapshot,
} from "@/lib/auth/auth-snapshot";
import {
	CLAIMS_TIMEOUT_MS,
	coerceSnapshotToOfflineSeller,
	createSellerSnapshotFromSession,
	resolveWithTimeout,
	SESSION_TIMEOUT_MS,
} from "@/lib/auth/bootstrap";
import { createClient } from "@/lib/supabase/client";

interface AppAuthContextValue {
	isLoading: boolean;
	isOnline: boolean;
	snapshot: AppAuthSnapshot | null;
}

const AppAuthContext = createContext<AppAuthContextValue>({
	isLoading: true,
	isOnline: true,
	snapshot: null,
});

async function buildSnapshot(
	session: Session,
	previousSnapshot: AppAuthSnapshot | null
): Promise<AppAuthSnapshot> {
	const supabase = createClient();
	let userRole = previousSnapshot?.userRole ?? "vendedor";

	try {
		const { data: claimsData } = await supabase.auth.getClaims();
		const claims =
			(claimsData?.claims as Record<string, unknown> | undefined) ?? null;
		userRole = getSessionUserRole(claims, userRole);
	} catch {
		// Offline or transient auth failures should keep the last known local role.
	}

	return createAuthSnapshot(session.user, userRole);
}

function getSessionWithTimeout(): Promise<Session | null> {
	const supabase = createClient();
	return resolveWithTimeout(
		supabase.auth.getSession().then(({ data }) => data.session),
		SESSION_TIMEOUT_MS
	);
}

function enrichSnapshotFromSession(
	session: Session,
	previousSnapshot: AppAuthSnapshot | null
): Promise<AppAuthSnapshot | null> {
	return resolveWithTimeout(
		buildSnapshot(session, previousSnapshot),
		CLAIMS_TIMEOUT_MS
	);
}

export function AppAuthProvider({ children }: { children: React.ReactNode }) {
	const [snapshot, setSnapshot] = useState<AppAuthSnapshot | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isOnline, setIsOnline] = useState(
		typeof navigator === "undefined" ? true : navigator.onLine
	);
	const snapshotRef = useRef<AppAuthSnapshot | null>(null);

	useEffect(() => {
		snapshotRef.current = snapshot;
	}, [snapshot]);

	useEffect(() => {
		function handleOnlineStatus() {
			setIsOnline(navigator.onLine);
		}

		window.addEventListener("online", handleOnlineStatus);
		window.addEventListener("offline", handleOnlineStatus);

		return () => {
			window.removeEventListener("online", handleOnlineStatus);
			window.removeEventListener("offline", handleOnlineStatus);
		};
	}, []);

	useEffect(() => {
		const storedSnapshot = readAuthSnapshot();
		const offlineStoredSnapshot = coerceSnapshotToOfflineSeller(storedSnapshot);
		if (offlineStoredSnapshot) {
			setSnapshot(offlineStoredSnapshot);
		}

		const supabase = createClient();
		let active = true;

		function applyResolvedSnapshot(nextSnapshot: AppAuthSnapshot | null) {
			if (!active) {
				return;
			}

			if (nextSnapshot) {
				writeAuthSnapshot(nextSnapshot);
				setSnapshot(nextSnapshot);
				return;
			}

			clearAuthSnapshot();
			setSnapshot(null);
		}

		function hydrateAuth() {
			getSessionWithTimeout()
				.then(async (session) => {
					if (!active) {
						return;
					}

					const sessionUser = getSessionUser(session);
					if (sessionUser && session) {
						const sellerSnapshot =
							(await createSellerSnapshotFromSession(session)) ??
							offlineStoredSnapshot;
						applyResolvedSnapshot(sellerSnapshot);

						if (!navigator.onLine) {
							return;
						}

						const enrichedSnapshot = await enrichSnapshotFromSession(
							session,
							sellerSnapshot
						);
						if (enrichedSnapshot) {
							applyResolvedSnapshot(enrichedSnapshot);
						}
						return;
					}

					applyResolvedSnapshot(offlineStoredSnapshot);
				})
				.finally(() => {
					if (active) {
						setIsLoading(false);
					}
				});
		}

		function handleSessionUpdate(session: Session) {
			createSellerSnapshotFromSession(session).then((sellerSnapshot) => {
				if (!(active && sellerSnapshot)) {
					return;
				}

				applyResolvedSnapshot(sellerSnapshot);

				if (!navigator.onLine) {
					return;
				}

				enrichSnapshotFromSession(session, sellerSnapshot).then(
					(enrichedSnapshot) => {
						if (!(active && enrichedSnapshot)) {
							return;
						}

						applyResolvedSnapshot(enrichedSnapshot);
					}
				);
			});
		}

		hydrateAuth();

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			if (!active) {
				return;
			}

			if (!session) {
				clearAuthSnapshot();
				setSnapshot(null);
				return;
			}

			handleSessionUpdate(session);
		});

		return () => {
			active = false;
			subscription.unsubscribe();
		};
	}, []);

	useEffect(() => {
		if (!isOnline) {
			return;
		}

		let active = true;

		getSessionWithTimeout().then(async (session) => {
			if (!(active && session)) {
				return;
			}

			const refreshedSnapshot = await enrichSnapshotFromSession(
				session,
				snapshotRef.current
			);
			if (!(active && refreshedSnapshot)) {
				return;
			}

			writeAuthSnapshot(refreshedSnapshot);
			setSnapshot(refreshedSnapshot);
		});

		return () => {
			active = false;
		};
	}, [isOnline]);

	return (
		<AppAuthContext
			value={{
				isLoading,
				isOnline,
				snapshot,
			}}
		>
			{children}
		</AppAuthContext>
	);
}

export function useAppAuth(): AppAuthContextValue {
	return useContext(AppAuthContext);
}

export function useRequiredAppAuth(): AppAuthContextValue & {
	snapshot: AppAuthSnapshot;
} {
	const value = useAppAuth();
	if (!value.snapshot) {
		throw new Error("App auth snapshot is required for authenticated routes.");
	}
	return value as AppAuthContextValue & { snapshot: AppAuthSnapshot };
}
