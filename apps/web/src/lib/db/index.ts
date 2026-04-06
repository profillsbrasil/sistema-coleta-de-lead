import Dexie, { type EntityTable } from "dexie";
import type { Lead, LeaderboardEntry, PhotoUploadMeta, SyncQueueItem } from "./types";

const db = new Dexie("dashboard-leads") as Dexie & {
	leads: EntityTable<Lead, "localId">;
	syncQueue: EntityTable<SyncQueueItem, "id">;
	leaderboardCache: EntityTable<LeaderboardEntry, "userId">;
	photoUploadMeta: EntityTable<PhotoUploadMeta, "localId">;
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

db.version(4)
	.stores({
		leads:
			"localId, serverId, userId, interestTag, followUpStatus, syncStatus, createdAt, updatedAt",
		syncQueue: "++id, localId, operation, timestamp",
		leaderboardCache: "userId, rank",
	})
	.upgrade((tx) =>
		tx
			.table("leads")
			.toCollection()
			.modify((lead) => {
				if (!lead.followUpStatus) {
					lead.followUpStatus = "pendente";
				}
			})
	);

db.version(5)
	.stores({
		leads:
			"localId, serverId, userId, interestTag, syncStatus, createdAt, updatedAt",
		syncQueue: "++id, localId, operation, timestamp",
		leaderboardCache: "userId, rank",
	})
	.upgrade((tx) =>
		tx
			.table("leads")
			.toCollection()
			.modify((lead) => {
				lead.followUpStatus = undefined;
			})
	);

db.version(6)
	.stores({
		leads:
			"localId, serverId, userId, interestTag, syncStatus, createdAt, updatedAt",
		syncQueue: "++id, localId, operation, timestamp",
		leaderboardCache: "userId, rank",
	})
	.upgrade((tx) =>
		tx
			.table("leads")
			.toCollection()
			.modify((lead) => {
				if (lead.photoUrl === undefined) {
					lead.photoUrl = null;
				}
			})
	);

db.version(7)
	.stores({
		leads:
			"localId, serverId, userId, interestTag, syncStatus, createdAt, updatedAt",
		syncQueue: "++id, localId, operation, timestamp",
		leaderboardCache: "userId, rank",
		photoUploadMeta: "localId",
	})
	.upgrade((tx) =>
		tx
			.table("leads")
			.toCollection()
			.modify((lead) => {
				if (lead.uploadFailed === undefined) {
					lead.uploadFailed = false;
				}
			})
	);

export type { Lead, LeaderboardEntry, PhotoUploadMeta, SyncQueueItem };
export { db };
