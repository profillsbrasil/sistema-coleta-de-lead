"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { createContext, useContext, useEffect, useState } from "react";
import { db } from "@/lib/db/index";
import { createConnectivityDetector } from "@/lib/sync/connectivity";
import type { SyncEngineCallbacks } from "@/lib/sync/engine";

interface SyncStatus {
    isOnline: boolean;
    isSyncing: boolean;
    lastError: string | null;
    lastSync: string | null;
    pendingCount: number;
    authExpired: boolean;
}

const SyncStatusContext = createContext<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    lastSync: null,
    lastError: null,
    authExpired: false,
});

export function useSyncStatus(): SyncStatus {
	return useContext(SyncStatusContext);
}

interface SyncState {
    isSyncing: boolean;
    lastError: string | null;
    lastSync: string | null;
    authExpired: boolean;
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
	});

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
			onSyncStart: () => setSyncState((prev) => ({ ...prev, isSyncing: true })),
			onSyncEnd: (result) =>
			    setSyncState({
			        isSyncing: false,
			        lastSync: result.lastSync,
			        lastError: result.error,
			        authExpired: result.authExpired ?? false,
			    }),
		};

		let cleanup: (() => void) | undefined;

		async function init() {
			const { startSync } = await import("@/lib/sync/engine");
			cleanup = startSync(callbacks, detector);
		}

		init();

		return () => {
			cleanup?.();
			unsubscribeDetector();
			detector.stop();
		};
	}, []);

	const value: SyncStatus = {
		isOnline,
		...syncState,
		pendingCount,
	};

	return <SyncStatusContext value={value}>{children}</SyncStatusContext>;
}
