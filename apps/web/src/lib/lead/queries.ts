import { db } from "../db/index";
import type { Lead } from "../db/types";

export type FilterTag = "todos" | "quente" | "morno" | "frio";

export async function queryLeads(
	userId: string,
	tag: FilterTag,
	limit: number
): Promise<Lead[]> {
	let results: Lead[];

	if (tag === "todos") {
		results = await db.leads
			.where("userId")
			.equals(userId)
			.filter((lead) => lead.deletedAt === null)
			.toArray();
	} else {
		results = await db.leads
			.where("userId")
			.equals(userId)
			.filter((lead) => lead.deletedAt === null && lead.interestTag === tag)
			.toArray();
	}

	results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	return results.slice(0, limit);
}
