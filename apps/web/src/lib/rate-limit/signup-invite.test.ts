// @vitest-environment node
// Teste de integração: requer um Postgres com as migrations aplicadas
// (`bun run db:migrate`) acessível via TEST_DATABASE_URL. Sem a env var, é pulado.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

vi.mock("@dashboard-leads-profills/env/server", () => ({
	env: {
		DATABASE_URL:
			process.env.TEST_DATABASE_URL ??
			"postgresql://test:test@localhost:5432/test",
		NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
		NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
		BETTER_AUTH_SECRET: "test-better-auth-secret-min-32-chars-long",
		BETTER_AUTH_URL: "http://localhost:3001",
		GOOGLE_CLIENT_ID: "test-google-client-id",
		GOOGLE_CLIENT_SECRET: "test-google-client-secret",
		NODE_ENV: "test",
	},
}));

describe.skipIf(!TEST_DATABASE_URL)("checkSignupInviteRateLimit", () => {
	let db: typeof import("@dashboard-leads-profills/db").db;
	let sql: typeof import("drizzle-orm").sql;
	let checkSignupInviteRateLimit: typeof import("./signup-invite").checkSignupInviteRateLimit;
	let cleanupExpiredRateLimits: typeof import("./signup-invite").cleanupExpiredRateLimits;

	beforeAll(async () => {
		({ db } = await import("@dashboard-leads-profills/db"));
		({ sql } = await import("drizzle-orm"));
		({ checkSignupInviteRateLimit, cleanupExpiredRateLimits } = await import(
			"./signup-invite"
		));
	});

	afterEach(async () => {
		await db.execute(sql`DELETE FROM signup_invite_rate_limit`);
	});

	it("libera a primeira chamada de um IP novo", async () => {
		expect(await checkSignupInviteRateLimit("1.1.1.1")).toBe(true);
	});

	it("libera 5 chamadas e bloqueia a 6ª na mesma janela", async () => {
		const ip = "2.2.2.2";
		for (let i = 0; i < 5; i++) {
			expect(await checkSignupInviteRateLimit(ip)).toBe(true);
		}
		expect(await checkSignupInviteRateLimit(ip)).toBe(false);
	});

	it("reinicia a janela após reset_at expirar", async () => {
		const ip = "3.3.3.3";
		for (let i = 0; i < 6; i++) {
			await checkSignupInviteRateLimit(ip);
		}
		await db.execute(
			sql`UPDATE signup_invite_rate_limit SET reset_at = now() - interval '1 second' WHERE ip = ${ip}`
		);
		expect(await checkSignupInviteRateLimit(ip)).toBe(true);
	});

	it("mantém buckets independentes por IP", async () => {
		for (let i = 0; i < 6; i++) {
			await checkSignupInviteRateLimit("4.4.4.4");
		}
		expect(await checkSignupInviteRateLimit("5.5.5.5")).toBe(true);
	});

	it("cleanup remove linhas com reset_at no passado", async () => {
		await db.execute(
			sql`INSERT INTO signup_invite_rate_limit (ip, count, reset_at) VALUES ('old', 3, now() - interval '1 minute')`
		);
		await db.execute(
			sql`INSERT INTO signup_invite_rate_limit (ip, count, reset_at) VALUES ('fresh', 1, now() + interval '1 minute')`
		);
		await cleanupExpiredRateLimits();
		const result = await db.execute(
			sql`SELECT ip FROM signup_invite_rate_limit ORDER BY ip`
		);
		expect((result.rows as { ip: string }[]).map((r) => r.ip)).toEqual([
			"fresh",
		]);
	});
});
