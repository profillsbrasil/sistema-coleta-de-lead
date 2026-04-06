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

// Mock constants to make retries instant in tests
vi.mock("./constants", async (importOriginal) => {
	const actual = await importOriginal<typeof import("./constants")>();
	return {
		...actual,
		getBackoffDelay: () => 0,
	};
});

// Mock photo upload
const mockUploadPendingPhotos = vi.fn();
vi.mock("./photo-upload", () => ({
	uploadPendingPhotos: mockUploadPendingPhotos,
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

// Mock localStorage since jsdom in this env doesn't provide standard Storage
const localStorageMap = new Map<string, string>();
const mockLocalStorage = {
	getItem: (key: string) => localStorageMap.get(key) ?? null,
	setItem: (key: string, value: string) => localStorageMap.set(key, value),
	removeItem: (key: string) => localStorageMap.delete(key),
	clear: () => localStorageMap.clear(),
	get length() {
		return localStorageMap.size;
	},
	key: (_index: number) => null,
};
Object.defineProperty(globalThis, "localStorage", {
	value: mockLocalStorage,
	writable: true,
	configurable: true,
});

describe("sync engine", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		localStorageMap.clear();
		await db.leads.clear();
		await db.syncQueue.clear();

		mockUploadPendingPhotos.mockResolvedValue(0);

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
			await db.syncQueue.add({
				localId: "test-uuid-1",
				operation: "create",
				timestamp: "2026-01-01T00:00:00Z",
				payload: JSON.stringify({ name: "Test" }),
				retryCount: 0,
			});

			mockPushChanges.mutate.mockResolvedValue({
				acknowledged: [{ localId: "test-uuid-1", queueId: "2026-01-01T00:00:00Z" }],
				idMappings: [],
			});

			const { syncCycle } = await import("./engine");
			await syncCycle();

			const remaining = await db.syncQueue.count();
			expect(remaining).toBe(0);
		});

		it("completes sync cycle when push resolves within timeout", async () => {
			await db.syncQueue.add({
				localId: "timeout-uuid",
				operation: "create",
				timestamp: new Date().toISOString(),
				payload: JSON.stringify({ name: "Timeout Test" }),
				retryCount: 0,
			});

			mockPushChanges.mutate.mockImplementation(
				() =>
					new Promise((resolve) =>
						setTimeout(
							() =>
								resolve({
									acknowledged: [
										{ localId: "timeout-uuid", queueId: "q1" },
									],
									idMappings: [],
								}),
							10,
						),
					),
			);

			const { syncCycle } = await import("./engine");
			await expect(syncCycle()).resolves.toEqual({ authExpired: false });
		});

		it("deletes all acknowledged queue items when same localId has multiple ops", async () => {
			const ts1 = "2026-01-01T00:00:00Z";
			const ts2 = "2026-01-01T00:00:01Z";

			await db.syncQueue.add({
				localId: "dup-uuid",
				operation: "create",
				timestamp: ts1,
				payload: JSON.stringify({ name: "Test" }),
				retryCount: 0,
			});

			await db.syncQueue.add({
				localId: "dup-uuid",
				operation: "update",
				timestamp: ts2,
				payload: JSON.stringify({ name: "Updated" }),
				retryCount: 0,
			});

			mockPushChanges.mutate.mockResolvedValue({
				acknowledged: [
					{ localId: "dup-uuid", queueId: ts1 },
					{ localId: "dup-uuid", queueId: ts2 },
				],
				idMappings: [{ localId: "dup-uuid", serverId: "42" }],
			});

			const { syncCycle } = await import("./engine");
			await syncCycle();

			const remaining = await db.syncQueue.count();
			expect(remaining).toBe(0);
		});

		it("updates serverId and syncStatus on created leads", async () => {
			const ts = "2026-01-01T00:00:00.000Z";

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
				photoUrl: null,
				createdAt: ts,
				updatedAt: ts,
				deletedAt: null,
				syncStatus: "pending",
				userId: "user-1",
			});

			await db.syncQueue.add({
				localId: "test-uuid-1",
				operation: "create",
				timestamp: ts,
				payload: JSON.stringify({ name: "Test" }),
				retryCount: 0,
			});

			mockPushChanges.mutate.mockResolvedValue({
				// queueId deve bater com o timestamp real para que bulkDelete funcione
				acknowledged: [{ localId: "test-uuid-1", queueId: ts }],
				idMappings: [{ localId: "test-uuid-1", serverId: "42" }],
			});

			const { syncCycle } = await import("./engine");
			await syncCycle();

			const lead = await db.leads.get("test-uuid-1");
			expect(lead?.serverId).toBe(42);
			expect(lead?.syncStatus).toBe("synced");
		});

		it("runs a second push after photo upload enqueues new items", async () => {
			mockUploadPendingPhotos.mockImplementation(async () => {
				await db.syncQueue.add({
					localId: "photo-push-uuid",
					operation: "update",
					timestamp: new Date().toISOString(),
					payload: JSON.stringify({ photoUrl: "https://example.com/photo.jpg" }),
					retryCount: 0,
				});
				return 1;
			});

			mockPushChanges.mutate.mockResolvedValue({
				acknowledged: [],
				idMappings: [],
			});
			mockPullChanges.query.mockResolvedValue({
				leads: [],
				serverTimestamp: new Date().toISOString(),
			});

			const { syncCycle } = await import("./engine");
			await syncCycle();

			// First push skips (queue empty), second push sends the photoUrl update
			expect(mockPushChanges.mutate).toHaveBeenCalledTimes(1);
			expect(mockPushChanges.mutate).toHaveBeenCalledWith({
				operations: expect.arrayContaining([
					expect.objectContaining({
						localId: "photo-push-uuid",
						operation: "update",
					}),
				]),
			});
		});

		it("does NOT run second push if no photos were uploaded", async () => {
			mockUploadPendingPhotos.mockResolvedValue(0);

			mockPushChanges.mutate.mockResolvedValue({
				acknowledged: [],
				idMappings: [],
			});
			mockPullChanges.query.mockResolvedValue({
				leads: [],
				serverTimestamp: new Date().toISOString(),
			});

			const { syncCycle } = await import("./engine");
			await syncCycle();

			// Only initial push (may be 0 or 1 depending on queue state)
			// The key check is that it's NOT called twice
			const callCount = mockPushChanges.mutate.mock.calls.length;
			expect(callCount).toBeLessThanOrEqual(1);
		});

		it("aplica bulkDelete(ackIds) e idMappings antes de reagir ao failedOperation", async () => {
			const successTs = "2026-01-01T00:00:00.000Z";
			const failTs = "2026-01-01T00:00:01.000Z";

			await db.leads.add({
				localId: "lead-ok",
				serverId: null,
				userId: "user-1",
				name: "Lead OK",
				phone: null,
				email: null,
				company: null,
				position: null,
				segment: null,
				notes: null,
				interestTag: "quente",
				photo: null,
				photoUrl: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				deletedAt: null,
				syncStatus: "pending",
			});
			await db.syncQueue.add({
				localId: "lead-ok",
				operation: "create",
				payload: JSON.stringify({ name: "Lead OK" }),
				retryCount: 0,
				timestamp: successTs,
			});
			await db.syncQueue.add({
				localId: "lead-fail",
				operation: "update",
				payload: JSON.stringify({ name: "Lead Fail" }),
				retryCount: 0,
				timestamp: failTs,
			});

			mockPushChanges.mutate.mockResolvedValue({
				acknowledged: [{ localId: "lead-ok", queueId: successTs }],
				idMappings: [{ localId: "lead-ok", serverId: "99" }],
				failedOperation: {
					localId: "lead-fail",
					queueId: failTs,
					message: "DB error",
				},
			});

			const { syncCycle } = await import("./engine");
			await syncCycle();

			// ACK do lead-ok foi aplicado — removido da syncQueue
			const remaining = await db.syncQueue.toArray();
			const remainingLocalIds = remaining.map((r) => r.localId);
			expect(remainingLocalIds).not.toContain("lead-ok");

			// idMapping do lead-ok foi aplicado — serverId atualizado
			const leadOk = await db.leads.get("lead-ok");
			expect(leadOk?.serverId).toBe(99);

			// lead-fail ainda está na fila com retryCount incrementado
			const failItem = remaining.find((r) => r.localId === "lead-fail");
			expect(failItem).toBeDefined();
			expect(failItem?.retryCount).toBe(1);
		});

		it("incrementa retryCount da operação falhada quando servidor retorna failedOperation", async () => {
			const failTs = "2026-01-01T10:00:00.000Z";
			await db.syncQueue.add({
				localId: "lead-broken",
				operation: "update",
				payload: JSON.stringify({ name: "Broken" }),
				retryCount: 3,
				timestamp: failTs,
			});

			mockPushChanges.mutate.mockResolvedValue({
				acknowledged: [],
				idMappings: [],
				failedOperation: {
					localId: "lead-broken",
					queueId: failTs,
					message: "constraint violation",
				},
			});

			const { syncCycle } = await import("./engine");
			await syncCycle();

			const item = await db.syncQueue
				.filter((q) => q.localId === "lead-broken")
				.first();
			expect(item?.retryCount).toBe(4);
		});

		it("mantém syncStatus 'pending' quando create ACKado mas update do mesmo localId falhou", async () => {
			const createTs = "2026-01-01T00:00:00.000Z";
			const updateTs = "2026-01-01T00:00:01.000Z";

			await db.leads.add({
				localId: "lead-partial",
				serverId: null,
				userId: "user-1",
				name: "Original",
				phone: null,
				email: null,
				company: null,
				position: null,
				segment: null,
				notes: null,
				interestTag: "quente",
				photo: null,
				photoUrl: null,
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:01.000Z",
				deletedAt: null,
				syncStatus: "pending",
			});

			// create foi ACKado, update ficou na fila (não ACKado = failedOperation)
			await db.syncQueue.add({
				localId: "lead-partial",
				operation: "create",
				payload: JSON.stringify({ name: "Original" }),
				retryCount: 0,
				timestamp: createTs,
			});
			await db.syncQueue.add({
				localId: "lead-partial",
				operation: "update",
				payload: JSON.stringify({ name: "Edited Draft" }),
				retryCount: 0,
				timestamp: updateTs,
			});

			mockPushChanges.mutate.mockResolvedValue({
				// servidor ACKou só o create, update falhou
				acknowledged: [{ localId: "lead-partial", queueId: createTs }],
				idMappings: [{ localId: "lead-partial", serverId: "77" }],
				failedOperation: {
					localId: "lead-partial",
					queueId: updateTs,
					message: "DB constraint",
				},
			});

			const { syncCycle } = await import("./engine");
			await syncCycle();

			const lead = await db.leads.get("lead-partial");
			// serverId deve ter sido atualizado (idMapping foi aplicado)
			expect(lead?.serverId).toBe(77);
			// syncStatus NÃO deve virar "synced" — update ainda está pendente
			expect(lead?.syncStatus).toBe("pending");

			// update ainda deve estar na syncQueue com retryCount incrementado
			const updateItem = await db.syncQueue
				.filter((q) => q.localId === "lead-partial" && q.operation === "update")
				.first();
			expect(updateItem).toBeDefined();
			expect(updateItem?.retryCount).toBe(1);
		});

		it("pull não sobrescreve draft local quando syncStatus é 'pending' após ACK parcial", async () => {
			const createTs = "2026-01-01T00:00:00.000Z";
			const updateTs = "2026-01-01T00:00:01.000Z";
			const draftUpdatedAt = "2026-01-01T00:00:01.000Z";
			const serverUpdatedAt = "2026-01-01T00:00:00.500Z"; // servidor tem versão mais antiga

			await db.leads.add({
				localId: "lead-draft",
				serverId: null,
				userId: "user-1",
				name: "Draft Edit",
				phone: null,
				email: null,
				company: null,
				position: null,
				segment: null,
				notes: null,
				interestTag: "morno",
				photo: null,
				photoUrl: null,
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: draftUpdatedAt,
				deletedAt: null,
				syncStatus: "pending",
			});

			await db.syncQueue.add({
				localId: "lead-draft",
				operation: "create",
				payload: JSON.stringify({ name: "Draft Edit" }),
				retryCount: 0,
				timestamp: createTs,
			});
			await db.syncQueue.add({
				localId: "lead-draft",
				operation: "update",
				payload: JSON.stringify({ name: "Draft Edit" }),
				retryCount: 0,
				timestamp: updateTs,
			});

			mockPushChanges.mutate.mockResolvedValue({
				acknowledged: [{ localId: "lead-draft", queueId: createTs }],
				idMappings: [{ localId: "lead-draft", serverId: "88" }],
				failedOperation: {
					localId: "lead-draft",
					queueId: updateTs,
					message: "DB error",
				},
			});

			// Pull retorna versão do servidor (mais antiga que o draft local)
			mockPullChanges.query.mockResolvedValue({
				leads: [
					{
						id: BigInt(88),
						localId: "lead-draft",
						userId: "user-1",
						name: "Server Version",
						phone: null,
						email: null,
						company: null,
						position: null,
						segment: null,
						notes: null,
						interestTag: "morno",
						photoUrl: null,
						createdAt: new Date("2026-01-01T00:00:00.000Z"),
						updatedAt: new Date(serverUpdatedAt),
						deletedAt: null,
					},
				],
				serverTimestamp: new Date().toISOString(),
			});

			const { syncCycle } = await import("./engine");
			await syncCycle();

			// Draft local NÃO deve ter sido sobrescrito — pull skipa leads com pending + newer updatedAt
			const lead = await db.leads.get("lead-draft");
			expect(lead?.name).toBe("Draft Edit");
			expect(lead?.syncStatus).toBe("pending");
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
				photoUrl: null,
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
				photoUrl: null,
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
				photoUrl: null,
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

		it("preserves local photo blob when pull overwrites lead data", async () => {
			const photoBlob = new Blob(["pending-photo"], { type: "image/jpeg" });

			await db.leads.add({
				localId: "photo-uuid",
				serverId: 10,
				userId: "user-1",
				name: "Old Name",
				phone: null,
				email: null,
				company: null,
				position: null,
				segment: null,
				notes: null,
				interestTag: "quente",
				photo: photoBlob,
				photoUrl: null,
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
				deletedAt: null,
				syncStatus: "synced",
			});

			mockPullChanges.query.mockResolvedValue({
				leads: [
					{
						id: BigInt(10),
						localId: "photo-uuid",
						userId: "user-1",
						name: "Server Name",
						phone: null,
						email: null,
						company: null,
						position: null,
						segment: null,
						notes: null,
						interestTag: "quente",
						photoUrl: null,
						createdAt: new Date("2026-01-01"),
						updatedAt: new Date("2026-01-03"),
						deletedAt: null,
					},
				],
				serverTimestamp: "2026-01-04T00:00:00Z",
			});

			const { syncCycle } = await import("./engine");
			await syncCycle();

			const lead = await db.leads.get("photo-uuid");
			expect(lead?.name).toBe("Server Name");
			expect(lead?.photo).not.toBeNull();
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

	describe("startSync callbacks", () => {
		it("startSync(callbacks, detector) returns cleanup function", async () => {
			const { startSync } = await import("./engine");
			const callbacks = { onSyncStart: vi.fn(), onSyncEnd: vi.fn() };
			const cleanup = startSync(callbacks, mockDetector);
			expect(typeof cleanup).toBe("function");
			cleanup();
		});

		it("startSync() without arguments still works (backward compatible)", async () => {
			const { startSync } = await import("./engine");
			const cleanup = startSync();
			expect(typeof cleanup).toBe("function");
			cleanup();
		});

		it("uses external detector when provided instead of creating new one", async () => {
			const externalDetector = {
				isOnline: true,
				start: vi.fn(),
				stop: vi.fn(),
				subscribe: vi.fn((_fn: (online: boolean) => void) => vi.fn()),
			};
			const { startSync } = await import("./engine");
			const cleanup = startSync({}, externalDetector);
			expect(externalDetector.subscribe).toHaveBeenCalled();
			expect(externalDetector.start).toHaveBeenCalled();
			cleanup();
		});

		it("calls onSyncStart when sync triggers", async () => {
			const onSyncStart = vi.fn();

			let resolveSync: () => void;
			const syncDone = new Promise<void>((resolve) => {
				resolveSync = resolve;
			});

			const onSyncEnd = vi.fn(() => resolveSync());

			let connectivityCallback: ((online: boolean) => void) | undefined;
			const externalDetector = {
				isOnline: false,
				start: vi.fn(),
				stop: vi.fn(),
				subscribe: vi.fn((fn: (online: boolean) => void) => {
					connectivityCallback = fn;
					return vi.fn();
				}),
			};

			const { startSync } = await import("./engine");
			const cleanup = startSync({ onSyncStart, onSyncEnd }, externalDetector);

			connectivityCallback?.(true);
			await syncDone;

			expect(onSyncStart).toHaveBeenCalled();

			cleanup();
		});

		it("calls onSyncEnd with { lastSync, error: null } on successful sync", async () => {
			const onSyncStart = vi.fn();

			let resolveSync: () => void;
			const syncDone = new Promise<void>((resolve) => {
				resolveSync = resolve;
			});

			const onSyncEnd = vi.fn(() => resolveSync());

			let connectivityCallback: ((online: boolean) => void) | undefined;
			const externalDetector = {
				isOnline: false,
				start: vi.fn(),
				stop: vi.fn(),
				subscribe: vi.fn((fn: (online: boolean) => void) => {
					connectivityCallback = fn;
					return vi.fn();
				}),
			};

			const { startSync } = await import("./engine");
			const cleanup = startSync({ onSyncStart, onSyncEnd }, externalDetector);

			connectivityCallback?.(true);
			await syncDone;

			expect(onSyncEnd).toHaveBeenCalledWith(
				expect.objectContaining({
					lastSync: expect.any(String),
					error: null,
				})
			);

			cleanup();
		});

		it("calls onSyncEnd with error only after all 5 retries fail (D-11)", async () => {
			const onSyncStart = vi.fn();
			const onSyncEnd = vi.fn();

			// Add data to syncQueue so pushChanges actually calls mutate
			await db.syncQueue.add({
				localId: "retry-uuid",
				operation: "create",
				timestamp: new Date().toISOString(),
				payload: JSON.stringify({ name: "Retry Test" }),
				retryCount: 0,
			});

			const transientError = new Error("Network error");
			mockPushChanges.mutate.mockRejectedValue(transientError);

			// Use a promise to track when syncWithRetry completes
			let resolveSync: () => void;
			const syncDone = new Promise<void>((resolve) => {
				resolveSync = resolve;
			});

			const wrappedOnSyncEnd = vi.fn(
				(result: { lastSync: string; error: string | null }) => {
					onSyncEnd(result);
					resolveSync();
				}
			);

			let connectivityCallback: ((online: boolean) => void) | undefined;
			const externalDetector = {
				isOnline: false,
				start: vi.fn(),
				stop: vi.fn(),
				subscribe: vi.fn((fn: (online: boolean) => void) => {
					connectivityCallback = fn;
					return vi.fn();
				}),
			};

			const { startSync } = await import("./engine");
			const cleanup = startSync(
				{ onSyncStart, onSyncEnd: wrappedOnSyncEnd },
				externalDetector
			);

			// Trigger sync via connectivity callback
			connectivityCallback?.(true);

			// Wait for all retries to complete (backoff delay mocked to 0)
			await syncDone;

			expect(onSyncStart).toHaveBeenCalledTimes(1);
			expect(onSyncEnd).toHaveBeenCalledTimes(1);
			expect(onSyncEnd).toHaveBeenCalledWith(
				expect.objectContaining({
					error: "Network error",
				})
			);

			cleanup();
		});

		it("calls onSyncEnd with error: null on 401 (auth error stops cleanly)", async () => {
			const onSyncStart = vi.fn();

			let resolveSync: () => void;
			const syncDone = new Promise<void>((resolve) => {
				resolveSync = resolve;
			});

			const onSyncEnd = vi.fn(() => resolveSync());

			// Add data to syncQueue so pushChanges calls mutate
			await db.syncQueue.add({
				localId: "auth-uuid",
				operation: "create",
				timestamp: new Date().toISOString(),
				payload: JSON.stringify({ name: "Auth Test" }),
				retryCount: 0,
			});

			const authError = new Error("UNAUTHORIZED");
			(authError as unknown as Record<string, unknown>).data = {
				code: "UNAUTHORIZED",
			};
			mockPushChanges.mutate.mockRejectedValue(authError);

			let connectivityCallback: ((online: boolean) => void) | undefined;
			const externalDetector = {
				isOnline: false,
				start: vi.fn(),
				stop: vi.fn(),
				subscribe: vi.fn((fn: (online: boolean) => void) => {
					connectivityCallback = fn;
					return vi.fn();
				}),
			};

			const { startSync } = await import("./engine");
			const cleanup = startSync({ onSyncStart, onSyncEnd }, externalDetector);

			connectivityCallback?.(true);
			await syncDone;

			expect(onSyncEnd).toHaveBeenCalledWith(
				expect.objectContaining({
					error: null,
				})
			);

			cleanup();
		});

		it("calls onSyncEnd with authExpired: true on 401 error", async () => {
			let resolveSync: () => void;
			const syncDone = new Promise<void>((resolve) => {
				resolveSync = resolve;
			});

			const onSyncEnd = vi.fn(() => resolveSync());

			await db.syncQueue.add({
				localId: "auth-expired-uuid",
				operation: "create",
				timestamp: new Date().toISOString(),
				payload: JSON.stringify({ name: "Auth Expired Test" }),
				retryCount: 0,
			});

			const authError = new Error("UNAUTHORIZED");
			(authError as unknown as Record<string, unknown>).data = {
				code: "UNAUTHORIZED",
			};
			mockPushChanges.mutate.mockRejectedValue(authError);

			const externalDetector = {
				isOnline: false,
				start: vi.fn(),
				stop: vi.fn(),
				subscribe: vi.fn((fn: (online: boolean) => void) => {
					setTimeout(() => fn(true), 0);
					return vi.fn();
				}),
			};

			const { startSync } = await import("./engine");
			const cleanup = startSync({ onSyncEnd }, externalDetector);

			await syncDone;

			expect(onSyncEnd).toHaveBeenCalledWith(
				expect.objectContaining({
					authExpired: true,
					error: null,
				}),
			);

			cleanup();
		});

		it("transient error then success does NOT fire onSyncEnd with error", async () => {
			const onSyncStart = vi.fn();

			let resolveSync: () => void;
			const syncDone = new Promise<void>((resolve) => {
				resolveSync = resolve;
			});

			const onSyncEnd = vi.fn(() => resolveSync());

			// Add data to syncQueue so pushChanges calls mutate
			await db.syncQueue.add({
				localId: "transient-uuid",
				operation: "create",
				timestamp: new Date().toISOString(),
				payload: JSON.stringify({ name: "Transient Test" }),
				retryCount: 0,
			});

			// First attempt fails, second succeeds
			mockPushChanges.mutate
				.mockRejectedValueOnce(new Error("Transient"))
				.mockResolvedValue({
					acknowledged: [{ localId: "transient-uuid", queueId: "q1" }],
					idMappings: [],
				});
			mockPullChanges.query.mockResolvedValue({
				leads: [],
				serverTimestamp: "2026-06-15T12:00:00Z",
			});

			let connectivityCallback: ((online: boolean) => void) | undefined;
			const externalDetector = {
				isOnline: false,
				start: vi.fn(),
				stop: vi.fn(),
				subscribe: vi.fn((fn: (online: boolean) => void) => {
					connectivityCallback = fn;
					return vi.fn();
				}),
			};

			const { startSync } = await import("./engine");
			const cleanup = startSync({ onSyncStart, onSyncEnd }, externalDetector);

			connectivityCallback?.(true);
			await syncDone;

			expect(onSyncEnd).toHaveBeenCalledWith(
				expect.objectContaining({
					error: null,
				})
			);

			cleanup();
		});

		it("re-schedules sync via periodic timer after retries exhausted", async () => {
			// Override periodicSyncIntervalMs to a short value for test speed
			const constants = await import("./constants");
			const originalConfig = { ...constants.SYNC_CONFIG };
			Object.assign(constants.SYNC_CONFIG, { periodicSyncIntervalMs: 50 });

			await db.syncQueue.add({
				localId: "periodic-uuid",
				operation: "create",
				timestamp: new Date().toISOString(),
				payload: JSON.stringify({ name: "Periodic Test" }),
				retryCount: 0,
			});

			mockPushChanges.mutate.mockRejectedValue(new Error("Network error"));

			const onSyncStart = vi.fn();

			let firstRoundResolve: () => void;
			const firstRoundDone = new Promise<void>((resolve) => {
				firstRoundResolve = resolve;
			});
			const onSyncEnd = vi.fn(() => {
				if (onSyncEnd.mock.calls.length === 1) {
					firstRoundResolve();
				}
			});

			const externalDetector = {
				isOnline: true,
				start: vi.fn(),
				stop: vi.fn(),
				subscribe: vi.fn(() => vi.fn()),
			};

			const { startSync } = await import("./engine");
			const cleanup = startSync({ onSyncStart, onSyncEnd }, externalDetector);

			// Wait for initial syncWithRetry to exhaust all retries (backoff mocked to 0ms)
			await firstRoundDone;

			const callsAfterFirstRound = onSyncStart.mock.calls.length;
			expect(callsAfterFirstRound).toBeGreaterThanOrEqual(1);

			// Now let the periodic timer fire with a successful response
			mockPushChanges.mutate.mockResolvedValue({
				acknowledged: [],
				idMappings: [],
			});

			// Wait for the periodic timer to fire (50ms interval)
			await new Promise((resolve) => setTimeout(resolve, 200));

			expect(onSyncStart.mock.calls.length).toBeGreaterThan(callsAfterFirstRound);

			cleanup();
			Object.assign(constants.SYNC_CONFIG, originalConfig);
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
				photoUrl: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				deletedAt: null,
				syncStatus: "pending",
				userId: "user-1",
			});

			const authError = new Error("UNAUTHORIZED");
			(authError as unknown as Record<string, unknown>).data = {
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
			await db.syncQueue.add({
				localId: "mutex-uuid",
				operation: "create",
				timestamp: new Date().toISOString(),
				payload: JSON.stringify({ name: "Mutex Test" }),
				retryCount: 0,
			});

			let resolveFirst: () => void;
			const firstPromise = new Promise<void>((resolve) => {
				resolveFirst = resolve;
			});

			mockPushChanges.mutate.mockImplementationOnce(async () => {
				await firstPromise;
				return {
					acknowledged: [{ localId: "mutex-uuid", queueId: "q1" }],
					idMappings: [],
				};
			});

			const { syncCycle } = await import("./engine");

			const first = syncCycle();
			const second = syncCycle();

			resolveFirst!();
			await first;
			await second;

			// Only one mutate call: first cycle runs, second is skipped by mutex
			expect(mockPushChanges.mutate).toHaveBeenCalledTimes(1);
		});
	});
});
