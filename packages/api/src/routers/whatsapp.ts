import { db } from "@dashboard-leads-profills/db";
import {
	alerts,
	dsrAudit,
	healthSnapshots,
	messages as messagesTable,
	participants,
	rateLimit,
} from "@dashboard-leads-profills/db/schema/whatsapp";
import { and, desc, eq, isNull, like, or, type SQL, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import z from "zod";

import { adminProcedure, router } from "../index";
import {
	getWhatsappConfig,
	updateWhatsappConfig,
} from "../whatsapp/config-repository";
import { whatsappConfigSchema } from "../whatsapp/config-schema";

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
	"NON_PARTICIPANT",
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
				nonParticipant: sql<number>`count(*) FILTER (WHERE state = 'NON_PARTICIPANT')::int`,
				total: sql<number>`count(*)::int`,
			})
			.from(participants);

		return (
			result[0] ?? {
				completed: 0,
				declined: 0,
				inProgress: 0,
				nonParticipant: 0,
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

	getConfig: adminProcedure.query(async () => {
		return getWhatsappConfig();
	}),

	updateConfig: adminProcedure
		.input(whatsappConfigSchema)
		.mutation(async ({ ctx, input }) => {
			await updateWhatsappConfig(input, ctx.user.id);
			return { ok: true };
		}),

	// DSR (data subject request) — exclusão LGPD por canal humano.
	// Hard delete cascade: participant → messages (FK cascade), rate_limit.
	// Snapshot do participant gravado em dsr_audit pra auditoria.
	dsrDelete: adminProcedure
		.input(
			z.object({
				waId: z.string().min(8, "wa_id muito curto"),
				reason: z.string().min(3, "Informe o motivo").max(500),
				confirm: z.literal(true, {
					message: "É preciso confirmar a exclusão",
				}),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const rows = await db
				.select()
				.from(participants)
				.where(eq(participants.waId, input.waId))
				.limit(1);
			const participant = rows[0];
			if (!participant) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: `Nenhum participant com wa_id ${input.waId}`,
				});
			}

			await db.transaction(async (tx) => {
				await tx.insert(dsrAudit).values({
					waId: input.waId,
					deletedByUserId: ctx.user.id,
					reason: input.reason,
					participantSnapshot: participant as Record<string, unknown>,
				});
				await tx.delete(rateLimit).where(eq(rateLimit.waId, input.waId));
				// FK cascade em whatsapp.messages → apaga junto.
				await tx
					.delete(participants)
					.where(eq(participants.id, participant.id));
			});

			return { ok: true, deletedParticipantId: participant.id };
		}),

	// C2: lista de alertas pra inbox admin. Por padrão só não-lidos.
	alertsList: adminProcedure
		.input(
			z
				.object({
					onlyUnread: z.boolean().default(true),
					limit: z.number().int().min(1).max(200).default(50),
				})
				.default({ onlyUnread: true, limit: 50 })
		)
		.query(async ({ input }) => {
			const where = input.onlyUnread ? isNull(alerts.readAt) : undefined;
			const [rows, countUnread] = await Promise.all([
				db
					.select()
					.from(alerts)
					.where(where)
					.orderBy(desc(alerts.createdAt))
					.limit(input.limit),
				db
					.select({ n: sql<number>`count(*)::int` })
					.from(alerts)
					.where(isNull(alerts.readAt)),
			]);
			return { items: rows, unread: countUnread[0]?.n ?? 0 };
		}),

	alertMarkRead: adminProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ input }) => {
			await db
				.update(alerts)
				.set({ readAt: new Date() })
				.where(eq(alerts.id, input.id));
			return { ok: true };
		}),

	// Resumo de saúde — usado pelo dashboard /admin/whatsapp/health.
	healthSummary: adminProcedure.query(async () => {
		const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

		const [
			msgCounts,
			participantStates,
			topFailedCodes,
			pricingAgg,
			latestHealth,
		] = await Promise.all([
				db
					.select({
						inbound: sql<number>`count(*) FILTER (WHERE direction = 'inbound')::int`,
						outboundOk: sql<number>`count(*) FILTER (WHERE direction = 'outbound' AND failed_at IS NULL)::int`,
						outboundFailed: sql<number>`count(*) FILTER (WHERE direction = 'outbound' AND failed_at IS NOT NULL)::int`,
					})
					.from(messagesTable)
					.where(sql`${messagesTable.createdAt} >= ${since}`),
				db
					.select({
						state: participants.state,
						n: sql<number>`count(*)::int`,
					})
					.from(participants)
					.groupBy(participants.state),
				db
					.select({
						code: messagesTable.failedCode,
						n: sql<number>`count(*)::int`,
					})
					.from(messagesTable)
					.where(
						and(
							sql`${messagesTable.failedAt} IS NOT NULL`,
							sql`${messagesTable.createdAt} >= ${since}`
						)
					)
					.groupBy(messagesTable.failedCode)
					.orderBy(sql`count(*) DESC`)
					.limit(5),
				db
					.select({
						category: messagesTable.pricingCategory,
						billable: sql<number>`count(*) FILTER (WHERE pricing_billable = true)::int`,
						total: sql<number>`count(*)::int`,
					})
					.from(messagesTable)
					.where(
						and(
							sql`${messagesTable.pricingCategory} IS NOT NULL`,
							sql`${messagesTable.createdAt} >= ${since}`
						)
					)
					.groupBy(messagesTable.pricingCategory),
				db
					.select({
						capturedAt: healthSnapshots.capturedAt,
						qualityRating: healthSnapshots.qualityRating,
						messagingLimitTier: healthSnapshots.messagingLimitTier,
					})
					.from(healthSnapshots)
					.orderBy(desc(healthSnapshots.capturedAt))
					.limit(1),
			]);

		const counts = msgCounts[0] ?? {
			inbound: 0,
			outboundOk: 0,
			outboundFailed: 0,
		};
		const outboundTotal = counts.outboundOk + counts.outboundFailed;
		const dropRate =
			outboundTotal === 0 ? 0 : counts.outboundFailed / outboundTotal;

		return {
			window: { from: since.toISOString(), to: new Date().toISOString() },
			messages: {
				inbound: counts.inbound,
				outboundOk: counts.outboundOk,
				outboundFailed: counts.outboundFailed,
				dropRate,
			},
			participantStates,
			topFailedCodes,
			pricing: pricingAgg,
			latestHealth: latestHealth[0] ?? null,
		};
	}),
});
