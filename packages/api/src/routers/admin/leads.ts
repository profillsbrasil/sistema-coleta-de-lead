import { db } from "@dashboard-leads-profills/db";
import { leads } from "@dashboard-leads-profills/db/schema/leads";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import z from "zod";

import { adminProcedure, router } from "../../index";

const adminLeadFilterSchema = z.object({
	userId: z.string().uuid(),
});

export const adminLeadsRouter = router({
	listByUser: adminProcedure
		.input(
			adminLeadFilterSchema.extend({
				limit: z.number().min(1).max(100).default(20),
				offset: z.number().min(0).default(0),
			})
		)
		.query(async ({ input }) => {
			const [rows, countResult] = await Promise.all([
				db
					.select()
					.from(leads)
					.where(and(eq(leads.userId, input.userId), isNull(leads.deletedAt)))
					.orderBy(sql`${leads.createdAt} DESC`)
					.limit(input.limit)
					.offset(input.offset),
				db
					.select({ count: sql<number>`count(*)::int` })
					.from(leads)
					.where(and(eq(leads.userId, input.userId), isNull(leads.deletedAt))),
			]);

			return {
				leads: rows,
				total: countResult[0]?.count ?? 0,
			};
		}),

	exportByFilters: adminProcedure
		.input(adminLeadFilterSchema)
		.query(async ({ input }) => {
			const rows = await db
				.select()
				.from(leads)
				.where(and(eq(leads.userId, input.userId), isNull(leads.deletedAt)))
				.orderBy(sql`${leads.createdAt} DESC`);

			return {
				leads: rows,
				total: rows.length,
			};
		}),

	getById: adminProcedure
		.input(z.object({ leadId: z.string() }))
		.query(async ({ input }) => {
			const rows = await db
				.select()
				.from(leads)
				.where(and(eq(leads.localId, input.leadId), isNull(leads.deletedAt)))
				.limit(1);

			const lead = rows[0];
			if (!lead) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Lead not found",
				});
			}

			return lead;
		}),

	update: adminProcedure
		.input(
			z.object({
				localId: z.string(),
				data: z.object({
					name: z.string().min(1).optional(),
					phone: z.string().nullish(),
					email: z.string().nullish(),
					company: z.string().nullish(),
					position: z.string().nullish(),
					segment: z.string().nullish(),
					notes: z.string().nullish(),
					interestTag: z.enum(["quente", "morno", "frio"]).optional(),
					photoUrl: z.string().nullish(),
				}),
			})
		)
		.mutation(async ({ input }) => {
			const updated = await db
				.update(leads)
				.set({ ...input.data, updatedAt: new Date() })
				.where(eq(leads.localId, input.localId))
				.returning();

			if (updated.length === 0) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Lead not found",
				});
			}

			return updated[0];
		}),

	delete: adminProcedure
		.input(z.object({ localId: z.string() }))
		.mutation(async ({ input }) => {
			await db
				.update(leads)
				.set({ deletedAt: new Date() })
				.where(eq(leads.localId, input.localId));

			return { success: true };
		}),

	listVendors: adminProcedure.query(async () => {
		const rows = await db.execute(
			sql`
				SELECT DISTINCT
					l.user_id AS "userId",
					u.raw_user_meta_data->>'name' AS "name"
				FROM leads l
				JOIN auth.users u ON u.id = l.user_id::uuid
				WHERE l.deleted_at IS NULL
				ORDER BY "name" ASC
			`
		);

		return rows.rows as Array<{ userId: string; name: string }>;
	}),
});
