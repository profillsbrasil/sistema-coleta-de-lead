import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@dashboard-leads-profills/env/server", () => ({
	env: {
		DATABASE_URL: "postgresql://test:test@localhost:5432/test",
		NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
		NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
		SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
		NODE_ENV: "test",
	},
}));

interface AdminLeadRow {
	createdAt: string;
	localId: string;
	name: string;
}

async function loadAdminLeadsRouter(rows: AdminLeadRow[]) {
	const limit = vi.fn();
	const offset = vi.fn();
	const orderBy = vi.fn(async () => rows);
	const where = vi.fn(() => ({ orderBy, limit, offset }));
	const from = vi.fn(() => ({ where }));
	const select = vi.fn(() => ({ from }));

	vi.doMock("@dashboard-leads-profills/db", () => ({
		db: {
			select,
			update: vi.fn(),
			execute: vi.fn(),
		},
	}));

	vi.doMock("@dashboard-leads-profills/db/schema/leads", () => ({
		leads: {
			userId: "userId-column",
			deletedAt: "deletedAt-column",
			createdAt: "createdAt-column",
			localId: "localId-column",
			name: "name-column",
		},
		interestTagEnum: {},
	}));

	vi.doMock("drizzle-orm", () => ({
		and: (...conditions: unknown[]) => ({ kind: "and", conditions }),
		eq: (left: unknown, right: unknown) => ({ kind: "eq", left, right }),
		isNull: (value: unknown) => ({ kind: "isNull", value }),
		sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
			kind: "sql",
			text: strings.join("?"),
			values,
		}),
	}));

	const module = await import("../routers/admin/leads");

	return {
		adminLeadsRouter: module.adminLeadsRouter,
		dbSpies: {
			limit,
			offset,
			orderBy,
			where,
			from,
			select,
		},
	};
}

describe("adminLeadsRouter", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it("exposes a dedicated exportByFilters procedure alongside listByUser", async () => {
		const { adminLeadsRouter } = await loadAdminLeadsRouter([]);

		expect(adminLeadsRouter.exportByFilters).toBeDefined();
		expect(adminLeadsRouter.listByUser).toBeDefined();
	});

	it("returns all rows for the current admin filter object without pagination leakage", async () => {
		const rows = [
			{
				localId: "lead-2",
				name: "Lead 2",
				createdAt: "2026-02-02T00:00:00.000Z",
			},
			{
				localId: "lead-1",
				name: "Lead 1",
				createdAt: "2026-02-01T00:00:00.000Z",
			},
		];

		const { adminLeadsRouter, dbSpies } = await loadAdminLeadsRouter(rows);
		const caller = adminLeadsRouter.createCaller({
			supabase: {} as never,
			user: { sub: "admin-user" },
			userRole: "admin",
		});

		const result = await caller.exportByFilters({
			userId: "11111111-1111-4111-8111-111111111111",
		});

		expect(result).toEqual({
			leads: rows,
			total: 2,
		});
		expect(dbSpies.select).toHaveBeenCalledTimes(1);
		expect(dbSpies.where).toHaveBeenCalledTimes(1);
		expect(dbSpies.orderBy).toHaveBeenCalledTimes(1);
		expect(dbSpies.limit).not.toHaveBeenCalled();
		expect(dbSpies.offset).not.toHaveBeenCalled();
	});
});
