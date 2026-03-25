import type { AppRouter } from "@dashboard-leads-profills/api/routers/index";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { toast } from "sonner";

import { db } from "../db/index";
import type { Lead } from "../db/types";
import { createConnectivityDetector } from "./connectivity";
import { getBackoffDelay, SYNC_CONFIG } from "./constants";
import { uploadPendingPhotos } from "./photo-upload";

const syncClient = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: "/api/trpc",
			fetch(url, options) {
				return fetch(url, {
					...options,
					credentials: "include",
				});
			},
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

	// Delete only acknowledged items from syncQueue
	const ackIds = result.acknowledged
		.map((a) => {
			const queueItem = pendingOps.find((p) => p.localId === a.localId);
			return queueItem?.id;
		})
		.filter((id): id is number => id != null);

	if (ackIds.length > 0) {
		await db.syncQueue.bulkDelete(ackIds);
	}

	// Update serverId and syncStatus for created leads
	for (const mapping of result.idMappings) {
		await db.leads.update(mapping.localId, {
			serverId: Number(mapping.serverId),
			syncStatus: "synced",
		});
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
	};
}

async function pullChanges(): Promise<void> {
	const lastSync =
		localStorage.getItem("lastSyncTimestamp") ?? "1970-01-01T00:00:00Z";

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
		await db.leads.put(mapped);
	}

	localStorage.setItem("lastSyncTimestamp", result.serverTimestamp);

	if (conflictCount > 0) {
		toast.info(`${conflictCount} lead(s) atualizado(s) pelo servidor`);
	}
}

async function fetchLeaderboard(): Promise<void> {
	try {
		const result = await syncClient.leaderboard.getRanking.query();
		await db.leaderboardCache.clear();
		const entries = result.ranking.map((r, i) => ({
			userId: r.userId,
			name: r.name,
			totalLeads: r.totalLeads,
			score: r.score,
			rank: i + 1,
			lastSyncAt: result.serverTimestamp,
		}));
		if (entries.length > 0) {
			await db.leaderboardCache.bulkPut(entries);
		}
	} catch {
		// Leaderboard fetch failure must NOT affect lead sync (per Pitfall 3)
	}
}

export async function syncCycle(): Promise<void> {
	if (isSyncing) {
		return;
	}

	isSyncing = true;
	try {
		await pushChanges();
		try {
			await uploadPendingPhotos();
		} catch {
			// Photo upload failure should not break sync cycle
		}
		await pullChanges();
		await fetchLeaderboard();
	} catch (error: unknown) {
		if (isUnauthorizedError(error)) {
			// 401: stop sync, preserve local data (OFFL-06)
			return;
		}
		throw error;
	} finally {
		isSyncing = false;
	}
}

async function syncWithRetry(): Promise<void> {
	for (let attempt = 0; attempt < SYNC_CONFIG.maxRetries; attempt++) {
		try {
			await syncCycle();
			return;
		} catch (error: unknown) {
			if (isUnauthorizedError(error)) {
				return;
			}
			if (attempt < SYNC_CONFIG.maxRetries - 1) {
				await new Promise((resolve) => {
					setTimeout(resolve, getBackoffDelay(attempt));
				});
			}
		}
	}
}

export function startSync(): () => void {
	const detector = createConnectivityDetector();

	const unsubscribe = detector.subscribe((online) => {
		if (online) {
			syncWithRetry();
		}
	});

	detector.start();

	if (detector.isOnline) {
		syncWithRetry();
	}

	return () => {
		unsubscribe();
		detector.stop();
	};
}
