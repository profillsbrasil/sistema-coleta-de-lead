import Dexie, { type EntityTable } from "dexie";
import type { Lead, SyncQueueItem } from "./types";

const db = new Dexie("dashboard-leads") as Dexie & {
	leads: EntityTable<Lead, "localId">;
	syncQueue: EntityTable<SyncQueueItem, "id">;
};

db.version(1).stores({
	leads:
		"localId, serverId, userId, interestTag, syncStatus, createdAt, updatedAt",
	syncQueue: "++id, localId, operation, timestamp",
});

export type { Lead, SyncQueueItem };
export { db };
