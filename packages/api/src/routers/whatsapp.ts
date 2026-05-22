import { db } from "@dashboard-leads-profills/db";
import { participants } from "@dashboard-leads-profills/db/schema/whatsapp";
import { and, desc, eq, like, or, type SQL, sql } from "drizzle-orm";
import z from "zod";

import { adminProcedure, router } from "../index";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PARTICIPANT_STATES = [
	"COMPLETED",
	"DECLINED",
	"AWAITING_CONSENT",
	"AWAITING_NAME",
	"AWAITING_COMPANY",
	"NEW",
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeCsvField(value: string | null | undefined): string {
	if (value === null || value === undefined) {
		return "";
	}
	const str = String(value);
	if (str.includes(",") || str.includes('"') || str.includes("\n")) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const whatsappRouter = router({
	list: adminProcedure
		.input(
			z.object({
				state: z.enum(PARTICIPANT_STATES).optional(),
				search: z.string().optional(),
				limit: z.number().int().min(1).max(200).default(50),
				offset: z.number().int().min(0).default(0),
			})
		)
		.query(async ({ input }) => {
			const conditions: SQL[] = [];

			if (input.state) {
				conditions.push(eq(participants.state, input.state));
			}

			if (input.search) {
				const term = `%${input.search}%`;
				const searchCond = or(
					like(participants.name, term),
					like(participants.company, term),
					like(participants.raffleCode, term),
					like(participants.waId, term)
				);
				if (searchCond !== undefined) {
					conditions.push(searchCond);
				}
			}

			const where = conditions.length > 0 ? and(...conditions) : undefined;

			const [rows, countResult] = await Promise.all([
				db
					.select({
						id: participants.id,
						waId: participants.waId,
						state: participants.state,
						name: participants.name,
						company: participants.company,
						raffleCode: participants.raffleCode,
						consentAt: participants.consentAt,
						declinedAt: participants.declinedAt,
						termsVersion: participants.termsVersion,
						createdAt: participants.createdAt,
					})
					.from(participants)
					.where(where)
					.orderBy(desc(participants.createdAt))
					.limit(input.limit)
					.offset(input.offset),
				db
					.select({ total: sql<number>`count(*)::int` })
					.from(participants)
					.where(where),
			]);

			return {
				items: rows,
				total: countResult[0]?.total ?? 0,
			};
		}),

	stats: adminProcedure.query(async () => {
		const result = await db
			.select({
				completed: sql<number>`count(*) FILTER (WHERE state = 'COMPLETED')::int`,
				declined: sql<number>`count(*) FILTER (WHERE state = 'DECLINED')::int`,
				inProgress: sql<number>`count(*) FILTER (WHERE state IN ('AWAITING_CONSENT','AWAITING_NAME','AWAITING_COMPANY'))::int`,
				total: sql<number>`count(*)::int`,
			})
			.from(participants);

		return (
			result[0] ?? {
				completed: 0,
				declined: 0,
				inProgress: 0,
				total: 0,
			}
		);
	}),

	exportCsv: adminProcedure.query(async () => {
		const rows = await db
			.select({
				state: participants.state,
				waId: participants.waId,
				name: participants.name,
				company: participants.company,
				raffleCode: participants.raffleCode,
				createdAt: participants.createdAt,
				consentAt: participants.consentAt,
				declinedAt: participants.declinedAt,
				termsVersion: participants.termsVersion,
			})
			.from(participants)
			.where(
				or(
					eq(participants.state, "COMPLETED"),
					eq(participants.state, "DECLINED")
				)
			)
			.orderBy(desc(participants.createdAt));

		const header =
			"state,wa_id,name,company,raffle_code,created_at,consent_at,declined_at,terms_version";

		const lines = rows.map((r) =>
			[
				escapeCsvField(r.state),
				escapeCsvField(r.waId),
				escapeCsvField(r.name),
				escapeCsvField(r.company),
				escapeCsvField(r.raffleCode),
				escapeCsvField(r.createdAt.toISOString()),
				escapeCsvField(r.consentAt?.toISOString()),
				escapeCsvField(r.declinedAt?.toISOString()),
				escapeCsvField(r.termsVersion),
			].join(",")
		);

		const csv = [header, ...lines].join("\n");
		const today = new Date().toISOString().slice(0, 10);

		return { csv, filename: `sorteio_${today}.csv` };
	}),
});
