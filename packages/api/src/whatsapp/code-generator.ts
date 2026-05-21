import { randomInt } from "node:crypto";

/** Regex para validar o formato do código de sorteio. */
export const RAFFLE_CODE_PATTERN = /^PROFILLS-\d{4}$/;

/**
 * Gera um código de sorteio no formato `PROFILLS-XXXX` onde XXXX é um número
 * aleatório criptográfico de 0000 a 9999, com zero-padding.
 *
 * Pureza: sem DB, sem env, sem estado. A unicidade é responsabilidade do banco
 * (constraint UNIQUE + retry no chamador).
 */
export function generateRaffleCode(): string {
	const n = randomInt(0, 10_000);
	return `PROFILLS-${String(n).padStart(4, "0")}`;
}
