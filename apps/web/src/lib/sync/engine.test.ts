import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock sonner toast
vi.mock("sonner", () => ({
	toast: { info: vi.fn() },
}));

// Mock connectivity detector
const mockDetector = {
	isOnline: true,
	start: vi.fn(),
	stop: vi.fn(),
	subscribe: vi.fn((_fn: (online: boolean) => void) => vi.fn()),
};
vi.mock("./connectivity", () => ({
	createConnectivityDetector: () => mockDetector,
}));

// Mock tRPC client
const mockPushChanges = { mutate: vi.fn() };
const mockPullChanges = { query: vi.fn() };
vi.mock("@trpc/client", () => ({
	createTRPCClient: () => ({
		sync: {
			pushChanges: mockPushChanges,
			pullChanges: mockPullChanges,
		},
	}),
	httpBatchLink: vi.fn(() => ({})),
}));

import { toast } from "sonner";
import { db } from "../db/index";

describe("sync engine", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		localStorage.clear();
		await db.leads.clear();
		await db.syncQueue.clear();

		// Default mock responses
		mockPushChanges.mutate.mockResolvedValue({
			acknowledged: [],
			idMappings: [],
		});
		mockPullChanges.query.mockResolvedValue({
			leads: [],
			serverTimestamp: new Date().toISOString(),
		});
	});

	afterEach(async () => {
		await db.leads.clear();
		await db.syncQueue.clear();
	});

	describe("startSync", () => {
		it("returns a cleanup function", async () => {
			const { startSync } = await import("./engine");
			const cleanup = startSync();
			expect(typeof cleanup).toBe("function");
			cleanup();
		});

		it("subscribes to connectivity detector", async () => {
			const { startSync } = await import("./engine");
			const cleanup = startSync();
			expect(mockDetector.subscribe).toHaveBeenCalled();
			expect(mockDetector.start).toHaveBeenCalled();
			cleanup();
		});
	});

	describe("push phase", () => {
		it("sends pending syncQueue items to server", async () => {
			await db.syncQueue.add({
				localId: "test-uuid-1",
				operation: "create",
				timestamp: new Date().toISOString(),
				payload: JSON.stringify({ name: "Test Lead" }),
				retryCount: 0,
			});

			mockPushChanges.mutate.mockResolvedValue({
				acknowledged: [{ localId: "test-uuid-1", queueId: "q1" }],
				idMappings: [{ localId: "test-uuid-1", serverId: "42" }],
			});

			const { syncCycle } = await import("./engine");
			await syncCycle();

			expect(mockPushChanges.mutate).toHaveBeenCalledWith({
				operations: expect.arrayContaining([
					expect.objectContaining({
						localId: "test-uuid-1",
						operation: "create",
					}),
				]),
			});
		});

		it("deletes only acknowledged items from syncQueue after push", async () => {
			const id = await db.syncQueue.add({
				localId: "test-uuid-1",
				operation: "create",
				timestamp: "2026-01-01T00:00:00Z",
				payload: JSON.stringify({ name: "Test" }),
				retryCount: 0,
			});

			mockPushChanges.mutate.mockResolvedValue({
				acknowledged: [{ localId: "test-uuid-1", queueId: String(id) }],
				idMappings: [],
			});

			const { syncCycle } = await import("./engine");
			await syncCycle();

			const remaining = await db.syncQueue.count();
			expect(remaining).toBe(0);
		});

		it("updates serverId and syncStatus on created leads", async () => {
			await db.leads.add({
				localId: "test-uuid-1",
				serverId: null,
				name: "Test",
				phone: null,
				email: null,
				company: null,
				position: null,
				segment: null,
				notes: null,
				interestTag: "quente",
				photo: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				deletedAt: null,
				syncStatus: "pending",
				userId: "user-1",
			});

			await db.syncQueue.add({
				localId: "test-uuid-1",
				operation: "create",
				timestamp: new Date().toISOString(),
				payload: JSON.stringify({ name: "Test" }),
				retryCount: 0,
			});

			mockPushChanges.mutate.mockResolvedValue({
				acknowledged: [{ localId: "test-uuid-1", queueId: "q1" }],
				idMappings: [{ localId: "test-uuid-1", serverId: "42" }],
			});

			const { syncCycle } = await import("./engine");
			await syncCycle();

			const lead = await db.leads.get("test-uuid-1");
			expect(lead?.serverId).toBe(42);
			expect(lead?.syncStatus).toBe("synced");
		});
	});

	describe("pull phase", () => {
		it("queries server for changes since last sync timestamp", async () => {
			localStorage.setItem("lastSyncTimestamp", "2026-01-01T00:00:00Z");

			mockPullChanges.query.mockResolvedValue({
				leads: [],
				serverTimestamp: "2026-01-02T00:00:00Z",
			});

			const { syncCycle } = await import("./engine");
			await syncCycle();

			expect(mockPullChanges.query).toHaveBeenCalledWith({
				since: "2026-01-01T00:00:00Z",
			});
		});

		it("applies server data when local lead does not exist (server-wins)", async () => {
			mockPullChanges.query.mockResolvedValue({
				leads: [
					{
						id: BigInt(1),
						localId: "server-uuid-1",
						userId: "user-1",
						name: "Server Lead",
						phone: "123",
						email: null,
						company: null,
						position: null,
						segment: null,
						notes: null,
						interestTag: "quente",
						photoUrl: null,
						createdAt: new Date("2026-01-01"),
						updatedAt: new Date("2026-01-02"),
						deletedAt: null,
					},
				],
				serverTimestamp: "2026-01-03T00:00:00Z",
			});

			const { syncCycle } = await import("./engine");
			await syncCycle();

			const lead = await db.leads.get("server-uuid-1");
			expect(lead).toBeDefined();
			expect(lead?.name).toBe("Server Lead");
			expect(lead?.syncStatus).toBe("synced");
		});

		it("overwrites local data when server has newer updatedAt (server-wins)", async () => {
			await db.leads.add({
				localId: "shared-uuid",
				serverId: 1,
				name: "Local Name",
				phone: null,
				email: null,
				company: null,
				position: null,
				segment: null,
				notes: null,
				interestTag: "frio",
				photo: null,
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
				deletedAt: null,
				syncStatus: "synced",
				userId: "user-1",
			});

			mockPullChanges.query.mockResolvedValue({
				leads: [
					{
						id: BigInt(1),
						localId: "shared-uuid",
						userId: "user-1",
						name: "Server Updated Name",
						phone: null,
						email: null,
						company: null,
						position: null,
						segment: null,
						notes: null,
						interestTag: "quente",
						photoUrl: null,
						createdAt: new Date("2026-01-01"),
						updatedAt: new Date("2026-01-02"),
						deletedAt: null,
					},
				],
				serverTimestamp: "2026-01-03T00:00:00Z",
			});

			const { syncCycle } = await import("./engine");
			await syncCycle();

			const lead = await db.leads.get("shared-uuid");
			expect(lead?.name).toBe("Server Updated Name");
			expect(lead?.interestTag).toBe("quente");
			expect(lead?.syncStatus).toBe("synced");
		});

		it("skips local lead when local is newer and pending", async () => {
			await db.leads.add({
				localId: "shared-uuid",
				serverId: 1,
				name: "Local Newer",
				phone: null,
				email: null,
				company: null,
				position: null,
				segment: null,
				notes: null,
				interestTag: "quente",
				photo: null,
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-03T00:00:00Z",
				deletedAt: null,
				syncStatus: "pending",
				userId: "user-1",
			});

			mockPullChanges.query.mockResolvedValue({
				leads: [
					{
						id: BigInt(1),
						localId: "shared-uuid",
						userId: "user-1",
						name: "Server Older",
						phone: null,
						email: null,
						company: null,
						position: null,
						segment: null,
						notes: null,
						interestTag: "frio",
						photoUrl: null,
						createdAt: new Date("2026-01-01"),
						updatedAt: new Date("2026-01-02"),
						deletedAt: null,
					},
				],
				serverTimestamp: "2026-01-04T00:00:00Z",
			});

			const { syncCycle } = await import("./engine");
			await syncCycle();

			const lead = await db.leads.get("shared-uuid");
			expect(lead?.name).toBe("Local Newer");
			expect(lead?.syncStatus).toBe("pending");
		});

		it("shows toast when conflicts are resolved", async () => {
			await db.leads.add({
				localId: "conflict-uuid",
				serverId: 1,
				name: "Old Local",
				phone: null,
				email: null,
				company: null,
				position: null,
				segment: null,
				notes: null,
				interestTag: "frio",
				photo: null,
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
				deletedAt: null,
				syncStatus: "synced",
				userId: "user-1",
			});

			mockPullChanges.query.mockResolvedValue({
				leads: [
					{
						id: BigInt(1),
						localId: "conflict-uuid",
						userId: "user-1",
						name: "Server Wins",
						phone: null,
						email: null,
						company: null,
						position: null,
						segment: null,
						notes: null,
						interestTag: "quente",
						photoUrl: null,
						createdAt: new Date("2026-01-01"),
						updatedAt: new Date("2026-01-02"),
						deletedAt: null,
					},
				],
				serverTimestamp: "2026-01-03T00:00:00Z",
			});

			const { syncCycle } = await import("./engine");
			await syncCycle();

			expect(toast.info).toHaveBeenCalledWith(expect.stringContaining("1"));
		});

		it("saves serverTimestamp to localStorage after pull", async () => {
			mockPullChanges.query.mockResolvedValue({
				leads: [],
				serverTimestamp: "2026-06-15T12:00:00Z",
			});

			const { syncCycle } = await import("./engine");
			await syncCycle();

			expect(localStorage.getItem("lastSyncTimestamp")).toBe(
				"2026-06-15T12:00:00Z"
			);
		});
	});

	describe("error handling", () => {
		it("preserves syncQueue and leads on 401 error", async () => {
			await db.syncQueue.add({
				localId: "test-uuid",
				operation: "create",
				timestamp: new Date().toISOString(),
				payload: JSON.stringify({ name: "Test" }),
				retryCount: 0,
			});

			await db.leads.add({
				localId: "test-uuid",
				serverId: null,
				name: "Test",
				phone: null,
				email: null,
				company: null,
				position: null,
				segment: null,
				notes: null,
				interestTag: "quente",
				photo: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				deletedAt: null,
				syncStatus: "pending",
				userId: "user-1",
			});

			const authError = new Error("UNAUTHORIZED");
			(authError as Record<string, unknown>).data = {
				code: "UNAUTHORIZED",
			};
			mockPushChanges.mutate.mockRejectedValue(authError);

			const { syncCycle } = await import("./engine");
			await syncCycle();

			const queueCount = await db.syncQueue.count();
			const leadCount = await db.leads.count();
			expect(queueCount).toBe(1);
			expect(leadCount).toBe(1);
		});

		it("prevents concurrent sync cycles via mutex", async () => {
			let resolveFirst: () => void;
			const firstPromise = new Promise<void>((resolve) => {
				resolveFirst = resolve;
			});

			mockPushChanges.mutate.mockImplementationOnce(async () => {
				await firstPromise;
				return { acknowledged: [], idMappings: [] };
			});

			const { syncCycle } = await import("./engine");

			const first = syncCycle();
			const second = syncCycle();

			resolveFirst!();
			await first;
			await second;

			// Only one call should have been made (second was blocked by mutex)
			expect(mockPushChanges.mutate).toHaveBeenCalledTimes(0);
		});
	});
});
