import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/index";
import type { Lead } from "../db/types";
import { queryLeads } from "./queries";

function makeLead(overrides: Partial<Lead>): Lead {
	return {
		localId: crypto.randomUUID(),
		serverId: null,
		userId: "user-1",
		name: "Lead",
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

describe("queryLeads", () => {
	beforeEach(async () => {
		await db.leads.clear();
		await db.syncQueue.clear();

		await db.leads.bulkAdd([
			makeLead({
				localId: "lead-1",
				name: "Lead Quente",
				interestTag: "quente",
				createdAt: "2026-01-05T00:00:00.000Z",
			}),
			makeLead({
				localId: "lead-2",
				name: "Lead Morno",
				interestTag: "morno",
				createdAt: "2026-01-03T00:00:00.000Z",
			}),
			makeLead({
				localId: "lead-3",
				name: "Lead Frio",
				interestTag: "frio",
				createdAt: "2026-01-04T00:00:00.000Z",
			}),
			makeLead({
				localId: "lead-4",
				name: "Lead Deleted",
				interestTag: "quente",
				createdAt: "2026-01-06T00:00:00.000Z",
				deletedAt: "2026-01-07T00:00:00.000Z",
			}),
			makeLead({
				localId: "lead-5",
				name: "Lead Other User",
				userId: "user-2",
				interestTag: "quente",
				createdAt: "2026-01-08T00:00:00.000Z",
			}),
		]);
	});

	it("returns leads for userId sorted by createdAt desc, max 20", async () => {
		const results = await queryLeads("user-1", "todos", 20);

		expect(results).toHaveLength(3);
		expect(results[0].localId).toBe("lead-1");
		expect(results[1].localId).toBe("lead-3");
		expect(results[2].localId).toBe("lead-2");
	});

	it("excludes leads where deletedAt is not null", async () => {
		const results = await queryLeads("user-1", "todos", 20);

		const ids = results.map((r) => r.localId);
		expect(ids).not.toContain("lead-4");
	});

	it("returns only leads with interestTag=quente when filtered", async () => {
		const results = await queryLeads("user-1", "quente", 20);

		expect(results).toHaveLength(1);
		expect(results[0].interestTag).toBe("quente");
		expect(results[0].localId).toBe("lead-1");
	});

	it("respects limit parameter", async () => {
		const results = await queryLeads("user-1", "todos", 2);

		expect(results).toHaveLength(2);
	});

	it("returns empty array when no leads match", async () => {
		const results = await queryLeads("nonexistent-user", "todos", 20);

		expect(results).toEqual([]);
	});
});
