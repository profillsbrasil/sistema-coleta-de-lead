import { createClient } from "@/lib/supabase/client";

import { db } from "../db/index";

export async function uploadPendingPhotos(): Promise<void> {
	const supabase = createClient();

	const candidates = await db.leads
		.filter((lead) => lead.photo !== null && lead.serverId !== null)
		.toArray();

	if (candidates.length === 0) {
		return;
	}

	for (const lead of candidates) {
		if (!lead.photo) {
			continue;
		}

		const filePath = `${lead.userId}/${lead.localId}.jpg`;

		const { error } = await supabase.storage
			.from("lead-photos")
			.upload(filePath, lead.photo, {
				contentType: "image/jpeg",
				upsert: true,
			});

		if (error) {
			continue;
		}

		const { data } = supabase.storage
			.from("lead-photos")
			.getPublicUrl(filePath);

		const now = new Date().toISOString();
		await db.syncQueue.add({
			localId: lead.localId,
			operation: "update",
			payload: JSON.stringify({ photoUrl: data.publicUrl }),
			retryCount: 0,
			timestamp: now,
		});

		await db.leads.update(lead.localId, { photo: null });
	}
}
