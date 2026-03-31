import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/lead/relative-time", () => ({
	relativeTime: vi.fn(() => "ha 2 min"),
}));

describe("sync-status-icon", () => {
	describe("deriveSyncState", () => {
		it("returns 'offline' when isOnline is false, regardless of other fields", async () => {
			const { deriveSyncState } = await import("./sync-status-icon");
			const result = deriveSyncState({
				isOnline: false,
				isSyncing: true,
				pendingCount: 3,
				lastSync: null,
				lastError: "x",
			});
			expect(result).toBe("offline");
		});

		it("returns 'syncing' when online and isSyncing is true", async () => {
			const { deriveSyncState } = await import("./sync-status-icon");
			const result = deriveSyncState({
				isOnline: true,
				isSyncing: true,
				pendingCount: 0,
				lastSync: null,
				lastError: null,
			});
			expect(result).toBe("syncing");
		});

		it("returns 'error' when online, not syncing, and lastError is set", async () => {
			const { deriveSyncState } = await import("./sync-status-icon");
			const result = deriveSyncState({
				isOnline: true,
				isSyncing: false,
				pendingCount: 0,
				lastSync: null,
				lastError: "Network error",
			});
			expect(result).toBe("error");
		});

		it("returns 'pending' when online, not syncing, no error, and pendingCount > 0", async () => {
			const { deriveSyncState } = await import("./sync-status-icon");
			const result = deriveSyncState({
				isOnline: true,
				isSyncing: false,
				pendingCount: 3,
				lastSync: "2026-01-01",
				lastError: null,
			});
			expect(result).toBe("pending");
		});

		it("returns 'synced' when online, not syncing, no error, no pending", async () => {
			const { deriveSyncState } = await import("./sync-status-icon");
			const result = deriveSyncState({
				isOnline: true,
				isSyncing: false,
				pendingCount: 0,
				lastSync: "2026-01-01",
				lastError: null,
			});
			expect(result).toBe("synced");
		});
	});

	describe("getTooltipText", () => {
		it("returns 'Sem conexao' for offline state", async () => {
			const { getTooltipText } = await import("./sync-status-icon");
			const status = {
				isOnline: false,
				isSyncing: false,
				pendingCount: 0,
				lastSync: null,
				lastError: null,
			};
			expect(getTooltipText("offline", status)).toBe("Sem conexao");
		});

		it("returns 'Sincronizando...' for syncing state", async () => {
			const { getTooltipText } = await import("./sync-status-icon");
			const status = {
				isOnline: true,
				isSyncing: true,
				pendingCount: 0,
				lastSync: null,
				lastError: null,
			};
			expect(getTooltipText("syncing", status)).toBe("Sincronizando...");
		});

		it("returns 'Erro no ultimo sync' for error state", async () => {
			const { getTooltipText } = await import("./sync-status-icon");
			const status = {
				isOnline: true,
				isSyncing: false,
				pendingCount: 0,
				lastSync: null,
				lastError: "fail",
			};
			expect(getTooltipText("error", status)).toBe("Erro no ultimo sync");
		});

		it("returns '1 alteracao pendente' for pending state with count 1", async () => {
			const { getTooltipText } = await import("./sync-status-icon");
			const status = {
				isOnline: true,
				isSyncing: false,
				pendingCount: 1,
				lastSync: null,
				lastError: null,
			};
			expect(getTooltipText("pending", status)).toBe("1 alteracao pendente");
		});

		it("returns '5 alteracoes pendentes' for pending state with count 5", async () => {
			const { getTooltipText } = await import("./sync-status-icon");
			const status = {
				isOnline: true,
				isSyncing: false,
				pendingCount: 5,
				lastSync: null,
				lastError: null,
			};
			expect(getTooltipText("pending", status)).toBe("5 alteracoes pendentes");
		});

		it("returns 'Atualizado ha 2 min' for synced state with lastSync set", async () => {
			const { getTooltipText } = await import("./sync-status-icon");
			const status = {
				isOnline: true,
				isSyncing: false,
				pendingCount: 0,
				lastSync: "2026-01-01T00:00:00Z",
				lastError: null,
			};
			expect(getTooltipText("synced", status)).toBe("Atualizado ha 2 min");
		});

		it("returns 'Sincronizado' for synced state with lastSync null", async () => {
			const { getTooltipText } = await import("./sync-status-icon");
			const status = {
				isOnline: true,
				isSyncing: false,
				pendingCount: 0,
				lastSync: null,
				lastError: null,
			};
			expect(getTooltipText("synced", status)).toBe("Sincronizado");
		});
	});

	describe("formatBadgeCount", () => {
		it("returns null for count 0", async () => {
			const { formatBadgeCount } = await import("./sync-status-icon");
			expect(formatBadgeCount(0)).toBeNull();
		});

		it("returns '1' for count 1", async () => {
			const { formatBadgeCount } = await import("./sync-status-icon");
			expect(formatBadgeCount(1)).toBe("1");
		});

		it("returns '5' for count 5", async () => {
			const { formatBadgeCount } = await import("./sync-status-icon");
			expect(formatBadgeCount(5)).toBe("5");
		});

		it("returns '99' for count 99", async () => {
			const { formatBadgeCount } = await import("./sync-status-icon");
			expect(formatBadgeCount(99)).toBe("99");
		});

		it("returns '99+' for count 100", async () => {
			const { formatBadgeCount } = await import("./sync-status-icon");
			expect(formatBadgeCount(100)).toBe("99+");
		});

		it("returns '99+' for count 500", async () => {
			const { formatBadgeCount } = await import("./sync-status-icon");
			expect(formatBadgeCount(500)).toBe("99+");
		});
	});
});
