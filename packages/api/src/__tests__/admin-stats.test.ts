import { describe, expect, it, vi } from "vitest";

vi.mock("@dashboard-leads-profills/env/server", () => ({
	env: {
		DATABASE_URL: "postgresql://test:test@localhost:5432/test",
		NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
		NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
		SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
		NODE_ENV: "test",
	},
}));

vi.mock("@dashboard-leads-profills/db", () => ({
	db: {},
}));

vi.mock("@dashboard-leads-profills/db/schema/leads", () => ({
	leads: {},
	interestTagEnum: {},
}));

describe("adminStatsRouter", () => {
	it("deve exportar adminStatsRouter", async () => {
		const { adminStatsRouter } = await import("../routers/admin/stats");
		expect(adminStatsRouter).toBeDefined();
	});

	it("deve ter procedure getGlobalStats", async () => {
		const { adminStatsRouter } = await import("../routers/admin/stats");
		expect(adminStatsRouter.getGlobalStats).toBeDefined();
	});

	it("deve ter procedure getTimeline", async () => {
		const { adminStatsRouter } = await import("../routers/admin/stats");
		expect(adminStatsRouter.getTimeline).toBeDefined();
	});

	it("deve ter procedure getRanking", async () => {
		const { adminStatsRouter } = await import("../routers/admin/stats");
		expect(adminStatsRouter.getRanking).toBeDefined();
	});

	it("deve ter procedure getDistinctSegments", async () => {
		const { adminStatsRouter } = await import("../routers/admin/stats");
		expect(adminStatsRouter.getDistinctSegments).toBeDefined();
	});
});
