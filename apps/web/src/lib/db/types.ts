export interface Lead {
	company: string | null;
	createdAt: string;
	deletedAt: string | null;
	email: string | null;
	interestTag: "quente" | "morno" | "frio";
	localId: string;
	name: string;
	notes: string | null;
	phone: string | null;
	photo: Blob | null;
	position: string | null;
	segment: string | null;
	serverId: number | null;
	syncStatus: "pending" | "synced" | "conflict";
	updatedAt: string;
	userId: string;
}

export interface SyncQueueItem {
	id?: number;
	localId: string;
	operation: "create" | "update" | "delete";
	payload: string;
	retryCount: number;
	timestamp: string;
}

export interface LeaderboardEntry {
	lastSyncAt: string;
	name: string;
	rank: number;
	score: number;
	totalLeads: number;
	userId: string;
}
