import { db } from "../db/index";
import type { LeaderboardEntry } from "../db/types";
import { checkStorageAndCompress } from "./compression";
import { emptyToNull } from "./helpers";
import type { LeadFormData } from "./validation";

const SCORE_MAP: Record<string, number> = { quente: 3, morno: 2, frio: 1 };

async function updateLeaderboardOptimistically(
	userId: string,
	interestTag: string
): Promise<void> {
	try {
		const cached = await db.leaderboardCache.toArray();
		if (cached.length === 0) return;

		const scoreIncrement = SCORE_MAP[interestTag] ?? 1;
		const now = new Date().toISOString();
		let found = false;

		const updated: LeaderboardEntry[] = cached.map((entry) => {
			if (entry.userId === userId) {
				found = true;
				return {
					...entry,
					totalLeads: entry.totalLeads + 1,
					score: entry.score + scoreIncrement,
					lastSyncAt: now,
				};
			}
			return entry;
		});

		if (!found) return;

		updated.sort((a, b) => b.score - a.score || b.totalLeads - a.totalLeads);
		for (let i = 0; i < updated.length; i++) {
			updated[i] = { ...updated[i], rank: i + 1 };
		}

		await db.leaderboardCache.clear();
		await db.leaderboardCache.bulkPut(updated);
	} catch {
		// Optimistic update failure must not break lead save
	}
}

export async function saveLead(
	data: LeadFormData,
	userId: string,
	photo: Blob | null
): Promise<string> {
	const localId = crypto.randomUUID();
	const now = new Date().toISOString();

	const processedPhoto = photo ? await checkStorageAndCompress(photo) : null;

	await db.transaction("rw", db.leads, db.syncQueue, async () => {
		await db.leads.add({
			localId,
			serverId: null,
			userId,
			name: data.name,
			phone: emptyToNull(data.phone),
			email: emptyToNull(data.email),
			company: emptyToNull(data.company),
			position: emptyToNull(data.position),
			segment: emptyToNull(data.segment),
			notes: emptyToNull(data.notes),
			interestTag: data.interestTag,
			photo: processedPhoto,
			photoUrl: null,
			createdAt: now,
			updatedAt: now,
			deletedAt: null,
			syncStatus: "pending",
			uploadFailed: false,
		});

		await db.syncQueue.add({
			localId,
			operation: "create",
			payload: JSON.stringify({
				name: data.name,
				phone: emptyToNull(data.phone),
				email: emptyToNull(data.email),
				company: emptyToNull(data.company),
				position: emptyToNull(data.position),
				segment: emptyToNull(data.segment),
				notes: emptyToNull(data.notes),
				interestTag: data.interestTag,
			}),
			retryCount: 0,
			timestamp: now,
		});
	});

	await updateLeaderboardOptimistically(userId, data.interestTag);
	window.dispatchEvent(new Event("lead-saved"));

	return localId;
}
