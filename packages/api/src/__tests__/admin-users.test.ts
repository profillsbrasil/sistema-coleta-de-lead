import { describe, expect, it } from "vitest";

describe("adminUsersRouter", () => {
	it("deve exportar adminUsersRouter", async () => {
		const { adminUsersRouter } = await import("../routers/admin/users");
		expect(adminUsersRouter).toBeDefined();
	});

	it("deve ter procedure list", async () => {
		const { adminUsersRouter } = await import("../routers/admin/users");
		expect(adminUsersRouter.list).toBeDefined();
	});

	it("deve ter procedure updateRole", async () => {
		const { adminUsersRouter } = await import("../routers/admin/users");
		expect(adminUsersRouter.updateRole).toBeDefined();
	});

	it("deve ter procedure deactivate", async () => {
		const { adminUsersRouter } = await import("../routers/admin/users");
		expect(adminUsersRouter.deactivate).toBeDefined();
	});

	it("deve ter procedure reactivate", async () => {
		const { adminUsersRouter } = await import("../routers/admin/users");
		expect(adminUsersRouter.reactivate).toBeDefined();
	});
});
