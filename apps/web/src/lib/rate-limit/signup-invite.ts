import { db } from "@dashboard-leads-profills/db";
import { sql } from "drizzle-orm";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const CLEANUP_PROBABILITY = 0.05;

/** Remove linhas cuja janela já expirou. Best-effort. */
export async function cleanupExpiredRateLimits(): Promise<void> {
	await db.execute(
		sql`DELETE FROM signup_invite_rate_limit WHERE reset_at < now()`
	);
}

/**
 * Registra uma tentativa do IP e devolve `true` se ainda está dentro do limite
 * (5 tentativas por janela de 60s), `false` se deve ser bloqueado.
 *
 * O upsert é atômico: o `ON CONFLICT` decide num único statement se incrementa
 * o contador ou reinicia a janela, sem race entre instâncias concorrentes.
 */
export async function checkSignupInviteRateLimit(ip: string): Promise<boolean> {
	if (Math.random() < CLEANUP_PROBABILITY) {
		try {
			await cleanupExpiredRateLimits();
		} catch {
			// Cleanup é best-effort; sua falha não deve bloquear o request.
			// O caminho crítico (upsert abaixo) segue normalmente.
		}
	}

	const resetAt = new Date(Date.now() + RATE_LIMIT_WINDOW_MS);
	const result = await db.execute(sql`
		INSERT INTO signup_invite_rate_limit (ip, count, reset_at)
		VALUES (${ip}, 1, ${resetAt})
		ON CONFLICT (ip) DO UPDATE SET
			count = CASE WHEN signup_invite_rate_limit.reset_at < now()
				THEN 1 ELSE signup_invite_rate_limit.count + 1 END,
			reset_at = CASE WHEN signup_invite_rate_limit.reset_at < now()
				THEN ${resetAt} ELSE signup_invite_rate_limit.reset_at END
		RETURNING count
	`);

	const rows = result.rows as { count: number }[];
	const count = Number(rows[0]?.count ?? 0);
	return count <= RATE_LIMIT_MAX;
}
