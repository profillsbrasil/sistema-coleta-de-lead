import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@dashboard-leads-profills/env/server", () => ({
	env: {
		DATABASE_URL: "postgresql://test:test@localhost:5432/test",
		NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
		NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
		SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
		NODE_ENV: "test",
	},
}));

type MockDb = {
	insert: ReturnType<typeof vi.fn>;
	update: ReturnType<typeof vi.fn>;
	select: ReturnType<typeof vi.fn>;
};

async function loadSyncRouter(mockDb: MockDb) {
	vi.doMock("@dashboard-leads-profills/db", () => ({ db: mockDb }));
	vi.doMock("@dashboard-leads-profills/db/schema/leads", () => ({
		leads: {
			localId: "localId",
			userId: "userId",
			id: "id",
			updatedAt: "updatedAt",
			deletedAt: "deletedAt",
		},
	}));
	vi.doMock("drizzle-orm", () => ({
		and: vi.fn((...args: unknown[]) => ({ and: args })),
		eq: vi.fn((col: unknown, val: unknown) => ({ eq: [col, val] })),
		gt: vi.fn((col: unknown, val: unknown) => ({ gt: [col, val] })),
		isNull: vi.fn((col: unknown) => ({ isNull: col })),
	}));

	const module = await import("../routers/sync");
	const caller = module.syncRouter.createCaller({
		supabase: {} as never,
		user: { sub: "user-123" },
		userRole: "vendedor",
	});
	return { caller };
}

