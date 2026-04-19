import { auth } from "@dashboard-leads-profills/auth";
import { db } from "@dashboard-leads-profills/db";
import { leads } from "@dashboard-leads-profills/db/schema/leads";
import { TRPCError } from "@trpc/server";
import { and, count, inArray, isNull } from "drizzle-orm";
import z from "zod";

import { adminProcedure, router } from "../../index";

type AuthUser = {
	id: string;
	email: string;
	name: string;
	role: string | null;
	banned?: boolean | null;
	banReason?: string | null;
	banExpires?: Date | string | null;
};

export const adminUsersRouter = router({
	list: adminProcedure
		.input(
			z.object({
				search: z.string().optional(),
				page: z.number().min(1).default(1),
				perPage: z.number().min(1).max(100).default(20),
			}),
		)
		.query(async ({ ctx, input }) => {
			const result = (await auth.api.listUsers({
				query: {
					limit: input.perPage,
					offset: (input.page - 1) * input.perPage,
				},
				headers: ctx.headers,
			})) as { users: AuthUser[]; total: number };

			const userIds = result.users.map((u) => u.id);

			const leadsResult =
				userIds.length > 0
					? await db
							.select({ userId: leads.userId, leadCount: count(leads.id) })
							.from(leads)
							.where(
								and(inArray(leads.userId, userIds), isNull(leads.deletedAt)),
							)
							.groupBy(leads.userId)
					: [];

			const leadCountByUserId = new Map(
				leadsResult.map((r) => [r.userId, r.leadCount]),
			);

			let users = result.users.map((u) => ({
				id: u.id,
				email: u.email,
				name: u.name ?? "",
				role: (u.role as "admin" | "vendedor" | null) ?? "vendedor",
				leadCount: leadCountByUserId.get(u.id) ?? 0,
				isBanned: !!u.banned,
			}));

			if (input.search) {
				const term = input.search.toLowerCase();
				users = users.filter(
					(u) =>
						u.name.toLowerCase().includes(term) ||
						u.email.toLowerCase().includes(term),
				);
			}

			return { users, total: result.total };
		}),

	updateRole: adminProcedure
		.input(
			z.object({
				userId: z.string().uuid(),
				role: z.enum(["admin", "vendedor"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await auth.api.setRole({
				body: { userId: input.userId, role: input.role as "admin" },
				headers: ctx.headers,
			});
			return { success: true };
		}),

	deactivate: adminProcedure
		.input(z.object({ userId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			if (ctx.user.id === input.userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Cannot deactivate your own account",
				});
			}
			await auth.api.banUser({
				body: { userId: input.userId, banReason: "desativado por admin" },
				headers: ctx.headers,
			});
			return { success: true };
		}),

	reactivate: adminProcedure
		.input(z.object({ userId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			await auth.api.unbanUser({
				body: { userId: input.userId },
				headers: ctx.headers,
			});
			return { success: true };
		}),
});
