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

interface MockLeaderboardRow {
	name: string;
	rank: number;
	score: number;
	totalLeads: number;
	userId: string;
}

async function loadLeaderboardRouter(mockRows: MockLeaderboardRow[]) {
	vi.doMock("@dashboard-leads-profills/db", () => ({
		db: {
			execute: vi.fn().mockResolvedValue({ rows: mockRows }),
		},
	}));

	vi.doMock("drizzle-orm", () => ({
		sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
			kind: "sql",
			text: strings.join("?"),
			values,
		}),
	}));

	const module = await import("../routers/leaderboard");

	const caller = module.leaderboardRouter.createCaller({
		supabase: {} as never,
		user: { sub: "user-123" },
		userRole: "vendedor",
	});

	return { router: module.leaderboardRouter, caller };
}

describe("leaderboardRouter", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it("retorna 'Vendedor #1' para usuario sem nome na posicao 1", async () => {
		const { caller } = await loadLeaderboardRouter([
			{
				userId: "user-abc",
				name: "Vendedor #1",
				totalLeads: 5,
				score: 10,
				rank: 1,
			},
		]);
		const result = await caller.getRanking();
		const first = result.ranking[0];
		expect(first?.name).toBe("Vendedor #1");
		expect(first?.rank).toBe(1);
	});

	it("retorna 'Vendedor #2' para usuario sem nome na posicao 2", async () => {
		const { caller } = await loadLeaderboardRouter([
			{
				userId: "user-abc",
				name: "Vendedor #1",
				totalLeads: 5,
				score: 10,
				rank: 1,
			},
			{
				userId: "user-xyz",
				name: "Vendedor #2",
				totalLeads: 3,
				score: 6,
				rank: 2,
			},
		]);
		const result = await caller.getRanking();
		const second = result.ranking[1];
		expect(second?.name).toBe("Vendedor #2");
		expect(second?.rank).toBe(2);
	});

	it("retorna o nome real para usuario com raw_user_meta_data.name = 'Maria Silva'", async () => {
		const { caller } = await loadLeaderboardRouter([
			{
				userId: "user-maria",
				name: "Maria Silva",
				totalLeads: 8,
				score: 20,
				rank: 1,
			},
		]);
		const result = await caller.getRanking();
		expect(result.ranking[0]?.name).toBe("Maria Silva");
	});

	it("marca isCurrentUser: true para o usuario autenticado", async () => {
		const { caller } = await loadLeaderboardRouter([
			{ userId: "user-123", name: "Joao", totalLeads: 8, score: 20, rank: 1 },
			{ userId: "user-456", name: "Maria", totalLeads: 3, score: 7, rank: 2 },
		]);
		const result = await caller.getRanking();
		expect(result.ranking[0]?.isCurrentUser).toBe(true);
		expect(result.ranking[1]?.isCurrentUser).toBe(false);
	});

	it("marca isCurrentUser: false para usuarios que nao sao o usuario atual", async () => {
		const { caller } = await loadLeaderboardRouter([
			{ userId: "user-999", name: "Pedro", totalLeads: 12, score: 30, rank: 1 },
			{ userId: "user-888", name: "Ana", totalLeads: 5, score: 10, rank: 2 },
		]);
		const result = await caller.getRanking();
		expect(result.ranking[0]?.isCurrentUser).toBe(false);
		expect(result.ranking[1]?.isCurrentUser).toBe(false);
	});

	it("nunca inclui '(voce)' no campo name mesmo para o usuario atual", async () => {
		const { caller } = await loadLeaderboardRouter([
			{ userId: "user-123", name: "Joao", totalLeads: 8, score: 20, rank: 1 },
		]);
		const result = await caller.getRanking();
		const name = result.ranking[0]?.name ?? "";
		expect(name).not.toContain("(voce)");
		expect(name).not.toContain("Voce");
	});

	it("inclui campo rank em cada entrada do ranking", async () => {
		const { caller } = await loadLeaderboardRouter([
			{
				userId: "user-abc",
				name: "Vendedor #1",
				totalLeads: 5,
				score: 10,
				rank: 1,
			},
			{ userId: "user-xyz", name: "Pedro", totalLeads: 2, score: 4, rank: 2 },
		]);
		const result = await caller.getRanking();
		expect(result.ranking[0]?.rank).toBe(1);
		expect(result.ranking[1]?.rank).toBe(2);
	});
});
