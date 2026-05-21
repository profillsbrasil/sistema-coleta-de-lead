import { db } from "@dashboard-leads-profills/db";
import { sql } from "drizzle-orm";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const CLEANUP_PROBABILITY = 0.05;

/** Remove linhas cuja janela já expirou. Best-effort. */
async function cleanupExpiredWhatsappRateLimits(): Promise<void> {
	await db.execute(sql`DELETE FROM whatsapp.rate_limit WHERE reset_at < now()`);
}

/**
 * Registra uma mensagem recebida do wa_id e devolve `true` se ainda está
 * dentro do limite (30 msgs por janela de 60s), `false` se deve ser descartado.
 *
 * O upsert é atômico: o `ON CONFLICT` decide num único statement se incrementa
 * o contador ou reinicia a janela, sem race entre instâncias concorrentes.
 */
export async function checkWhatsappRateLimit(waId: string): Promise<boolean> {
	if (Math.random() < CLEANUP_PROBABILITY) {
		try {
			await cleanupExpiredWhatsappRateLimits();
		} catch {
			// Cleanup é best-effort; sua falha não deve bloquear o request.
		}
	}

	const resetAt = new Date(Date.now() + RATE_LIMIT_WINDOW_MS);
	const result = await db.execute(sql`
		INSERT INTO whatsapp.rate_limit (wa_id, count, reset_at)
		VALUES (${waId}, 1, ${resetAt})
		ON CONFLICT (wa_id) DO UPDATE SET
			count = CASE WHEN whatsapp.rate_limit.reset_at < now()
				THEN 1 ELSE whatsapp.rate_limit.count + 1 END,
			reset_at = CASE WHEN whatsapp.rate_limit.reset_at < now()
				THEN ${resetAt} ELSE whatsapp.rate_limit.reset_at END
		RETURNING count
	`);

	const rows = result.rows as { count: number }[];
	const count = Number(rows[0]?.count ?? 0);
	return count <= RATE_LIMIT_MAX;
}
