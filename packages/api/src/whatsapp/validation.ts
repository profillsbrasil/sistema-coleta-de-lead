/**
 * Validação dos campos do cadastro do sorteio (nome + empresa).
 *
 * Módulo puro: sem I/O. Retorna Result-style discriminated union
 * pra que o state-machine + messages possam produzir feedback específico.
 */

export const NAME_MIN = 2;
export const NAME_MAX = 80;
export const COMPANY_MIN = 3;
export const COMPANY_MAX = 80;

const NAME_PART_MIN = 2;

export type ValidationError =
	| "empty"
	| "too_short"
	| "too_long"
	| "invalid_chars"
	| "missing_surname"
	| "only_digits"
	| "garbage";

export type ValidationResult =
	| { ok: true; value: string }
	| { ok: false; reason: ValidationError };

// Nome: letras (Unicode incl. acentos), espaço, hífen, apóstrofo.
const NAME_RE = /^[\p{L}\s'\-]+$/u;

// Empresa: nome + dígitos, espaço e símbolos comuns (S.A., R&D, Ltda., etc.).
const COMPANY_RE = /^[\p{L}\d\s'\-.&/]+$/u;

const LETTER_RE = /\p{L}/u;
const VOWEL_RE = /[aeiouyàáâãäåèéêëìíîïòóôõöùúûüỳýÿ]/iu;

// 4+ chars iguais seguidos em qualquer parte (xxxx, aaaa). Garbage.
const LONG_RUN_RE = /(\p{L})\1{3,}/u;

function hasVowel(word: string): boolean {
	return VOWEL_RE.test(word);
}

function hasLongRun(input: string): boolean {
	return LONG_RUN_RE.test(input);
}

export function validateName(input: unknown): ValidationResult {
	if (typeof input !== "string") {
		return { ok: false, reason: "empty" };
	}
	const trimmed = input.trim();
	if (trimmed.length === 0) {
		return { ok: false, reason: "empty" };
	}
	if (trimmed.length < NAME_MIN) {
		return { ok: false, reason: "too_short" };
	}
	if (trimmed.length > NAME_MAX) {
		return { ok: false, reason: "too_long" };
	}
	if (!NAME_RE.test(trimmed)) {
		return { ok: false, reason: "invalid_chars" };
	}
	const parts = trimmed.split(/\s+/).filter((p) => p.length >= NAME_PART_MIN);
	if (parts.length < 2) {
		return { ok: false, reason: "missing_surname" };
	}
	if (hasLongRun(trimmed) || parts.some((p) => !hasVowel(p))) {
		return { ok: false, reason: "garbage" };
	}
	return { ok: true, value: trimmed };
}

export function validateCompany(input: unknown): ValidationResult {
	if (typeof input !== "string") {
		return { ok: false, reason: "empty" };
	}
	const trimmed = input.trim();
	if (trimmed.length === 0) {
		return { ok: false, reason: "empty" };
	}
	if (trimmed.length < COMPANY_MIN) {
		return { ok: false, reason: "too_short" };
	}
	if (trimmed.length > COMPANY_MAX) {
		return { ok: false, reason: "too_long" };
	}
	if (!COMPANY_RE.test(trimmed)) {
		return { ok: false, reason: "invalid_chars" };
	}
	if (!LETTER_RE.test(trimmed)) {
		return { ok: false, reason: "only_digits" };
	}
	if (hasLongRun(trimmed)) {
		return { ok: false, reason: "garbage" };
	}
	return { ok: true, value: trimmed };
}
