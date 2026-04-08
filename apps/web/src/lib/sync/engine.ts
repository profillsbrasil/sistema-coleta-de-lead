import type { AppRouter } from "@dashboard-leads-profills/api/routers/index";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { toast } from "sonner";

import { db } from "../db/index";
import type { Lead } from "../db/types";
import type { ConnectivityDetector } from "./connectivity";
import { createConnectivityDetector } from "./connectivity";
import { getBackoffDelay, SYNC_CONFIG } from "./constants";
import { uploadPendingPhotos } from "./photo-upload";

export interface SyncEngineCallbacks {
	onRetry?: (attempt: number, totalAttempts: number) => void;
	onSyncEnd?: (result: {
		lastSync: string;
		error: string | null;
		authExpired?: boolean;
		isStalled?: boolean;
	}) => void;
	onSyncStart?: () => void;
}

function fetchWithTimeout(
	url: URL | RequestInfo,
	options?: RequestInit
): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(
		() => controller.abort(),
		SYNC_CONFIG.pushPullTimeoutMs
	);
	return fetch(url, {
		...options,
		credentials: "include",
		signal: controller.signal,
	}).finally(() => clearTimeout(timeoutId));
}

const syncClient = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: "/api/trpc",
			fetch: fetchWithTimeout,
		}),
	],
});

let isSyncing = false;

function isUnauthorizedError(error: unknown): boolean {
	if (
		error instanceof Error &&
		(error.message.includes("UNAUTHORIZED") || error.message.includes("401"))
	) {
		return true;
	}
	const data = (error as Record<string, unknown>)?.data;
	if (
		data &&
		typeof data === "object" &&
		(data as Record<string, unknown>).code === "UNAUTHORIZED"
	) {
		return true;
	}
	return false;
}

async function pushChanges(): Promise<void> {
	const pendingOps = await db.syncQueue.orderBy("timestamp").toArray();

	if (pendingOps.length === 0) {
		return;
	}

	const operations = pendingOps.map((op) => ({
		localId: op.localId,
		operation: op.operation,
		payload:
			typeof op.payload === "string" ? JSON.parse(op.payload) : op.payload,
		clientTimestamp: op.timestamp,
	}));

	const result = await syncClient.sync.pushChanges.mutate({ operations });

	// 1. Delete only acknowledged items from syncQueue
	const ackIds = result.acknowledged
		.map((a) => {
			const queueItem = pendingOps.find(
				(p) => p.localId === a.localId && p.timestamp === a.queueId
			);
			return queueItem?.id;
		})
		.filter((id): id is number => id != null);

	if (ackIds.length > 0) {
		await db.syncQueue.bulkDelete(ackIds);
	}

	// 2. Update serverId and syncStatus for created leads
	for (const mapping of result.idMappings) {
		const pendingCount = await db.syncQueue
			.where("localId")
			.equals(mapping.localId)
			.count();
		await db.leads.update(mapping.localId, {
			serverId: Number(mapping.serverId),
			syncStatus: pendingCount > 0 ? "pending" : "synced",
		});
	}

	// 3. React to failed operation — increment retryCount so persistent failures are visible
	const failedOperation = "failedOperation" in result ? result.failedOperation : undefined;
	if (failedOperation) {
		const failedItem = pendingOps.find(
			(p) =>
				p.localId === failedOperation.localId &&
				p.timestamp === failedOperation.queueId
		);
		if (failedItem?.id != null) {
			await db.syncQueue.update(failedItem.id, {
				retryCount: (failedItem.retryCount ?? 0) + 1,
			});
		}
	}
}

function mapServerLeadToLocal(
	serverLead: Record<string, unknown>
): Omit<Lead, "photo"> & { photo: null } {
	return {
		localId: serverLead.localId as string,
		serverId: Number(serverLead.id),
		userId: serverLead.userId as string,
		name: (serverLead.name as string) ?? "",
		phone: (serverLead.phone as string) ?? null,
		email: (serverLead.email as string) ?? null,
		company: (serverLead.company as string) ?? null,
		position: (serverLead.position as string) ?? null,
		segment: (serverLead.segment as string) ?? null,
		notes: (serverLead.notes as string) ?? null,
		interestTag: (serverLead.interestTag as Lead["interestTag"]) ?? "frio",
		photo: null,
		photoUrl: (serverLead.photoUrl as string) ?? null,
		createdAt:
			serverLead.createdAt instanceof Date
				? serverLead.createdAt.toISOString()
				: String(serverLead.createdAt ?? ""),
		updatedAt:
			serverLead.updatedAt instanceof Date
				? serverLead.updatedAt.toISOString()
				: String(serverLead.updatedAt ?? ""),
		deletedAt:
			serverLead.deletedAt instanceof Date
				? serverLead.deletedAt.toISOString()
				: ((serverLead.deletedAt as string) ?? null),
		syncStatus: "synced" as const,
		uploadFailed: false,
	};
}

