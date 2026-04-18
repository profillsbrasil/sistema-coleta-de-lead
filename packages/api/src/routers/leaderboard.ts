import { db } from "@dashboard-leads-profills/db";
import { sql } from "drizzle-orm";
import { protectedProcedure, router } from "../index";

export const leaderboardRouter = router({
	getRanking: protectedProcedure.query(async ({ ctx }) => {
		const currentUserId = ctx.user.id;

		const result = await db.execute(sql`
			WITH ranked AS (
				SELECT
					u.id::text AS "userId",
					u.name AS "rawName",
					COUNT(l.id)::int AS "totalLeads",
					COALESCE(SUM(CASE
						WHEN l.interest_tag = 'quente' THEN 3
						WHEN l.interest_tag = 'morno' THEN 2
						WHEN l.id IS NOT NULL THEN 1
						ELSE 0
					END), 0)::int AS score,
					ROW_NUMBER() OVER (
						ORDER BY
							COALESCE(SUM(CASE
								WHEN l.interest_tag = 'quente' THEN 3
								WHEN l.interest_tag = 'morno' THEN 2
								WHEN l.id IS NOT NULL THEN 1
								ELSE 0
							END), 0) DESC,
							COUNT(l.id) DESC
					)::int AS rank
				FROM public."user" u
				LEFT JOIN leads l ON l.user_id = u.id AND l.deleted_at IS NULL
				GROUP BY u.id, u.name
				HAVING u.role IS DISTINCT FROM 'admin' OR COUNT(l.id) > 0
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
