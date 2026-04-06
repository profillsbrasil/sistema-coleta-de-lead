import { describe, expect, it } from "vitest";

describe("Dexie database", () => {
	it("exports db instance with leads and syncQueue tables", async () => {
		const { db } = await import("@/lib/db/index");
		expect(db.leads).toBeDefined();
		expect(db.syncQueue).toBeDefined();
	});

	it("can add and retrieve a lead", async () => {
		const { db } = await import("@/lib/db/index");
		const localId = crypto.randomUUID();

		await db.leads.add({
			localId,
			serverId: null,
			name: "Test Lead",
			phone: "+5511999999999",
			email: null,
			company: null,
			position: null,
			segment: null,
			notes: null,
			interestTag: "quente",
			photo: null,
			photoUrl: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			deletedAt: null,
			syncStatus: "pending",
			userId: crypto.randomUUID(),
		});

		const lead = await db.leads.get(localId);
		expect(lead).toBeDefined();
		expect(lead?.name).toBe("Test Lead");
		expect(lead?.interestTag).toBe("quente");
		expect(lead?.syncStatus).toBe("pending");
	});

	it("can add and retrieve a sync queue item", async () => {
		const { db } = await import("@/lib/db/index");
		const localId = crypto.randomUUID();

		const id = await db.syncQueue.add({
			localId,
			operation: "create",
			timestamp: new Date().toISOString(),
			payload: JSON.stringify({ name: "Test" }),
			retryCount: 0,
		});

		const item = await db.syncQueue.get(id);
		expect(item).toBeDefined();
		expect(item?.operation).toBe("create");
		expect(item?.retryCount).toBe(0);
	});

	it("can store and retrieve photoUrl on a lead", async () => {
		const { db } = await import("@/lib/db/index");
		const localId = crypto.randomUUID();

		await db.leads.add({
			localId,
			serverId: 42,
			name: "Photo URL Lead",
			phone: null,
			email: null,
			company: null,
			position: null,
			segment: null,
			notes: null,
			interestTag: "quente",
			photo: null,
			photoUrl: "https://storage.example.com/photos/test.jpg",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			deletedAt: null,
			syncStatus: "synced",
			userId: crypto.randomUUID(),
		});

		const lead = await db.leads.get(localId);
		expect(lead?.photoUrl).toBe("https://storage.example.com/photos/test.jpg");
	});

	it("exports Lead and SyncQueueItem types", async () => {
		const mod = await import("@/lib/db/index");
		expect(mod).toBeDefined();
	});
});