async function pullChanges(): Promise<void> {
	const metaEntry = await db.syncMeta.get("lastSyncTimestamp");
	const lastSync = metaEntry?.value ?? "1970-01-01T00:00:00Z";

	const result = await syncClient.sync.pullChanges.query({ since: lastSync });

	let conflictCount = 0;

	for (const serverLead of result.leads) {
		const serverRecord = serverLead as unknown as Record<string, unknown>;
		const localId = serverRecord.localId as string;
		const localLead = await db.leads.get(localId);

		if (localLead) {
			const serverUpdatedAt =
				serverRecord.updatedAt instanceof Date
					? serverRecord.updatedAt.toISOString()
					: String(serverRecord.updatedAt);

			// Skip if local is newer and pending (will push next cycle)
			if (
				localLead.updatedAt > serverUpdatedAt &&
				localLead.syncStatus === "pending"
			) {
				continue;
			}

			// Server wins — overwrite local
			conflictCount++;
		}

		const mapped = mapServerLeadToLocal(serverRecord);
		const mergedPhoto = localLead?.photo ?? null;
		await db.leads.put({
			...mapped,
			photo: mergedPhoto,
			uploadFailed: localLead?.uploadFailed ?? false,
		});
	}

	await db.syncMeta.put({
		key: "lastSyncTimestamp",
		value: result.serverTimestamp,
	});

	if (conflictCount > 0) {
		toast.info(`${conflictCount} lead(s) atualizado(s) pelo servidor`);
	}
}

async function fetchLeaderboard(): Promise<void> {
	try {
		const result = await syncClient.leaderboard.getRanking.query();
		await db.leaderboardCache.clear();
		const entries = result.ranking.map((r) => ({
			userId: r.userId,
			name: r.name,
			totalLeads: r.totalLeads,
			score: r.score,
			rank: r.rank,
			lastSyncAt: result.serverTimestamp,
		}));
		if (entries.length > 0) {
			await db.leaderboardCache.bulkPut(entries);
		}
	} catch {
		// Leaderboard fetch failure must NOT affect lead sync (per Pitfall 3)
	}
}

export async function syncCycle(): Promise<{ authExpired: boolean }> {
	if (isSyncing) {
		return { authExpired: false };
	}

	isSyncing = true;
	try {
		await pushChanges();
		let photosUploaded = 0;
		try {
			photosUploaded = await uploadPendingPhotos();
		} catch {
			// Photo upload failure should not break sync cycle
		}
		// Second push to send photoUrl updates enqueued by uploadPendingPhotos
		if (photosUploaded > 0) {
			await pushChanges();
		}
		await pullChanges();
		await fetchLeaderboard();
		return { authExpired: false };
	} catch (error: unknown) {
		if (isUnauthorizedError(error)) {
			// 401: stop sync, preserve local data (OFFL-06)
			return { authExpired: true };
		}
		throw error;
	} finally {
		isSyncing = false;
	}
}

async function syncWithRetry(callbacks?: SyncEngineCallbacks): Promise<void> {
	callbacks?.onSyncStart?.();
	let lastError: string | null = null;

	for (let attempt = 0; attempt < SYNC_CONFIG.maxRetries; attempt++) {
		try {
			const result = await syncCycle();
			const syncMetaEntry = await db.syncMeta.get("lastSyncTimestamp");
			const lastSync = syncMetaEntry?.value ?? new Date().toISOString();
			if (result.authExpired) {
				callbacks?.onSyncEnd?.({ lastSync, error: null, authExpired: true });
				return;
			}
			callbacks?.onSyncEnd?.({ lastSync, error: null });
			return;
		} catch (error: unknown) {
			if (isUnauthorizedError(error)) {
				const syncMetaEntry = await db.syncMeta.get("lastSyncTimestamp");
				const lastSync = syncMetaEntry?.value ?? "";
				callbacks?.onSyncEnd?.({ lastSync, error: null, authExpired: true });
				return;
			}
			lastError = error instanceof Error ? error.message : "Erro desconhecido";
			if (attempt < SYNC_CONFIG.maxRetries - 1) {
				// Notificar UI antes do backoff (attempt é 0-indexed; mostrar próximo attempt)
				callbacks?.onRetry?.(attempt + 2, SYNC_CONFIG.maxRetries);
				await new Promise((resolve) => {
					setTimeout(resolve, getBackoffDelay(attempt));
				});
			}
		}
	}

	// All retries exhausted (D-11)
	const syncMetaEntry = await db.syncMeta.get("lastSyncTimestamp");
	const lastSync = syncMetaEntry?.value ?? "";
	callbacks?.onSyncEnd?.({ lastSync, error: lastError, isStalled: true });
}

export function startSync(
	callbacks?: SyncEngineCallbacks,
	detector?: ConnectivityDetector
): { stop: () => void; retry: () => void } {
	const _detector = detector ?? createConnectivityDetector();
	let periodicTimerId: ReturnType<typeof setTimeout> | null = null;
	let pendingResync = false;

	async function runSync(): Promise<void> {
		await syncWithRetry(callbacks);
		if (pendingResync) {
			pendingResync = false;
			await syncWithRetry(callbacks);
		}
	}

	function schedulePeriodicSync(): void {
		periodicTimerId = setTimeout(async () => {
			if (_detector.isOnline && !isSyncing) {
				await runSync();
			}
			schedulePeriodicSync();
		}, SYNC_CONFIG.periodicSyncIntervalMs);
	}

	const unsubscribe = _detector.subscribe((online) => {
		if (online) {
			runSync();
		}
	});

	_detector.start();

	if (_detector.isOnline) {
		runSync();
	}

	schedulePeriodicSync();

	function stop(): void {
		unsubscribe();
		_detector.stop();
		if (periodicTimerId !== null) {
			clearTimeout(periodicTimerId);
			periodicTimerId = null;
		}
	}

	function retry(): void {
		if (!_detector.isOnline) return;
		if (isSyncing) {
			pendingResync = true;
			return;
		}
		runSync();
	}

	return { stop, retry };
}
