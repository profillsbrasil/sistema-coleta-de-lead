import Dexie, { type EntityTable } from "dexie";
import type { Lead, LeaderboardEntry, SyncQueueItem } from "./types";

const db = new Dexie("dashboard-leads") as Dexie & {
	leads: EntityTable<Lead, "localId">;
	syncQueue: EntityTable<SyncQueueItem, "id">;
	leaderboardCache: EntityTable<LeaderboardEntry, "userId">;
};

db.version(1).stores({
	leads:
		"localId, serverId, userId, interestTag, syncStatus, createdAt, updatedAt",
	syncQueue: "++id, localId, operation, timestamp",
});

db.version(2).stores({
	leads:
		"localId, serverId, userId, interestTag, syncStatus, createdAt, updatedAt",
	syncQueue: "++id, localId, operation, timestamp",
	leaderboardCache: "userId",
});

db.version(3).stores({
	leads:
		"localId, serverId, userId, interestTag, syncStatus, createdAt, updatedAt",
	syncQueue: "++id, localId, operation, timestamp",
	leaderboardCache: "userId, rank",
});

export type { Lead, LeaderboardEntry, SyncQueueItem };
export { db };
