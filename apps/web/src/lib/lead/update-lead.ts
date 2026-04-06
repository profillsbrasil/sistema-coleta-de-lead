import { db } from "../db/index";
import type { LeadFormData } from "./validation";

function emptyToNull(value: string | undefined): string | null {
	return !value || value === "" ? null : value;
}

export async function updateLead(
	localId: string,
	data: LeadFormData,
	photo?: Blob | null
): Promise<void> {
	const now = new Date().toISOString();

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

	if (photo !== undefined) {
		updates.photo = photo;
	}
	if (photo === null) {
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
	if (photo === null) {
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
