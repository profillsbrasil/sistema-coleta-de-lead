import { describe, expect, it } from "vitest";

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
