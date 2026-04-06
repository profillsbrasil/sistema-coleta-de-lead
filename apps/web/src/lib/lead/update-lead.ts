import { db } from "../db/index";
import { checkStorageAndCompress } from "./compression";
import type { LeadFormData } from "./validation";

import { emptyToNull } from "./helpers";

export async function updateLead(
	localId: string,
	data: LeadFormData,
	photo?: Blob | null
): Promise<void> {
	const now = new Date().toISOString();

	const processedPhoto =
		photo instanceof Blob ? await checkStorageAndCompress(photo) : photo;

	const updates: Record<string, unknown> = {
		name: data.name,
		phone: emptyToNull(data.phone),
		email: emptyToNull(data.email),
		company: emptyToNull(data.company),
		position: emptyToNull(data.position),
		segment: emptyToNull(data.segment),
		notes: emptyToNull(data.notes),
		interestTag: data.interestTag,
		updatedAt: now,
		syncStatus: "pending" as const,
	};

	if (processedPhoto !== undefined) {
		updates.photo = processedPhoto;
	}
	if (processedPhoto === null) {
		// Remoção explícita — limpa URL remota localmente também
		updates.photoUrl = null;
	}

	const syncPayload: Record<string, unknown> = {
		name: data.name,
		phone: emptyToNull(data.phone),
		email: emptyToNull(data.email),
		company: emptyToNull(data.company),
		position: emptyToNull(data.position),
		segment: emptyToNull(data.segment),
		notes: emptyToNull(data.notes),
		interestTag: data.interestTag,
	};
	if (processedPhoto === null) {
		// Propaga remoção ao servidor
		syncPayload.photoUrl = null;
	}

	await db.transaction("rw", db.leads, db.syncQueue, async () => {
		await db.leads.update(localId, updates);

		await db.syncQueue.add({
			localId,
			operation: "update",
			payload: JSON.stringify(syncPayload),
			retryCount: 0,
			timestamp: now,
		});
	});
}
