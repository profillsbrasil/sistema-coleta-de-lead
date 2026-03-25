import { db } from "../db/index";

export interface PersonalStats {
	frio: number;
	hoje: number;
	morno: number;
	quente: number;
	score: number;
	total: number;
}

export async function getPersonalStats(userId: string): Promise<PersonalStats> {
	const leads = await db.leads
		.where("userId")
		.equals(userId)
		.filter((lead) => lead.deletedAt === null)
		.toArray();

	const startOfToday = new Date();
	startOfToday.setHours(0, 0, 0, 0);

	const quente = leads.filter((l) => l.interestTag === "quente").length;
	const morno = leads.filter((l) => l.interestTag === "morno").length;
	const frio = leads.filter((l) => l.interestTag === "frio").length;

	return {
		total: leads.length,
		quente,
		morno,
		frio,
		hoje: leads.filter((l) => new Date(l.createdAt) >= startOfToday).length,
		score: quente * 3 + morno * 2 + frio * 1,
	};
}
