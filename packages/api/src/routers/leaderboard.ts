import { db } from "@dashboard-leads-profills/db";
import { sql } from "drizzle-orm";
import { protectedProcedure, router } from "../index";

export const leaderboardRouter = router({
	getRanking: protectedProcedure.query(async () => {
		const result = await db.execute(sql`
			SELECT
				l.user_id AS "userId",
				COALESCE(u.raw_user_meta_data->>'full_name', u.email, 'Unknown') AS name,
				COUNT(*)::int AS "totalLeads",
				SUM(CASE
					WHEN l.interest_tag = 'quente' THEN 3
					WHEN l.interest_tag = 'morno' THEN 2
					ELSE 1
				END)::int AS score
			FROM leads l
			LEFT JOIN auth.users u ON u.id = l.user_id
			WHERE l.deleted_at IS NULL
			GROUP BY l.user_id, u.raw_user_meta_data, u.email
			ORDER BY score DESC, "totalLeads" DESC
		`);

		return {
			ranking: result.rows as Array<{
				userId: string;
				name: string;
				totalLeads: number;
				score: number;
			}>,
			serverTimestamp: new Date().toISOString(),
		};
	}),
});
