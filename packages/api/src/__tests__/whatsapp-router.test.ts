import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@dashboard-leads-profills/env/server", () => ({
	env: {
		DATABASE_URL: "postgresql://test:test@localhost:5432/test",
		NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
		NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
		BETTER_AUTH_SECRET: "test-better-auth-secret-min-32-chars-long",
		BETTER_AUTH_URL: "http://localhost:3001",
		GOOGLE_CLIENT_ID: "test-google-client-id",
		GOOGLE_CLIENT_SECRET: "test-google-client-secret",
		NODE_ENV: "test",
		WHATSAPP_ACCESS_TOKEN: "test",
		WHATSAPP_PHONE_NUMBER_ID: "test",
		WHATSAPP_BUSINESS_ACCOUNT_ID: "test",
		WHATSAPP_APP_SECRET: "test",
		WHATSAPP_VERIFY_TOKEN: "test",
		TERMS_VERSION: "v1",
	},
}));

interface ParticipantRow {
	company: string | null;
	consentAt: Date | null;
	createdAt: Date;
	declinedAt: Date | null;
	id: string;
	name: string | null;
	raffleCode: string | null;
	state: string;
	termsVersion: string | null;
	waId: string;
}

async function loadWhatsappRouter(rows: ParticipantRow[]) {
	const orderBy = vi.fn(async () => rows);
	const offset = vi.fn(() => ({ orderBy }));
	const limit = vi.fn(() => ({ offset }));
	const where = vi.fn(() => ({ orderBy, limit, offset }));
	const from = vi.fn(() => ({ where, orderBy }));
	const select = vi.fn(() => ({ from }));

	vi.doMock("@dashboard-leads-profills/db", () => ({
		db: { select },
	}));

	vi.doMock("@dashboard-leads-profills/db/schema/whatsapp", () => ({
		participants: {
			id: "id-column",
			waId: "wa-id-column",
			state: "state-column",
			name: "name-column",
			company: "company-column",
			raffleCode: "raffle-code-column",
			consentAt: "consent-at-column",
			declinedAt: "declined-at-column",
			termsVersion: "terms-version-column",
			createdAt: "created-at-column",
		},
	}));

	vi.doMock("drizzle-orm", () => ({
		and: (...conditions: unknown[]) => ({ kind: "and", conditions }),
		desc: (col: unknown) => ({ kind: "desc", col }),
		eq: (left: unknown, right: unknown) => ({ kind: "eq", left, right }),
		like: (left: unknown, right: unknown) => ({ kind: "like", left, right }),
		or: (...conditions: unknown[]) => ({ kind: "or", conditions }),
		sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
			kind: "sql",
			text: strings.join("?"),
			values,
		}),
	}));

	const module = await import("../routers/whatsapp");
	return { whatsappRouter: module.whatsappRouter, spies: { select } };
}

describe("whatsappRouter admin raffle participants", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it("exposes participant operations and no in-system winner mutations", async () => {
		const { whatsappRouter } = await loadWhatsappRouter([]);

		expect(whatsappRouter.list).toBeDefined();
		expect(whatsappRouter.stats).toBeDefined();
		expect(whatsappRouter.exportCsv).toBeDefined();
		expect("drawRaffle" in whatsappRouter).toBe(false);
		expect("markWinner" in whatsappRouter).toBe(false);
		expect("unmarkWinner" in whatsappRouter).toBe(false);
		expect("notifyWinner" in whatsappRouter).toBe(false);
	});

	it("exports participant CSV without winner columns", async () => {
		const rows: ParticipantRow[] = [
			{
				id: "00000000-0000-0000-0000-000000000001",
				waId: "5511999990001",
				state: "COMPLETED",
				name: "Ana",
				company: "Profills",
				raffleCode: "PROFILLS-1234",
				createdAt: new Date("2026-05-22T10:00:00.000Z"),
				consentAt: new Date("2026-05-22T10:01:00.000Z"),
				declinedAt: null,
				termsVersion: "v1",
			},
		];
		const { whatsappRouter } = await loadWhatsappRouter(rows);
		const caller = whatsappRouter.createCaller({
			user: { id: "admin-user" } as never,
			headers: new Headers(),
			session: null,
			userRole: "admin",
		});

		const result = await caller.exportCsv();

		expect(result.csv.split("\n")[0]).toBe(
			"state,wa_id,name,company,raffle_code,created_at,consent_at,declined_at,terms_version"
		);
		expect(result.csv).toContain("PROFILLS-1234");
		expect(result.csv).not.toContain("winner_of");
		expect(result.csv).not.toContain("notified_at");
	});
});
