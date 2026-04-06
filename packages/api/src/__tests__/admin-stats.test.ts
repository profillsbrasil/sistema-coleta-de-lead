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

interface AdminStatsRankingRow {
	userId: string;
	name: string;
	totalLeads: number;
	score: number;
}

async function loadAdminStatsRouter(rankingRows: AdminStatsRankingRow[]) {
	vi.doMock("@dashboard-leads-profills/db", () => ({
		db: {
			select: vi.fn(() => ({
				from: vi.fn(() => ({
					where: vi.fn(async () => []),
				})),
			})),
			selectDistinct: vi.fn(() => ({
				from: vi.fn(() => ({
					where: vi.fn(() => ({
						orderBy: vi.fn(async () => []),
					})),
				})),
			})),
			execute: vi.fn().mockResolvedValue({ rows: rankingRows }),
		},
	}));

	vi.doMock("@dashboard-leads-profills/db/schema/leads", () => ({
		leads: {
			userId: "userId-column",
			deletedAt: "deletedAt-column",
			createdAt: "createdAt-column",
			interestTag: "interestTag-column",
			segment: "segment-column",
		},
		interestTagEnum: {},
	}));

	vi.doMock("drizzle-orm", () => ({
		and: (...conditions: unknown[]) => ({ kind: "and", conditions }),
		eq: (left: unknown, right: unknown) => ({ kind: "eq", left, right }),
		isNull: (value: unknown) => ({ kind: "isNull", value }),
		isNotNull: (value: unknown) => ({ kind: "isNotNull", value }),
		asc: (col: unknown) => ({ kind: "asc", col }),
		sql: Object.assign(
			(strings: TemplateStringsArray, ...values: unknown[]) => ({
				kind: "sql",
				text: strings.join("?"),
				values,
			}),
			{ raw: (s: string) => ({ kind: "sql-raw", text: s }) }
		),
	}));

	const module = await import("../routers/admin/stats");

	return { adminStatsRouter: module.adminStatsRouter };
}

describe("adminStatsRouter", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it("deve exportar adminStatsRouter", async () => {
		const { adminStatsRouter } = await loadAdminStatsRouter([]);
		expect(adminStatsRouter).toBeDefined();
	});

	it("deve ter procedure getGlobalStats", async () => {
		const { adminStatsRouter } = await loadAdminStatsRouter([]);
		expect(adminStatsRouter.getGlobalStats).toBeDefined();
	});

	it("deve ter procedure getTimeline", async () => {
		const { adminStatsRouter } = await loadAdminStatsRouter([]);
		expect(adminStatsRouter.getTimeline).toBeDefined();
	});

	it("deve ter procedure getRanking", async () => {
		const { adminStatsRouter } = await loadAdminStatsRouter([]);
		expect(adminStatsRouter.getRanking).toBeDefined();
	});

	it("deve ter procedure getDistinctSegments", async () => {
		const { adminStatsRouter } = await loadAdminStatsRouter([]);
		expect(adminStatsRouter.getDistinctSegments).toBeDefined();
	});

	it("getRanking retorna name nao-nulo para usuario sem metadata de nome", async () => {
		const rankingRows: AdminStatsRankingRow[] = [
			{ userId: "user-1", name: "Maria", totalLeads: 10, score: 25 },
			{ userId: "user-2", name: "pedro.alves", totalLeads: 5, score: 12 },
		];

		const { adminStatsRouter } = await loadAdminStatsRouter(rankingRows);

		const caller = adminStatsRouter.createCaller({
			supabase: {} as never,
			user: { sub: "admin-user" },
			userRole: "admin",
		});

		const result = await caller.getRanking({});

		expect(result).toHaveLength(2);
		expect(result[1]?.name).toBe("pedro.alves");
		for (const entry of result) {
			expect(entry.name).toBeTruthy();
			expect(typeof entry.name).toBe("string");
		}
	});
});
