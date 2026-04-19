import { createStorageClient } from "@/lib/storage/client";

import { db } from "../db/index";

const MAX_UPLOAD_RETRIES = 10;

export async function uploadPendingPhotos(): Promise<number> {
	const supabase = createStorageClient();

	// Excluir leads com uploadFailed=true (limite de retries atingido)
	const candidates = await db.leads
		.filter(
			(lead) =>
				lead.photo !== null &&
				lead.serverId !== null &&
				lead.uploadFailed !== true
		)
		.toArray();

	if (candidates.length === 0) {
		return 0;
	}

	let uploadedCount = 0;

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
			const existing = await db.photoUploadMeta.get(lead.localId);
			const newCount = (existing?.retryCount ?? 0) + 1;

			if (newCount >= MAX_UPLOAD_RETRIES) {
				await db.leads.update(lead.localId, { uploadFailed: true });
				await db.photoUploadMeta.delete(lead.localId);
			} else {
				await db.photoUploadMeta.put({
					localId: lead.localId,
					retryCount: newCount,
				});
			}
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

		await db.leads.update(lead.localId, {
			photo: null,
			photoUrl: data.publicUrl,
		});

		// Upload bem-sucedido — limpar meta de retries se existia
		await db.photoUploadMeta.delete(lead.localId);

		uploadedCount++;
	}

	return uploadedCount;
}
