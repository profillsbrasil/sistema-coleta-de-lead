import { describe, expect, it } from "vitest";

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