describe("syncRouter.pushChanges", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it("retorna ACKs parciais e failedOperation ao primeiro erro — para o loop", async () => {
		const returning = vi.fn().mockResolvedValue([{ id: 1 }]);
		const insertChain = {
			values: vi.fn().mockReturnThis(),
			onConflictDoUpdate: vi.fn().mockReturnThis(),
			returning,
		};
		// op2 (update) falha; op3 NÃO deve ser processada
		const updateChain = {
			set: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnValue({
				returning: vi.fn().mockRejectedValueOnce(new Error("DB constraint violation")),
			}),
		};

		const mockDb: MockDb = {
			insert: vi.fn().mockReturnValue(insertChain),
			update: vi.fn().mockReturnValue(updateChain),
			select: vi.fn(),
		};

		const { caller } = await loadSyncRouter(mockDb);

		const result = await caller.pushChanges({
			operations: [
				{
					localId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
					operation: "create",
					payload: { name: "Lead A", interestTag: "quente" },
					clientTimestamp: "2026-01-01T00:00:00.000Z",
				},
				{
					localId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
					operation: "update",
					payload: { name: "Lead B Updated" },
					clientTimestamp: "2026-01-01T00:00:01.000Z",
				},
				{
					localId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
					operation: "update",
					payload: { name: "Lead C Updated" },
					clientTimestamp: "2026-01-01T00:00:02.000Z",
				},
			],
		});

		// Op 1 foi ACKada; op 2 falhou; op 3 nunca foi processada
		expect(result.acknowledged).toHaveLength(1);
		expect(result.acknowledged[0]?.localId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");

		// failedOperation aponta para op 2
		expect(result.failedOperation).toBeDefined();
		expect(result.failedOperation?.localId).toBe("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
		expect(result.failedOperation?.queueId).toBe("2026-01-01T00:00:01.000Z");
		expect(result.failedOperation?.message).toContain("DB constraint violation");

		// Op 3 não foi processada (update.where chamado apenas 1x para op 2)
		expect(mockDb.update).toHaveBeenCalledTimes(1);
	});

	it("retorna failedOperation quando a primeira operação falha", async () => {
		const updateChain = {
			set: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnValue({
				returning: vi.fn().mockRejectedValue(new Error("DB down")),
			}),
		};
		const mockDb: MockDb = {
			insert: vi.fn(),
			update: vi.fn().mockReturnValue(updateChain),
			select: vi.fn(),
		};

		const { caller } = await loadSyncRouter(mockDb);

		const result = await caller.pushChanges({
			operations: [
				{
					localId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
					operation: "update",
					payload: { name: "X" },
					clientTimestamp: "2026-01-01T00:00:00.000Z",
				},
			],
		});

		expect(result.acknowledged).toHaveLength(0);
		expect(result.idMappings).toHaveLength(0);
		expect(result.failedOperation).toBeDefined();
		expect(result.failedOperation?.localId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
		expect(result.failedOperation?.message).toBe("DB down");
	});

	it("retorna sem failedOperation quando todas operações têm sucesso", async () => {
		const returning = vi.fn().mockResolvedValue([{ id: 99 }]);
		const insertChain = {
			values: vi.fn().mockReturnThis(),
			onConflictDoUpdate: vi.fn().mockReturnThis(),
			returning,
		};
		const mockDb: MockDb = {
			insert: vi.fn().mockReturnValue(insertChain),
			update: vi.fn(),
			select: vi.fn(),
		};

		const { caller } = await loadSyncRouter(mockDb);

		const result = await caller.pushChanges({
			operations: [
				{
					localId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
					operation: "create",
					payload: { name: "Lead A", interestTag: "frio" },
					clientTimestamp: "2026-01-01T00:00:00.000Z",
				},
				{
					localId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
					operation: "create",
					payload: { name: "Lead B", interestTag: "morno" },
					clientTimestamp: "2026-01-01T00:00:01.000Z",
				},
			],
		});

		expect(result.acknowledged).toHaveLength(2);
		expect(result.failedOperation).toBeUndefined();
	});

	it("idMappings inclui somente creates antes da falha", async () => {
		const returning = vi
			.fn()
			.mockResolvedValueOnce([{ id: 10 }]) // create op-1 ok
			.mockRejectedValue(new Error("fail")); // create op-2 falha
		const insertChain = {
			values: vi.fn().mockReturnThis(),
			onConflictDoUpdate: vi.fn().mockReturnThis(),
			returning,
		};
		const mockDb: MockDb = {
			insert: vi.fn().mockReturnValue(insertChain),
			update: vi.fn(),
			select: vi.fn(),
		};

		const { caller } = await loadSyncRouter(mockDb);

		const result = await caller.pushChanges({
			operations: [
				{
					localId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
					operation: "create",
					payload: { name: "OK", interestTag: "quente" },
					clientTimestamp: "2026-01-01T00:00:00.000Z",
				},
				{
					localId: "11111111-1111-4111-8111-111111111111",
					operation: "create",
					payload: { name: "Fail", interestTag: "frio" },
					clientTimestamp: "2026-01-01T00:00:01.000Z",
				},
			],
		});

		expect(result.idMappings).toHaveLength(1);
		expect(result.idMappings[0]?.localId).toBe("ffffffff-ffff-4fff-8fff-ffffffffffff");
		expect(result.failedOperation?.localId).toBe("11111111-1111-4111-8111-111111111111");
	});

	it("ACKa silenciosamente update de lead tombstoned ou inexistente (rowcount=0)", async () => {
		// returning vazio simula rowcount=0 — lead tombstoned (deletedAt definido) ou inexistente
		const updateChain = {
			set: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([]), // rowcount=0
			}),
		};
		const mockDb: MockDb = {
			insert: vi.fn(),
			update: vi.fn().mockReturnValue(updateChain),
			select: vi.fn(),
		};

		const { caller } = await loadSyncRouter(mockDb);

		const result = await caller.pushChanges({
			operations: [
				{
					localId: "44444444-4444-4444-8444-444444444444",
					operation: "update",
					payload: { name: "Ghost Lead" },
					clientTimestamp: "2026-01-01T00:00:00.000Z",
				},
			],
		});

		// Deve ACKar silenciosamente — sem failedOperation
		expect(result.acknowledged).toHaveLength(1);
		expect(result.acknowledged[0]?.localId).toBe("44444444-4444-4444-8444-444444444444");
		expect(result.failedOperation).toBeUndefined();
	});

	it("ACKa delete de lead inexistente (idempotente por natureza)", async () => {
		// Soft-delete retorna void — não usa .returning(), ACK é sempre garantido
		const updateChain = {
			set: vi.fn().mockReturnThis(),
			where: vi.fn().mockResolvedValue(undefined), // resolve com undefined — 0 rows afetadas
		};
		const mockDb: MockDb = {
			insert: vi.fn(),
			update: vi.fn().mockReturnValue(updateChain),
			select: vi.fn(),
		};

		const { caller } = await loadSyncRouter(mockDb);

		const result = await caller.pushChanges({
			operations: [
				{
					localId: "55555555-5555-4555-8555-555555555555",
					operation: "delete",
					payload: {},
					clientTimestamp: "2026-01-01T00:00:00.000Z",
				},
			],
		});

		// Deve ACKar independente de rowcount
		expect(result.acknowledged).toHaveLength(1);
		expect(result.acknowledged[0]?.localId).toBe("55555555-5555-4555-8555-555555555555");
		expect(result.failedOperation).toBeUndefined();
	});
});
