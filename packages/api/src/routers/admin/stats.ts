import { db } from "@dashboard-leads-profills/db";
import { leads } from "@dashboard-leads-profills/db/schema/leads";
import { and, isNull, type SQL, sql } from "drizzle-orm";
import z from "zod";

import { adminProcedure, router } from "../../index";

const statsFiltersSchema = z.object({
	userId: z.string().uuid().optional(),
	tag: z.enum(["quente", "morno", "frio"]).optional(),
	segment: z.string().optional(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
});

function buildWhereConditions(
	input: z.infer<typeof statsFiltersSchema>
): SQL[] {
	const conditions: SQL[] = [isNull(leads.deletedAt)];

	if (input.userId) {
		conditions.push(sql`${leads.userId} = ${input.userId}::uuid`);
	}
	if (input.tag) {
		conditions.push(sql`${leads.interestTag} = ${input.tag}`);
	}
	if (input.segment) {
		conditions.push(sql`${leads.segment} = ${input.segment}`);
	}
	if (input.startDate) {
		conditions.push(sql`${leads.createdAt} >= ${input.startDate}::timestamptz`);
	}
	if (input.endDate) {
		conditions.push(sql`${leads.createdAt} <= ${input.endDate}::timestamptz`);
	}

	return conditions;
}

export const adminStatsRouter = router({
	getGlobalStats: adminProcedure
		.input(statsFiltersSchema)
		.query(async ({ input }) => {
			const conditions = buildWhereConditions(input);
			const whereClause = and(...conditions);

			const todayStart = new Date();
			todayStart.setHours(0, 0, 0, 0);

			const [statsResult, todayResult, activeVendorsResult] = await Promise.all(
				[
					db
						.select({
							total: sql<number>`count(*)::int`,
							quente: sql<number>`count(*) FILTER (WHERE ${leads.interestTag} = 'quente')::int`,
							morno: sql<number>`count(*) FILTER (WHERE ${leads.interestTag} = 'morno')::int`,
							frio: sql<number>`count(*) FILTER (WHERE ${leads.interestTag} = 'frio')::int`,
							score: sql<number>`COALESCE(sum(CASE WHEN ${leads.interestTag} = 'quente' THEN 3 WHEN ${leads.interestTag} = 'morno' THEN 2 ELSE 1 END), 0)::int`,
						})
						.from(leads)
						.where(whereClause),
					db
						.select({ count: sql<number>`count(*)::int` })
						.from(leads)
						.where(
							and(
								...conditions,
								sql`${leads.createdAt} AT TIME ZONE 'America/Sao_Paulo' >= ${todayStart.toISOString()}::timestamptz AT TIME ZONE 'America/Sao_Paulo'`
							)
						),
					db
						.select({
							activeVendors: sql<number>`count(DISTINCT ${leads.userId})::int`,
						})
						.from(leads)
						.where(isNull(leads.deletedAt)),
				]
			);

			return {
				...(statsResult[0] ?? {
					total: 0,
					quente: 0,
					morno: 0,
					frio: 0,
					score: 0,
				}),
				today: todayResult[0]?.count ?? 0,
				activeVendors: activeVendorsResult[0]?.activeVendors ?? 0,
			};
		}),

	getTimeline: adminProcedure
		.input(statsFiltersSchema)
		.query(async ({ input }) => {
			const conditions = buildWhereConditions(input);
			const whereClause = and(...conditions);

			const rows = await db.execute(
				sql`
					SELECT
						DATE(${leads.createdAt} AT TIME ZONE 'America/Sao_Paulo') AS "date",
						COUNT(*)::int AS "count"
					FROM leads
					WHERE ${whereClause}
					GROUP BY DATE(${leads.createdAt} AT TIME ZONE 'America/Sao_Paulo')
					ORDER BY "date" ASC
				`
			);

			return rows.rows as Array<{ date: string; count: number }>;
		}),

	getRanking: adminProcedure
		.input(statsFiltersSchema)
		.query(async ({ input }) => {
			const conditions = buildWhereConditions(input);
			const whereClause = and(...conditions);

			const rows = await db.execute(
				sql`
					SELECT
						leads.user_id AS "userId",
						u.raw_user_meta_data->>'name' AS "name",
						COUNT(leads.id)::int AS "totalLeads",
						COALESCE(SUM(CASE
							WHEN leads.interest_tag = 'quente' THEN 3
							WHEN leads.interest_tag = 'morno' THEN 2
							ELSE 1
						END), 0)::int AS "score"
					FROM leads
					JOIN auth.users u ON u.id = leads.user_id::uuid
					WHERE ${whereClause}
					GROUP BY leads.user_id, u.raw_user_meta_data->>'name'
					ORDER BY "score" DESC
				`
			);

			return rows.rows as Array<{
				userId: string;
				name: string;
				totalLeads: number;
				score: number;
			}>;
		}),

	getDistinctSegments: adminProcedure.query(async () => {
		const rows = await db.execute(
			sql`
				SELECT DISTINCT segment
				FROM leads
				WHERE segment IS NOT NULL AND deleted_at IS NULL
				ORDER BY segment ASC
			`
		);

		return (rows.rows as Array<{ segment: string }>).map((r) => r.segment);
	}),
});
