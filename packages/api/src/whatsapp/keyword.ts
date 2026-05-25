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

// Opt-out / opt-in: word-boundary pra reduzir falso positivo (ex.: "sair"
// dentro de "saímos amanhã"). Texto é normalizado antes (sem diacrítico,
// lowercase, trim).
const OPT_OUT_RE = /\b(parar|sair|cancelar|stop|unsubscribe|descadastrar)\b/;
const OPT_IN_RE = /\b(voltar|retornar)\b/;

/**
 * Detecta keyword de opt-out (cliente quer parar de receber mensagens).
 * Quando match, o bot marca `opted_out_at` + silencia — NÃO deleta dados
 * (eliminação é por canal humano/DSR no admin).
 */
export function isOptOutKeyword(text: unknown): boolean {
	if (typeof text !== "string") return false;
	const normalized = text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.trim();
	if (normalized.length === 0) return false;
	return OPT_OUT_RE.test(normalized);
}

/**
 * Detecta keyword de opt-in (cliente que tinha optado pra fora quer voltar).
 * Match: "voltar" ou "retornar" como palavra inteira.
 */
export function isOptInKeyword(text: unknown): boolean {
	if (typeof text !== "string") return false;
	const normalized = text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.trim();
	if (normalized.length === 0) return false;
	return OPT_IN_RE.test(normalized);
}

/**
 * Detecta se a mensagem pede atendimento humano.
 *
 * Match por substring após normalização. Cobre as expressões típicas em PT-BR:
 * "atendente", "humano", "ajuda", "suporte", "falar com alguém", "tem alguém",
 * "problema". Falsos positivos possíveis ("não preciso de ajuda"); decisão
 * conservadora: CTA pro vendor é não-destrutivo, melhor encaminhar a mais.
 */
export function isHandoffKeyword(text: unknown): boolean {
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
	return (
		normalized.includes("atendente") ||
		normalized.includes("humano") ||
		normalized.includes("ajuda") ||
		normalized.includes("suporte") ||
		normalized.includes("falar com algu") ||
		normalized.includes("tem algu") ||
		normalized.includes("problema")
	);
}
