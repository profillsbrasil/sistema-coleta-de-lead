import { db } from "@dashboard-leads-profills/db";
import { sql } from "drizzle-orm";
import { protectedProcedure, router } from "../index";

export const leaderboardRouter = router({
	getRanking: protectedProcedure.query(async ({ ctx }) => {
		const currentUserId = (ctx.user as Record<string, unknown>).sub as string;

		const result = await db.execute(sql`
			WITH ranked AS (
				SELECT
					l.user_id AS "userId",
					u.raw_user_meta_data->>'name' AS "rawName",
					COUNT(*)::int AS "totalLeads",
					SUM(CASE
						WHEN l.interest_tag = 'quente' THEN 3
						WHEN l.interest_tag = 'morno' THEN 2
						ELSE 1
					END)::int AS score,
					ROW_NUMBER() OVER (
						ORDER BY
							SUM(CASE
								WHEN l.interest_tag = 'quente' THEN 3
								WHEN l.interest_tag = 'morno' THEN 2
								ELSE 1
							END) DESC,
							COUNT(*) DESC
					) AS rank
				FROM leads l
				JOIN auth.users u ON u.id = l.user_id::uuid
				WHERE l.deleted_at IS NULL
				GROUP BY l.user_id, u.raw_user_meta_data->>'name'
			)
			SELECT
				"userId",
				COALESCE("rawName", 'Vendedor #' || rank) AS "name",
				"totalLeads",
				score,
				rank
			FROM ranked
			ORDER BY score DESC, "totalLeads" DESC
		`);

		const ranking = (
			result.rows as Array<{
				userId: string;
				name: string;
				totalLeads: number;
				score: number;
				rank: number;
			}>
		).map((row) => ({
			...row,
			isCurrentUser: row.userId === currentUserId,
		}));

		return {
			ranking,
			serverTimestamp: new Date().toISOString(),
		};
	}),
});
