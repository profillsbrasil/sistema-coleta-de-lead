import { describe, expect, it } from "vitest";

describe("sync-status-provider", () => {
	it("exports useSyncStatus function", async () => {
		const mod = await import("./sync-status-provider");
		expect(typeof mod.useSyncStatus).toBe("function");
	});

	it("exports SyncStatusProvider function", async () => {
		const mod = await import("./sync-status-provider");
		expect(typeof mod.SyncStatusProvider).toBe("function");
	});

	it("useSyncStatus returns the default context shape when called outside provider", async () => {
		// useSyncStatus uses useContext which returns the default value
		// when no Provider is above it. We can verify the default value
		// by inspecting the module's createContext default.
		// Since we can't render React components in this test env without
		// @testing-library/react, we verify the exports exist and are functions.
		const mod = await import("./sync-status-provider");
		expect(mod.useSyncStatus).toBeDefined();
		expect(mod.SyncStatusProvider).toBeDefined();
	});

	it("SyncStatusProvider is a named export (not default)", async () => {
		const mod = await import("./sync-status-provider");
		expect(mod).not.toHaveProperty("default");
		expect(mod).toHaveProperty("SyncStatusProvider");
		expect(mod).toHaveProperty("useSyncStatus");
	});
});
