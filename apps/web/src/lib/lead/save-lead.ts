import { db } from "../db/index";
import type { LeadFormData } from "./validation";

function emptyToNull(value: string): string | null {
	return value === "" ? null : value;
}

export async function saveLead(
	data: LeadFormData,
	userId: string,
	photo: Blob | null
): Promise<string> {
	const localId = crypto.randomUUID();
	const now = new Date().toISOString();

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
		photo,
		createdAt: now,
		updatedAt: now,
		deletedAt: null,
		syncStatus: "pending",
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

	return localId;
}
