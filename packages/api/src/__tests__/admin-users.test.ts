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

vi.mock("@dashboard-leads-profills/db/schema/auth", () => ({
	userRoles: {},
	appRoleEnum: {},
}));

vi.mock("@supabase/supabase-js", () => ({
	createClient: vi.fn(() => ({
		auth: {
			admin: {
				listUsers: vi.fn(),
				updateUserById: vi.fn(),
			},
		},
	})),
}));

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
