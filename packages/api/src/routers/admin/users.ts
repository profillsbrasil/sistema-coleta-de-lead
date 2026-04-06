import { db } from "@dashboard-leads-profills/db";
import { userRoles } from "@dashboard-leads-profills/db/schema/auth";
import { leads } from "@dashboard-leads-profills/db/schema/leads";
import { TRPCError } from "@trpc/server";
import { and, count, eq, inArray, isNull, sql } from "drizzle-orm";
import z from "zod";

import { adminProcedure, router } from "../../index";
import { supabaseAdmin } from "../../lib/supabase-admin";

export const adminUsersRouter = router({
	list: adminProcedure
		.input(
			z.object({
				search: z.string().optional(),
				page: z.number().min(1).default(1),
				perPage: z.number().min(1).max(100).default(20),
			})
		)
		.query(async ({ input }) => {
			const { data, error } = await supabaseAdmin.auth.admin.listUsers({
				page: input.page,
				perPage: input.perPage,
			});

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to list users",
				});
			}

			const userIds = data.users.map((u) => u.id);

			const [rolesResult, leadsResult] = await Promise.all([
				userIds.length > 0
					? db
							.select()
							.from(userRoles)
							.where(
								inArray(userRoles.userId, userIds)
							)
					: Promise.resolve([]),
				userIds.length > 0
					? db
							.select({
								userId: leads.userId,
								leadCount: count(leads.id),
							})
							.from(leads)
							.where(
								and(
									inArray(leads.userId, userIds),
									isNull(leads.deletedAt)
								)
							)
							.groupBy(leads.userId)
					: Promise.resolve([]),
			]);

			const rolesByUserId = new Map(rolesResult.map((r) => [r.userId, r.role]));
			const leadCountByUserId = new Map(
				leadsResult.map((r) => [r.userId, r.leadCount])
			);

			let users = data.users.map((u) => ({
				id: u.id,
				email: u.email ?? "",
				name: (u.user_metadata?.name as string) ?? "",
				role: rolesByUserId.get(u.id) ?? "vendedor",
				leadCount: leadCountByUserId.get(u.id) ?? 0,
				isBanned:
					u.banned_until != null && u.banned_until > new Date().toISOString(),
			}));

			if (input.search) {
				const term = input.search.toLowerCase();
				users = users.filter(
					(u) =>
						u.name.toLowerCase().includes(term) ||
						u.email.toLowerCase().includes(term)
				);
			}

			return { users, total: data.total ?? data.users.length };
		}),

	updateRole: adminProcedure
		.input(
			z.object({
				userId: z.string().uuid(),
				role: z.enum(["admin", "vendedor"]),
			})
		)
		.mutation(async ({ input }) => {
			await db.delete(userRoles).where(eq(userRoles.userId, input.userId));
			await db
				.insert(userRoles)
				.values({ userId: input.userId, role: input.role });

			return { success: true };
		}),

	deactivate: adminProcedure
		.input(z.object({ userId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const currentUserId = ctx.user.sub as string;
			if (currentUserId === input.userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Cannot deactivate your own account",
				});
			}

			const { error } = await supabaseAdmin.auth.admin.updateUserById(
				input.userId,
				{ ban_duration: "876000h" }
			);

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to deactivate user",
				});
			}

			await db.delete(userRoles).where(eq(userRoles.userId, input.userId));
			await db
				.insert(userRoles)
				.values({ userId: input.userId, role: "vendedor" });

			return { success: true };
		}),

	reactivate: adminProcedure
		.input(z.object({ userId: z.string().uuid() }))
		.mutation(async ({ input }) => {
			const { error } = await supabaseAdmin.auth.admin.updateUserById(
				input.userId,
				{ ban_duration: "none" }
			);

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to reactivate user",
				});
			}

			return { success: true };
		}),
});
