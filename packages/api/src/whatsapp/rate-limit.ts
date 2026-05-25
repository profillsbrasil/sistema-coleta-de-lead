import { db } from "@dashboard-leads-profills/db";
import { sql } from "drizzle-orm";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const CLEANUP_PROBABILITY = 0.05;

export interface RateLimitResult {
	/** `true` se a mensagem está dentro do limite e deve ser processada. */
	allowed: boolean;
	/** Contagem atual da janela. */
	count: number;
	/**
	 * `true` apenas na primeira mensagem que ultrapassa o limite na janela atual.
	 * Use pra enviar um único aviso ao cliente sem spammar.
	 */
	firstExceeded: boolean;
}

/** Remove linhas cuja janela já expirou. Best-effort. */
async function cleanupExpiredWhatsappRateLimits(): Promise<void> {
	await db.execute(sql`DELETE FROM whatsapp.rate_limit WHERE reset_at < now()`);
}

/**
 * Registra uma mensagem recebida do wa_id e devolve o estado do rate limit.
 *
 * Limite: 10 msgs por janela de 60s. Quando excede, o webhook deve enviar
 * UMA mensagem de aviso (na transição count = MAX+1) e dropar as seguintes.
 *
 * O upsert é atômico: o `ON CONFLICT` decide num único statement se incrementa
 * o contador ou reinicia a janela, sem race entre instâncias concorrentes.
 */
export async function checkWhatsappRateLimit(
	waId: string
): Promise<RateLimitResult> {
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
	return {
		allowed: count <= RATE_LIMIT_MAX,
		count,
		firstExceeded: count === RATE_LIMIT_MAX + 1,
	};
}
