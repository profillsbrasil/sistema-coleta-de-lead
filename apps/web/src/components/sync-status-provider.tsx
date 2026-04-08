"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { db } from "@/lib/db/index";
import { createConnectivityDetector } from "@/lib/sync/connectivity";
import type { SyncEngineCallbacks } from "@/lib/sync/engine";

interface SyncStatus {
	authExpired: boolean;
	isOnline: boolean;
	isStalled: boolean;
	isSyncing: boolean;
	lastError: string | null;
	lastSync: string | null;
	manualRetry: () => void;
	pendingCount: number;
	retryAttempt: number | null;
	totalRetries: number;
}

const SyncStatusContext = createContext<SyncStatus>({
	isOnline: true,
	isSyncing: false,
	pendingCount: 0,
	lastSync: null,
	lastError: null,
	authExpired: false,
	retryAttempt: null,
	totalRetries: 5,
	isStalled: false,
	manualRetry: () => undefined,
});

export function useSyncStatus(): SyncStatus {
	return useContext(SyncStatusContext);
}

interface SyncState {
	authExpired: boolean;
	isStalled: boolean;
	isSyncing: boolean;
	lastError: string | null;
	lastSync: string | null;
	retryAttempt: number | null;
	totalRetries: number;
}

export function SyncStatusProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [isOnline, setIsOnline] = useState(true);
	const [syncState, setSyncState] = useState<SyncState>({
		isSyncing: false,
		lastSync: null,
		lastError: null,
		authExpired: false,
		retryAttempt: null,
		totalRetries: 5,
		isStalled: false,
	});

	const retryRef = useRef<(() => void) | null>(null);

	const pendingCount = useLiveQuery(() => db.syncQueue.count(), [], 0);

	useEffect(() => {
		db.syncMeta.get("lastSyncTimestamp").then((meta) => {
			if (meta?.value) {
				setSyncState((prev) => ({ ...prev, lastSync: meta.value }));
			}
		});

		const detector = createConnectivityDetector();
		setIsOnline(detector.isOnline);

		const unsubscribeDetector = detector.subscribe((online) => {
			setIsOnline(online);
		});

		const callbacks: SyncEngineCallbacks = {
			onSyncStart: () =>
				setSyncState((prev) => ({
					...prev,
					isSyncing: true,
					retryAttempt: null,
					isStalled: false,
				})),
			onSyncEnd: (result) =>
				setSyncState({
					isSyncing: false,
					lastSync: result.lastSync,
					lastError: result.error,
					authExpired: result.authExpired ?? false,
					retryAttempt: null,
					totalRetries: 5,
					isStalled: result.isStalled ?? false,
				}),
			onRetry: (attempt, totalAttempts) =>
				setSyncState((prev) => ({
					...prev,
					retryAttempt: attempt,
					totalRetries: totalAttempts,
				})),
		};

		let syncControl: { stop: () => void; retry: () => void } | undefined;

		const handleLeadSaved = () => syncControl?.retry();

		async function init() {
			const { startSync } = await import("@/lib/sync/engine");
			syncControl = startSync(callbacks, detector);
			retryRef.current = syncControl.retry;
		}

		init();
		window.addEventListener("lead-saved", handleLeadSaved);

		return () => {
			syncControl?.stop();
			unsubscribeDetector();
			detector.stop();
			window.removeEventListener("lead-saved", handleLeadSaved);
		};
	}, []);

	const value: SyncStatus = {
		isOnline,
		...syncState,
		pendingCount,
		manualRetry: () => retryRef.current?.(),
	};

	return <SyncStatusContext value={value}>{children}</SyncStatusContext>;
}
