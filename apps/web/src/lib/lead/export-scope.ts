import { db } from "../db";
import type { Lead } from "../db/types";
import { type FilterTag } from "./queries";

export interface LeadExportScopeInput {
	userId: string;
	tag: FilterTag;
	searchTerm: string;
}

export interface LeadExportScopeResult {
	leads: Lead[];
	total: number;
}

function matchesSearchTerm(lead: Lead, searchTerm: string): boolean {
	if (searchTerm === "") {
		return true;
	}

	const normalizedName = lead.name.toLowerCase();
	const normalizedCompany = (lead.company ?? "").toLowerCase();
	const normalizedEmail = (lead.email ?? "").toLowerCase();

	return (
		normalizedName.includes(searchTerm) ||
		normalizedCompany.includes(searchTerm) ||
		normalizedEmail.includes(searchTerm)
	);
}

export async function queryLeadExportScope(
	input: LeadExportScopeInput
): Promise<LeadExportScopeResult> {
	const normalizedSearchTerm = input.searchTerm.trim().toLowerCase();
	const userLeads = await db.leads
		.where("userId")
		.equals(input.userId)
		.filter((lead) => lead.deletedAt === null)
		.toArray();

	const scopedByTag =
		input.tag === "todos"
			? userLeads
			: userLeads.filter((lead) => lead.interestTag === input.tag);

	const leads = scopedByTag.filter((lead) =>
		matchesSearchTerm(lead, normalizedSearchTerm)
	);

	leads.sort((left, right) => right.createdAt.localeCompare(left.createdAt));

	return {
		leads,
		total: leads.length,
	};
}
