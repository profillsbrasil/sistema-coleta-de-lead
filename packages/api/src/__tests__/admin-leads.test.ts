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

describe("adminLeadsRouter", () => {
	it("deve exportar adminLeadsRouter", async () => {
		const { adminLeadsRouter } = await import("../routers/admin/leads");
		expect(adminLeadsRouter).toBeDefined();
	});

	it("deve ter procedure listByUser", async () => {
		const { adminLeadsRouter } = await import("../routers/admin/leads");
		expect(adminLeadsRouter.listByUser).toBeDefined();
	});

	it("deve ter procedure getById", async () => {
		const { adminLeadsRouter } = await import("../routers/admin/leads");
		expect(adminLeadsRouter.getById).toBeDefined();
	});

	it("deve ter procedure update", async () => {
		const { adminLeadsRouter } = await import("../routers/admin/leads");
		expect(adminLeadsRouter.update).toBeDefined();
	});

	it("deve ter procedure delete", async () => {
		const { adminLeadsRouter } = await import("../routers/admin/leads");
		expect(adminLeadsRouter.delete).toBeDefined();
	});

	it("deve ter procedure listVendors", async () => {
		const { adminLeadsRouter } = await import("../routers/admin/leads");
		expect(adminLeadsRouter.listVendors).toBeDefined();
	});
});
