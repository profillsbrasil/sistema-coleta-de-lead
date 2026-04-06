import { db } from "../db/index";

export async function deleteLead(localId: string): Promise<void> {
	const now = new Date().toISOString();

	await db.transaction("rw", db.leads, db.syncQueue, async () => {
		await db.leads.update(localId, {
			deletedAt: now,
			updatedAt: now,
			syncStatus: "pending" as const,
		});

		await db.syncQueue.add({
			localId,
			operation: "delete",
			payload: JSON.stringify({ deletedAt: now }),
			retryCount: 0,
			timestamp: now,
		});
	});
}
