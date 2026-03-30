import { db } from "@dashboard-leads-profills/db";
import { sql } from "drizzle-orm";
import { protectedProcedure, router } from "../index";

export const leaderboardRouter = router({
	getRanking: protectedProcedure.query(async ({ ctx }) => {
		const currentUserId = (ctx.user as Record<string, unknown>).sub as string;

		const result = await db.execute(sql`
			SELECT
				l.user_id AS "userId",
				u.raw_user_meta_data->>'name' AS "name",
				COUNT(*)::int AS "totalLeads",
				SUM(CASE
					WHEN l.interest_tag = 'quente' THEN 3
					WHEN l.interest_tag = 'morno' THEN 2
					ELSE 1
				END)::int AS score
			FROM leads l
			JOIN auth.users u ON u.id = l.user_id::uuid
			WHERE l.deleted_at IS NULL
			GROUP BY l.user_id, u.raw_user_meta_data->>'name'
			ORDER BY score DESC, "totalLeads" DESC
		`);

		const ranking = (
			result.rows as Array<{
				userId: string;
				name: string | null;
				totalLeads: number;
				score: number;
			}>
		).map((row) => ({
			...row,
			name:
				row.userId === currentUserId
					? (row.name ?? "Voce")
					: (row.name ?? "Vendedor"),
			isCurrentUser: row.userId === currentUserId,
		}));

		return {
			ranking,
			serverTimestamp: new Date().toISOString(),
		};
	}),
});
