/**
 * Acesso à tabela whatsapp.config — config editável do bot (singleton).
 * Substitui ENVs de campanha pra permitir edição via painel admin.
 */

import { db } from "@dashboard-leads-profills/db";
import { config } from "@dashboard-leads-profills/db/schema/whatsapp";
import { eq } from "drizzle-orm";

export interface WhatsappConfig {
	vendorPhone: string;
	eventName: string;
	eventStart: string; // YYYY-MM-DD
	eventEnd: string; // YYYY-MM-DD
	raffleDate: string; // YYYY-MM-DD
	welcomeImageUrl: string | null;
	logoUrl: string | null;
	instagramProfiles: Array<{ handle: string; url: string }>;
	officialPostUrl: string;
	privacyPolicyUrl: string | null;
	updatedAt: Date;
	updatedByUserId: string | null;
}

export async function getWhatsappConfig(): Promise<WhatsappConfig> {
	const rows = await db.select().from(config).where(eq(config.id, 1)).limit(1);
	const row = rows[0];
	if (!row) {
		throw new Error(
			"whatsapp.config singleton row (id=1) not found — run migration 0011"
		);
	}
	return {
		vendorPhone: row.vendorPhone,
		eventName: row.eventName,
		eventStart: row.eventStart,
		eventEnd: row.eventEnd,
		raffleDate: row.raffleDate,
		welcomeImageUrl: row.welcomeImageUrl,
		logoUrl: row.logoUrl,
		instagramProfiles: row.instagramProfiles,
		officialPostUrl: row.officialPostUrl,
		privacyPolicyUrl: row.privacyPolicyUrl,
		updatedAt: row.updatedAt,
		updatedByUserId: row.updatedByUserId,
	};
}

export type WhatsappConfigUpdate = Omit<
	WhatsappConfig,
	"updatedAt" | "updatedByUserId"
>;

export async function updateWhatsappConfig(
	update: WhatsappConfigUpdate,
	updatedByUserId: string
): Promise<void> {
	await db
		.update(config)
		.set({
			vendorPhone: update.vendorPhone,
			eventName: update.eventName,
			eventStart: update.eventStart,
			eventEnd: update.eventEnd,
			raffleDate: update.raffleDate,
			welcomeImageUrl: update.welcomeImageUrl,
			logoUrl: update.logoUrl,
			instagramProfiles: update.instagramProfiles,
			officialPostUrl: update.officialPostUrl,
			privacyPolicyUrl: update.privacyPolicyUrl,
			updatedByUserId,
		})
		.where(eq(config.id, 1));
}
