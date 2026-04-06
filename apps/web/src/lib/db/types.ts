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
	photoUrl: string | null;
	position: string | null;
	segment: string | null;
	serverId: number | null;
	syncStatus: "pending" | "synced" | "conflict";
	updatedAt: string;
	uploadFailed: boolean;
	userId: string;
}

export interface PhotoUploadMeta {
	localId: string;
	retryCount: number;
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
