/**
 * Detecta se uma mensagem do usuário deve disparar o fluxo do sorteio.
 *
 * Match por substring após normalização (lowercase + remoção de diacríticos + trim).
 * Triggers: "sorteio" OR "participar" — cobre tanto o texto pré-preenchido do
 * wa.me ("Sorteio Profills Fispal 2026") quanto frases livres do usuário
 * ("quero participar", "vim pelo sorteio").
 *
 * Falso positivo conhecido: "não quero participar" → retorna true. Decisão consciente:
 * o estado AWAITING_CONSENT resultante exibe botão Aceito/Não aceito (filtra intenção),
 * e DECLINED → keyword reoferece o sorteio, o que é UX aceitável.
 */
export function isSorteioKeyword(text: unknown): boolean {
	if (typeof text !== "string") {
		return false;
	}
	const normalized = text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.trim();
	if (normalized.length === 0) {
		return false;
	}
	return normalized.includes("sorteio") || normalized.includes("participar");
}
