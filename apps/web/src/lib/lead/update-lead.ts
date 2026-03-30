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
		followUpStatus: data.followUpStatus,
		updatedAt: now,
		syncStatus: "pending" as const,
	};

	if (photo !== undefined) {
		updates.photo = photo;
	}

	await db.leads.update(localId, updates);

	await db.syncQueue.add({
		localId,
		operation: "update",
		payload: JSON.stringify({
			name: data.name,
			phone: emptyToNull(data.phone),
			email: emptyToNull(data.email),
			company: emptyToNull(data.company),
			position: emptyToNull(data.position),
			segment: emptyToNull(data.segment),
			notes: emptyToNull(data.notes),
			interestTag: data.interestTag,
			followUpStatus: data.followUpStatus,
		}),
		retryCount: 0,
		timestamp: now,
	});
}
