import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/index";
import type { Lead } from "../db/types";
import { updateLead } from "./update-lead";

function makeLead(overrides: Partial<Lead> = {}): Lead {
	return {
		localId: "lead-1",
		serverId: null,
		userId: "user-1",
		name: "John Doe",
		phone: "+5511999999999",
		email: null,
		company: null,
		position: null,
		segment: null,
		notes: null,
		interestTag: "morno",
		photo: null,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		deletedAt: null,
		syncStatus: "synced",
		...overrides,
	};
}

describe("updateLead", () => {
	beforeEach(async () => {
		await db.leads.clear();
		await db.syncQueue.clear();
		await db.leads.add(makeLead());
	});

	it("updates the lead with new name, updatedAt and syncStatus=pending", async () => {
		await updateLead("lead-1", { name: "Jane Doe" });

		const lead = await db.leads.get("lead-1");
		expect(lead?.name).toBe("Jane Doe");
		expect(lead?.syncStatus).toBe("pending");
		expect(lead?.updatedAt).not.toBe("2026-01-01T00:00:00.000Z");
	});

	it("preserves photo when photo param is undefined", async () => {
		const photoBlob = new Blob(["photo-data"], { type: "image/jpeg" });
		await db.leads.update("lead-1", { photo: photoBlob });

		await updateLead("lead-1", { name: "Updated Name" });

		const lead = await db.leads.get("lead-1");
		expect(lead?.photo).not.toBeNull();
	});

	it("replaces photo when photo param is a Blob", async () => {
		const newPhoto = new Blob(["new-photo"], { type: "image/png" });

		await updateLead("lead-1", { name: "Same" }, newPhoto);

		const lead = await db.leads.get("lead-1");
		expect(lead?.photo).not.toBeNull();
	});

	it("sets photo to null when photo param is null", async () => {
		const photoBlob = new Blob(["photo-data"], { type: "image/jpeg" });
		await db.leads.update("lead-1", { photo: photoBlob });

		await updateLead("lead-1", { name: "Same" }, null);

		const lead = await db.leads.get("lead-1");
		expect(lead?.photo).toBeNull();
	});

	it("enqueues syncQueue item with operation=update", async () => {
		await updateLead("lead-1", { name: "New Name" });

		const queue = await db.syncQueue.toArray();
		expect(queue).toHaveLength(1);
		expect(queue[0].localId).toBe("lead-1");
		expect(queue[0].operation).toBe("update");

		const payload = JSON.parse(queue[0].payload);
		expect(payload.name).toBe("New Name");
	});
});
