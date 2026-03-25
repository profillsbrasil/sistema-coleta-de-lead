import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db/index";
import type { Lead } from "@/lib/db/types";
import { getPersonalStats } from "@/lib/lead/stats";

function makeLead(overrides: Partial<Lead> = {}): Lead {
	return {
		localId: crypto.randomUUID(),
		serverId: null,
		userId: "user-1",
		name: "Test Lead",
		phone: "+5511999999999",
		email: null,
		company: null,
		position: null,
		segment: null,
		notes: null,
		interestTag: "morno",
		photo: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		deletedAt: null,
		syncStatus: "synced",
		...overrides,
	};
}

describe("getPersonalStats", () => {
	beforeEach(async () => {
		await db.leads.clear();
	});

	it("returns total count of non-deleted leads", async () => {
		await db.leads.bulkAdd([makeLead(), makeLead(), makeLead()]);

		const stats = await getPersonalStats("user-1");
		expect(stats.total).toBe(3);
	});

	it("returns correct tag breakdown", async () => {
		await db.leads.bulkAdd([
			makeLead({ interestTag: "quente" }),
			makeLead({ interestTag: "quente" }),
			makeLead({ interestTag: "morno" }),
			makeLead({ interestTag: "frio" }),
			makeLead({ interestTag: "frio" }),
			makeLead({ interestTag: "frio" }),
		]);

		const stats = await getPersonalStats("user-1");
		expect(stats.quente).toBe(2);
		expect(stats.morno).toBe(1);
		expect(stats.frio).toBe(3);
	});

	it("calculates weighted score", async () => {
		await db.leads.bulkAdd([
			makeLead({ interestTag: "quente" }),
			makeLead({ interestTag: "quente" }),
			makeLead({ interestTag: "morno" }),
			makeLead({ interestTag: "frio" }),
			makeLead({ interestTag: "frio" }),
			makeLead({ interestTag: "frio" }),
		]);

		const stats = await getPersonalStats("user-1");
		expect(stats.score).toBe(2 * 3 + 1 * 2 + 3 * 1);
	});

	it("counts leads created today", async () => {
		const yesterday = new Date(Date.now() - 86_400_000).toISOString();

		await db.leads.bulkAdd([
			makeLead(),
			makeLead(),
			makeLead({ createdAt: yesterday }),
		]);

		const stats = await getPersonalStats("user-1");
		expect(stats.hoje).toBe(2);
	});

	it("excludes soft-deleted leads", async () => {
		await db.leads.bulkAdd([
			makeLead(),
			makeLead({ deletedAt: new Date().toISOString() }),
		]);

		const stats = await getPersonalStats("user-1");
		expect(stats.total).toBe(1);
	});

	it("returns zeros for user with no leads", async () => {
		const stats = await getPersonalStats("empty-user");
		expect(stats.total).toBe(0);
		expect(stats.quente).toBe(0);
		expect(stats.morno).toBe(0);
		expect(stats.frio).toBe(0);
		expect(stats.hoje).toBe(0);
		expect(stats.score).toBe(0);
	});

	it("only counts leads for given userId", async () => {
		await db.leads.bulkAdd([
			makeLead({ userId: "user-1" }),
			makeLead({ userId: "user-1" }),
			makeLead({ userId: "user-2" }),
			makeLead({ userId: "user-2" }),
			makeLead({ userId: "user-2" }),
		]);

		const stats = await getPersonalStats("user-1");
		expect(stats.total).toBe(2);
	});
});
