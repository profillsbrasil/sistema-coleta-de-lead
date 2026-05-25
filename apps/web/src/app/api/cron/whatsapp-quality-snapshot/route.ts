/**
 * Cron diário (Vercel) — snapshot do quality_rating e messaging_limit_tier
 * do número WhatsApp Business. Configurado em /vercel.json (0 6 * * *).
 *
 * Auth: Authorization: Bearer ${CRON_SECRET}. Vercel injeta esse header
 * automaticamente quando o cron dispara.
 *
 * Quando a qualidade degrada (HIGH → MEDIUM → LOW), gera alerta high.
 */

import { recordAlert } from "@dashboard-leads-profills/api/whatsapp/alerts";
import { db } from "@dashboard-leads-profills/db";
import { healthSnapshots } from "@dashboard-leads-profills/db/schema/whatsapp";
import { env } from "@dashboard-leads-profills/env/server";
import { desc } from "drizzle-orm";

const QUALITY_RANK: Record<string, number> = {
	GREEN: 3,
	HIGH: 3,
	YELLOW: 2,
	MEDIUM: 2,
	RED: 1,
	LOW: 1,
	UNKNOWN: 0,
};

function rank(rating: string | null | undefined): number {
	if (!rating) return 0;
	return QUALITY_RANK[rating.toUpperCase()] ?? 0;
}

function isAuthorized(request: Request): boolean {
	const secret = env.CRON_SECRET;
	if (!secret) {
		// Sem secret configurado: aceita só localhost em dev; bloqueia em prod.
		if (env.NODE_ENV !== "production") return true;
		return false;
	}
	const header = request.headers.get("authorization");
	return header === `Bearer ${secret}`;
}

export async function GET(request: Request): Promise<Response> {
	if (!isAuthorized(request)) {
		return new Response("Unauthorized", { status: 401 });
	}

	const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}?fields=quality_rating,messaging_limit_tier,name_status,verified_name`;

	let raw: Record<string, unknown>;
	try {
		const res = await fetch(url, {
			headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` },
			signal: AbortSignal.timeout(8_000),
		});
		if (!res.ok) {
			const body = await res.text();
			console.error(
				JSON.stringify({
					tag: "whatsapp:cron",
					event: "quality_snapshot_fetch_failed",
					status: res.status,
					body: body.slice(0, 500),
				})
			);
			return new Response(`Graph API ${res.status}: ${body}`, {
				status: 502,
			});
		}
		raw = (await res.json()) as Record<string, unknown>;
	} catch (err) {
		console.error(
			JSON.stringify({
				tag: "whatsapp:cron",
				event: "quality_snapshot_fetch_error",
				err: String(err),
			})
		);
		return new Response(`fetch error: ${String(err)}`, { status: 502 });
	}

	const qualityRating =
		typeof raw.quality_rating === "string" ? raw.quality_rating : null;
	const messagingLimitTier =
		typeof raw.messaging_limit_tier === "string"
			? raw.messaging_limit_tier
			: null;

	const [last] = await db
		.select({ qualityRating: healthSnapshots.qualityRating })
		.from(healthSnapshots)
		.orderBy(desc(healthSnapshots.capturedAt))
		.limit(1);

	await db.insert(healthSnapshots).values({
		qualityRating,
		messagingLimitTier,
		raw,
	});

	if (last && rank(qualityRating) < rank(last.qualityRating)) {
		await recordAlert("quality_rating_degraded", "high", {
			previous: last.qualityRating,
			current: qualityRating,
			tier: messagingLimitTier,
		});
	}

	console.log(
		JSON.stringify({
			tag: "whatsapp:cron",
			event: "quality_snapshot_ok",
			qualityRating,
			messagingLimitTier,
		})
	);

	return Response.json({
		ok: true,
		qualityRating,
		messagingLimitTier,
		previous: last?.qualityRating ?? null,
	});
}
