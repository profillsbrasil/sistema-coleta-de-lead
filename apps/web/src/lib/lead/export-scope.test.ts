import { beforeEach, describe, expect, it } from "vitest";

import { db } from "../db";
import type { Lead } from "../db/types";
import { queryLeadExportScope } from "./export-scope";

function makeLead(overrides: Partial<Lead>): Lead {
	return {
		localId: crypto.randomUUID(),
		serverId: null,
		userId: "11111111-1111-1111-1111-111111111111",
		name: "Lead",
		phone: "+5511999999999",
		email: null,
		company: null,
		position: null,
		segment: null,
		notes: null,
		interestTag: "morno",
		followUpStatus: "pendente",
		photo: null,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		deletedAt: null,
		syncStatus: "synced",
		...overrides,
	};
}

describe("queryLeadExportScope", () => {
	beforeEach(async () => {
		await db.leads.clear();
		await db.syncQueue.clear();

		const fullScopeLeads = Array.from({ length: 22 }, (_, index) =>
			makeLead({
				localId: `lead-${String(index + 1).padStart(2, "0")}`,
				name: `Lead ${index + 1}`,
				interestTag:
					index % 3 === 0 ? "quente" : index % 3 === 1 ? "morno" : "frio",
				createdAt: `2026-01-${String(22 - index).padStart(2, "0")}T12:00:00.000Z`,
			})
		);

		await db.leads.bulkAdd([
			...fullScopeLeads,
			makeLead({
				localId: "search-name",
				name: "Ana Maria",
				company: "Profills",
				email: "ana@empresa.com",
				interestTag: "quente",
				createdAt: "2026-02-01T12:00:00.000Z",
			}),
			makeLead({
				localId: "search-company",
				name: "Carlos",
				company: "Acme Labs",
				email: "carlos@work.com",
				interestTag: "morno",
				createdAt: "2026-02-02T12:00:00.000Z",
			}),
			makeLead({
				localId: "search-email",
				name: "Beatriz",
				company: "Outra",
				email: "comercial@alpha.com",
				interestTag: "frio",
				createdAt: "2026-02-03T12:00:00.000Z",
			}),
			makeLead({
				localId: "deleted-lead",
				name: "Deleted",
				deletedAt: "2026-02-04T12:00:00.000Z",
				createdAt: "2026-02-04T12:00:00.000Z",
			}),
			makeLead({
				localId: "other-user-lead",
				userId: "22222222-2222-2222-2222-222222222222",
				name: "Other User",
				createdAt: "2026-02-05T12:00:00.000Z",
			}),
		]);
	});

	it("returns the full seller export scope in createdAt desc order without render-limit truncation", async () => {
		const result = await queryLeadExportScope({
			userId: "11111111-1111-1111-1111-111111111111",
			tag: "todos",
			searchTerm: "",
		});

		expect(result.total).toBe(25);
		expect(result.leads).toHaveLength(25);
		expect(result.leads[0]?.localId).toBe("search-email");
		expect(result.leads[1]?.localId).toBe("search-company");
		expect(result.leads[2]?.localId).toBe("search-name");
		expect(result.leads.at(-1)?.localId).toBe("lead-22");
	});

	it("applies the same tag filters and trimmed case-insensitive search term as the /leads screen", async () => {
		const quenteResults = await queryLeadExportScope({
			userId: "11111111-1111-1111-1111-111111111111",
			tag: "quente",
			searchTerm: "  ANA  ",
		});
		const mornoResults = await queryLeadExportScope({
			userId: "11111111-1111-1111-1111-111111111111",
			tag: "morno",
			searchTerm: " acme ",
		});
		const frioResults = await queryLeadExportScope({
			userId: "11111111-1111-1111-1111-111111111111",
			tag: "frio",
			searchTerm: "ALPHA",
		});

		expect(quenteResults.total).toBe(1);
		expect(quenteResults.leads.map((lead) => lead.localId)).toEqual([
			"search-name",
		]);
		expect(mornoResults.leads.map((lead) => lead.localId)).toEqual([
			"search-company",
		]);
		expect(frioResults.leads.map((lead) => lead.localId)).toEqual([
			"search-email",
		]);
	});

	it("excludes deleted rows and rows from other users from both leads and total", async () => {
		const result = await queryLeadExportScope({
			userId: "11111111-1111-1111-1111-111111111111",
			tag: "todos",
			searchTerm: "deleted",
		});

		expect(result.total).toBe(0);
		expect(result.leads).toEqual([]);

		const fullResult = await queryLeadExportScope({
			userId: "11111111-1111-1111-1111-111111111111",
			tag: "todos",
			searchTerm: "",
		});

		expect(fullResult.leads.map((lead) => lead.localId)).not.toContain(
			"deleted-lead"
		);
		expect(fullResult.leads.map((lead) => lead.localId)).not.toContain(
			"other-user-lead"
		);
		expect(fullResult.total).toBe(fullResult.leads.length);
	});
});
