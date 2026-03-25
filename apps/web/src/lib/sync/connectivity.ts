import { SYNC_CONFIG } from "./constants";

export type ConnectivityListener = (online: boolean) => void;

export interface ConnectivityDetector {
	readonly isOnline: boolean;
	start: () => void;
	stop: () => void;
	subscribe: (fn: ConnectivityListener) => () => void;
}

export function createConnectivityDetector(
	pollIntervalMs = SYNC_CONFIG.pollIntervalMs
): ConnectivityDetector {
	let online = typeof navigator === "undefined" ? true : navigator.onLine;
	const listeners = new Set<ConnectivityListener>();
	let pollTimerId: ReturnType<typeof setInterval> | null = null;

	function notify(newState: boolean): void {
		if (newState === online) {
			return;
		}
		online = newState;
		for (const fn of listeners) {
			fn(online);
		}
	}

	async function checkConnectivity(): Promise<boolean> {
		try {
			const response = await fetch(`/api/trpc/healthCheck?t=${Date.now()}`, {
				method: "HEAD",
				cache: "no-store",
			});
			return response.ok;
		} catch {
			return false;
		}
	}

	function handleOnline(): void {
		notify(true);
	}

	function handleOffline(): void {
		notify(false);
	}

	function start(): void {
		if (typeof window === "undefined") {
			return;
		}

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		pollTimerId = setInterval(async () => {
			const result = await checkConnectivity();
			notify(result);
		}, pollIntervalMs);
	}

	function stop(): void {
		if (typeof window === "undefined") {
			return;
		}

		if (pollTimerId !== null) {
			clearInterval(pollTimerId);
			pollTimerId = null;
		}
		window.removeEventListener("online", handleOnline);
		window.removeEventListener("offline", handleOffline);
		listeners.clear();
	}

	function subscribe(fn: ConnectivityListener): () => void {
		listeners.add(fn);
		return () => {
			listeners.delete(fn);
		};
	}

	return {
		start,
		stop,
		subscribe,
		get isOnline() {
			return online;
		},
	};
}
