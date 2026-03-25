import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
	createClient: () => ({
		storage: {
			from: () => ({
				upload: mockUpload,
				getPublicUrl: mockGetPublicUrl,
			}),
		},
	}),
}));

import { db } from "../db/index";

describe("uploadPendingPhotos", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		await db.leads.clear();
		await db.syncQueue.clear();

		mockUpload.mockResolvedValue({ error: null });
		mockGetPublicUrl.mockReturnValue({
			data: {
				publicUrl: "https://storage.example.com/lead-photos/user-1/local-1.jpg",
			},
		});
	});

	afterEach(async () => {
		await db.leads.clear();
		await db.syncQueue.clear();
	});

	it("uploads photo for leads with photo AND serverId", async () => {
		const photoBlob = new Blob(["fake-photo"], { type: "image/jpeg" });
		await db.leads.add({
			localId: "local-1",
			serverId: 42,
			userId: "user-1",
			name: "Test Lead",
			phone: null,
			email: "test@test.com",
			company: null,
			position: null,
			segment: null,
			notes: null,
			interestTag: "quente",
			photo: photoBlob,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			deletedAt: null,
			syncStatus: "synced",
		});

		const { uploadPendingPhotos } = await import("./photo-upload");
		await uploadPendingPhotos();

		expect(mockUpload).toHaveBeenCalledTimes(1);
		const [path, blob, options] = mockUpload.mock.calls[0];
		expect(path).toBe("user-1/local-1.jpg");
		expect(blob).toBeTruthy();
		expect(options).toEqual({ contentType: "image/jpeg", upsert: true });
	});

	it("skips leads without serverId (not yet synced)", async () => {
		const photoBlob = new Blob(["fake-photo"], { type: "image/jpeg" });
		await db.leads.add({
			localId: "local-2",
			serverId: null,
			userId: "user-1",
			name: "Unsynced Lead",
			phone: "123",
			email: null,
			company: null,
			position: null,
			segment: null,
			notes: null,
			interestTag: "morno",
			photo: photoBlob,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			deletedAt: null,
			syncStatus: "pending",
		});

		const { uploadPendingPhotos } = await import("./photo-upload");
		await uploadPendingPhotos();

		expect(mockUpload).not.toHaveBeenCalled();
	});

	it("skips leads without photo", async () => {
		await db.leads.add({
			localId: "local-3",
			serverId: 10,
			userId: "user-1",
			name: "No Photo Lead",
			phone: "456",
			email: null,
			company: null,
			position: null,
			segment: null,
			notes: null,
			interestTag: "frio",
			photo: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			deletedAt: null,
			syncStatus: "synced",
		});

		const { uploadPendingPhotos } = await import("./photo-upload");
		await uploadPendingPhotos();

		expect(mockUpload).not.toHaveBeenCalled();
	});

	it("clears local photo after successful upload", async () => {
		const photoBlob = new Blob(["fake-photo"], { type: "image/jpeg" });
		await db.leads.add({
			localId: "local-4",
			serverId: 42,
			userId: "user-1",
			name: "Photo Lead",
			phone: "789",
			email: null,
			company: null,
			position: null,
			segment: null,
			notes: null,
			interestTag: "quente",
			photo: photoBlob,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			deletedAt: null,
			syncStatus: "synced",
		});

		const { uploadPendingPhotos } = await import("./photo-upload");
		await uploadPendingPhotos();

		const lead = await db.leads.get("local-4");
		expect(lead?.photo).toBeNull();
	});

	it("enqueues syncQueue update with photoUrl after successful upload", async () => {
		const photoBlob = new Blob(["fake-photo"], { type: "image/jpeg" });
		await db.leads.add({
			localId: "local-5",
			serverId: 42,
			userId: "user-1",
			name: "Queued Lead",
			phone: "111",
			email: null,
			company: null,
			position: null,
			segment: null,
			notes: null,
			interestTag: "morno",
			photo: photoBlob,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			deletedAt: null,
			syncStatus: "synced",
		});

		const { uploadPendingPhotos } = await import("./photo-upload");
		await uploadPendingPhotos();

		const queueItems = await db.syncQueue.toArray();
		expect(queueItems).toHaveLength(1);
		expect(queueItems[0].localId).toBe("local-5");
		expect(queueItems[0].operation).toBe("update");

		const payload = JSON.parse(queueItems[0].payload);
		expect(payload.photoUrl).toBe(
			"https://storage.example.com/lead-photos/user-1/local-1.jpg"
		);
	});

	it("does not clear photo on upload failure (retry next cycle)", async () => {
		mockUpload.mockResolvedValue({ error: { message: "Upload failed" } });

		const photoBlob = new Blob(["fake-photo"], { type: "image/jpeg" });
		await db.leads.add({
			localId: "local-6",
			serverId: 42,
			userId: "user-1",
			name: "Failed Upload Lead",
			phone: "222",
			email: null,
			company: null,
			position: null,
			segment: null,
			notes: null,
			interestTag: "frio",
			photo: photoBlob,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			deletedAt: null,
			syncStatus: "synced",
		});

		const { uploadPendingPhotos } = await import("./photo-upload");
		await uploadPendingPhotos();

		const lead = await db.leads.get("local-6");
		expect(lead?.photo).not.toBeNull();

		const queueItems = await db.syncQueue.toArray();
		expect(queueItems).toHaveLength(0);
	});

	it("uses file path pattern userId/localId.jpg", async () => {
		const photoBlob = new Blob(["fake-photo"], { type: "image/jpeg" });
		await db.leads.add({
			localId: "abc-def-123",
			serverId: 99,
			userId: "user-xyz",
			name: "Path Test",
			phone: "333",
			email: null,
			company: null,
			position: null,
			segment: null,
			notes: null,
			interestTag: "quente",
			photo: photoBlob,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			deletedAt: null,
			syncStatus: "synced",
		});

		const { uploadPendingPhotos } = await import("./photo-upload");
		await uploadPendingPhotos();

		expect(mockUpload).toHaveBeenCalledTimes(1);
		const [path] = mockUpload.mock.calls[0];
		expect(path).toBe("user-xyz/abc-def-123.jpg");
	});
});
