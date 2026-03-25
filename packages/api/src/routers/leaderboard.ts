import { db } from "@dashboard-leads-profills/db";
import { sql } from "drizzle-orm";
import { protectedProcedure, router } from "../index";

export const leaderboardRouter = router({
	getRanking: protectedProcedure.query(async ({ ctx }) => {
		const result = await db.execute(sql`
			SELECT
				user_id AS "userId",
				COUNT(*)::int AS "totalLeads",
				SUM(CASE
					WHEN interest_tag = 'quente' THEN 3
					WHEN interest_tag = 'morno' THEN 2
					ELSE 1
				END)::int AS score
			FROM leads
			WHERE deleted_at IS NULL
			GROUP BY user_id
			ORDER BY score DESC, "totalLeads" DESC
		`);

		const currentUserId = (ctx.user as Record<string, unknown>).sub as string;

		let currentUserName = "Voce";
		try {
			const { data } = await ctx.supabase.auth.getUser();
			currentUserName =
				data?.user?.user_metadata?.full_name ?? data?.user?.email ?? "Voce";
		} catch {
			const email = (ctx.user as Record<string, unknown>).email as
				| string
				| undefined;
			currentUserName = email ?? "Voce";
		}

		const ranking = (
			result.rows as Array<{
				userId: string;
				totalLeads: number;
				score: number;
			}>
		).map((row) => ({
			...row,
			name: row.userId === currentUserId ? currentUserName : "Vendedor",
		}));

		return {
			ranking,
			serverTimestamp: new Date().toISOString(),
		};
	}),
});
