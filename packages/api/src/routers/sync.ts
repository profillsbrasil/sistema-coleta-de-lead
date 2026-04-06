import { db } from "@dashboard-leads-profills/db";
import { leads } from "@dashboard-leads-profills/db/schema/leads";
import { and, eq, gt, isNull } from "drizzle-orm";
import z from "zod";

import { protectedProcedure, router } from "../index";

const pushOperationSchema = z.object({
	localId: z.uuid(),
	operation: z.enum(["create", "update", "delete"]),
	payload: z.record(z.string(), z.unknown()),
	clientTimestamp: z.string(),
});

const pushInputSchema = z.object({
	operations: z.array(pushOperationSchema),
});

const pullInputSchema = z.object({
	since: z.string(),
});

const ALLOWED_LEAD_FIELDS = new Set([
	"name",
	"phone",
	"email",
	"company",
	"position",
	"segment",
	"notes",
	"interestTag",
	"photoUrl",
]);

function sanitizePayload(
	payload: Record<string, unknown>
): Record<string, unknown> {
	const sanitized: Record<string, unknown> = {};
	for (const key of Object.keys(payload)) {
		if (ALLOWED_LEAD_FIELDS.has(key)) {
			sanitized[key] = payload[key];
		}
	}
	return sanitized;
}

export const syncRouter = router({
	pushChanges: protectedProcedure
		.input(pushInputSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.user.sub as string;
			const acknowledged: Array<{ localId: string; queueId: string }> = [];
			const idMappings: Array<{ localId: string; serverId: string }> = [];

			for (const op of input.operations) {
				try {
					switch (op.operation) {
						case "create": {
							const fields = sanitizePayload(op.payload);
							const result = await db
								.insert(leads)
								.values({
									localId: op.localId,
									userId,
									name: (fields.name as string) ?? "",
									interestTag:
										(fields.interestTag as "quente" | "morno" | "frio") ?? "frio",
									phone: (fields.phone as string) ?? null,
									email: (fields.email as string) ?? null,
									company: (fields.company as string) ?? null,
									position: (fields.position as string) ?? null,
									segment: (fields.segment as string) ?? null,
									notes: (fields.notes as string) ?? null,
									photoUrl: (fields.photoUrl as string) ?? null,
								})
								.onConflictDoUpdate({
									target: leads.localId,
									set: {
										...fields,
										updatedAt: new Date(),
									},
								})
								.returning({ id: leads.id });

							const serverId = result[0]?.id;
							acknowledged.push({
								localId: op.localId,
								queueId: op.clientTimestamp,
							});
							if (serverId != null) {
								idMappings.push({
									localId: op.localId,
									serverId: serverId.toString(),
								});
							}
							break;
						}
						case "update": {
							const fields = sanitizePayload(op.payload);
							// Include isNull(leads.deletedAt) to prevent zombie resurrection.
							// ACK regardless of rowcount — tombstoned/missing leads cannot be resolved client-side.
							await db
								.update(leads)
								.set({ ...fields, updatedAt: new Date() })
								.where(
									and(
										eq(leads.localId, op.localId),
										eq(leads.userId, userId),
										isNull(leads.deletedAt),
									)
								)
								.returning({ localId: leads.localId });
							acknowledged.push({
								localId: op.localId,
								queueId: op.clientTimestamp,
							});
							break;
						}
						case "delete": {
							await db
								.update(leads)
								.set({ deletedAt: new Date() })
								.where(
									and(eq(leads.localId, op.localId), eq(leads.userId, userId))
								);
							acknowledged.push({
								localId: op.localId,
								queueId: op.clientTimestamp,
							});
							break;
						}
					}
				} catch (err) {
					// Fail-fast: para ao primeiro erro, retorna ACKs parciais + operação falhada
					return {
						acknowledged,
						idMappings,
						failedOperation: {
							localId: op.localId,
							queueId: op.clientTimestamp,
							message: err instanceof Error ? err.message : "Erro desconhecido",
						},
					};
				}
			}

			return { acknowledged, idMappings };
		}),

	pullChanges: protectedProcedure
		.input(pullInputSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.user.sub as string;
			const since = new Date(input.since);

			const changes = await db
				.select()
				.from(leads)
				.where(and(eq(leads.userId, userId), gt(leads.updatedAt, since)));

			return {
				leads: changes,
				serverTimestamp: new Date().toISOString(),
			};
		}),
});
