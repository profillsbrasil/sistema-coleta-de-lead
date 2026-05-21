import { db } from "@dashboard-leads-profills/db";
import {
	messages as messagesTable,
	participants,
} from "@dashboard-leads-profills/db/schema/whatsapp";
import { TRPCError } from "@trpc/server";
import {
	and,
	desc,
	eq,
	isNotNull,
	isNull,
	like,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import z from "zod";

import { adminProcedure, router } from "../index";
import {
	winnerChurrasqueira,
	winnerCooler,
	winnerTv,
} from "../whatsapp/messages";
import { sendText } from "../whatsapp/sender";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIZE_ENUM = z.enum(["tv_65", "churrasqueira", "cooler"]);
type Prize = z.infer<typeof PRIZE_ENUM>;

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

function buildWinnerMessage(
	prize: Prize,
	name: string,
	raffleCode: string
): string {
	switch (prize) {
		case "tv_65":
			return winnerTv({ name, raffleCode }).body;
		case "churrasqueira":
			return winnerChurrasqueira({ name, raffleCode }).body;
		case "cooler":
			return winnerCooler({ name, raffleCode }).body;
		default: {
			const _exhaustive: never = prize;
			throw new Error(`Unknown prize: ${_exhaustive}`);
		}
	}
}

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
				onlyEligibleForRaffle: z.boolean().optional(),
				onlyWinners: z.boolean().optional(),
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

			if (input.onlyEligibleForRaffle) {
				conditions.push(
					eq(participants.state, "COMPLETED"),
					isNull(participants.winnerOf)
				);
			}

			if (input.onlyWinners) {
				conditions.push(isNotNull(participants.winnerOf));
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
						winnerOf: participants.winnerOf,
						winnerAt: participants.winnerAt,
						notifiedAt: participants.notifiedAt,
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
				winnersCount: sql<number>`count(*) FILTER (WHERE winner_of IS NOT NULL)::int`,
			})
			.from(participants);

		return (
			result[0] ?? {
				completed: 0,
				declined: 0,
				inProgress: 0,
				total: 0,
				winnersCount: 0,
			}
		);
	}),

	drawRaffle: adminProcedure
		.input(z.object({ prize: PRIZE_ENUM }))
		.mutation(async ({ input }) => {
			// Check if prize already has a winner
			const existing = await db
				.select({ id: participants.id })
				.from(participants)
				.where(eq(participants.winnerOf, input.prize))
				.limit(1);

			if (existing.length > 0) {
				throw new TRPCError({
					code: "CONFLICT",
					message: `Prize ${input.prize} already has a winner`,
				});
			}

			const winner = await db.transaction(async (tx) => {
				const eligible = await tx
					.select({ id: participants.id })
					.from(participants)
					.where(
						and(
							eq(participants.state, "COMPLETED"),
							isNull(participants.winnerOf)
						)
					)
					.orderBy(sql`random()`)
					.limit(1)
					.for("update");

				const picked = eligible[0];
				if (!picked) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Sem participantes elegiveis",
					});
				}

				const updated = await tx
					.update(participants)
					.set({ winnerOf: input.prize, winnerAt: new Date() })
					.where(eq(participants.id, picked.id))
					.returning();

				return updated[0];
			});

			return winner;
		}),

	markWinner: adminProcedure
		.input(
			z.object({
				participantId: z.string().uuid(),
				prize: PRIZE_ENUM,
			})
		)
		.mutation(async ({ input }) => {
			try {
				const updated = await db
					.update(participants)
					.set({ winnerOf: input.prize, winnerAt: new Date() })
					.where(
						and(
							eq(participants.id, input.participantId),
							eq(participants.state, "COMPLETED")
						)
					)
					.returning();

				if (updated.length === 0) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Participant not found or not in COMPLETED state",
					});
				}

				return updated[0];
			} catch (err) {
				if (err instanceof TRPCError) {
					throw err;
				}
				// Postgres unique constraint violation (winner_of unique index per prize)
				const message = err instanceof Error ? err.message : String(err);
				if (message.includes("unique") || message.includes("duplicate")) {
					throw new TRPCError({
						code: "CONFLICT",
						message: `Prize ${input.prize} already has a winner`,
					});
				}
				throw err;
			}
		}),

	unmarkWinner: adminProcedure
		.input(z.object({ participantId: z.string().uuid() }))
		.mutation(async ({ input }) => {
			const updated = await db
				.update(participants)
				.set({ winnerOf: null, winnerAt: null, notifiedAt: null })
				.where(eq(participants.id, input.participantId))
				.returning();

			if (updated.length === 0) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Participant not found",
				});
			}

			return updated[0];
		}),

	notifyWinner: adminProcedure
		.input(z.object({ participantId: z.string().uuid() }))
		.mutation(async ({ input }) => {
			// 1. Load participant
			const rows = await db
				.select()
				.from(participants)
				.where(eq(participants.id, input.participantId))
				.limit(1);

			const participant = rows[0];

			if (
				!(
					participant?.winnerOf &&
					participant.name &&
					participant.raffleCode &&
					participant.waId
				)
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Participant must exist and have winnerOf, name, raffleCode, and waId set",
				});
			}

			// 2. Check 24h window from last inbound message
			const lastInbound = await db
				.select({ createdAt: messagesTable.createdAt })
				.from(messagesTable)
				.where(
					and(
						eq(messagesTable.participantId, input.participantId),
						eq(messagesTable.direction, "inbound")
					)
				)
				.orderBy(desc(messagesTable.createdAt))
				.limit(1);

			const lastMessageAt = lastInbound[0]?.createdAt;
			const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

			if (!lastMessageAt || lastMessageAt < cutoff) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "OUTSIDE_24H_WINDOW",
				});
			}

			// 3. Build winner message
			const body = buildWinnerMessage(
				participant.winnerOf as Prize,
				participant.name,
				participant.raffleCode
			);

			// 4. Send
			let wamid: string;
			try {
				const result = await sendText(participant.waId, body);
				wamid = result.wamid;
			} catch (err) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message:
						err instanceof Error ? err.message : "Failed to send message",
				});
			}

			// 5. Update notifiedAt
			const now = new Date();
			await db
				.update(participants)
				.set({ notifiedAt: now })
				.where(eq(participants.id, input.participantId));

			// 6. Insert outbound message record
			await db.insert(messagesTable).values({
				participantId: input.participantId,
				direction: "outbound",
				wamid,
				type: "text",
				payload: { body },
			});

			return { ok: true, notifiedAt: now };
		}),

	exportCsv: adminProcedure.query(async () => {
		const rows = await db
			.select({
				state: participants.state,
				waId: participants.waId,
				name: participants.name,
				company: participants.company,
				raffleCode: participants.raffleCode,
				winnerOf: participants.winnerOf,
				winnerAt: participants.winnerAt,
				notifiedAt: participants.notifiedAt,
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
			"state,wa_id,name,company,raffle_code,winner_of,winner_at,notified_at,created_at,consent_at,declined_at,terms_version";

		const lines = rows.map((r) =>
			[
				escapeCsvField(r.state),
				escapeCsvField(r.waId),
				escapeCsvField(r.name),
				escapeCsvField(r.company),
				escapeCsvField(r.raffleCode),
				escapeCsvField(r.winnerOf),
				escapeCsvField(r.winnerAt?.toISOString()),
				escapeCsvField(r.notifiedAt?.toISOString()),
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
