import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/index";
import type { Lead } from "../db/types";
import { deleteLead } from "./delete-lead";

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

describe("deleteLead", () => {
	beforeEach(async () => {
		await db.leads.clear();
		await db.syncQueue.clear();
		await db.leads.add(makeLead());
	});

	it("sets deletedAt to ISO string on the lead", async () => {
		await deleteLead("lead-1");

		const lead = await db.leads.get("lead-1");
		expect(lead?.deletedAt).toBeTruthy();
		expect(typeof lead?.deletedAt).toBe("string");
	});

	it("sets syncStatus to pending", async () => {
		await deleteLead("lead-1");

		const lead = await db.leads.get("lead-1");
		expect(lead?.syncStatus).toBe("pending");
	});

	it("enqueues syncQueue item with operation=delete", async () => {
		await deleteLead("lead-1");

		const queue = await db.syncQueue.toArray();
		expect(queue).toHaveLength(1);
		expect(queue[0].localId).toBe("lead-1");
		expect(queue[0].operation).toBe("delete");
	});

	it("does NOT remove the record from db.leads (soft-delete)", async () => {
		await deleteLead("lead-1");

		const lead = await db.leads.get("lead-1");
		expect(lead).toBeDefined();
		expect(lead?.localId).toBe("lead-1");
	});
});
