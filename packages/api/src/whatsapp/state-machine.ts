/**
 * State machine pura do bot WhatsApp Profills.
 *
 * Sem I/O: sem DB, sem fetch, sem env.
 * Recebe estado atual + mensagem + config → retorna patch + outbounds.
 */

import type { participants as ParticipantTable } from "@dashboard-leads-profills/db/schema/whatsapp";
import { isSorteioKeyword } from "./keyword";
import type { InteractiveMessage } from "./messages";
import {
	alreadyParticipated,
	askCompany,
	askName,
	companyInvalid,
	declined,
	invalidConsentRetry,
	nameInvalid,
	redirect,
	welcome,
} from "./messages";
import type { InboundMessage } from "./types";

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type ParticipantState =
	| "NEW"
	| "NON_PARTICIPANT"
	| "AWAITING_CONSENT"
	| "AWAITING_NAME"
	| "AWAITING_COMPANY"
	| "COMPLETED"
	| "DECLINED";

export type Participant = typeof ParticipantTable.$inferSelect;

export type ParticipantPatch = Partial<{
	state: ParticipantState;
	name: string | null;
	company: string | null;
	consentAt: Date;
	declinedAt: Date | null;
	termsVersion: string;
	retryCount: number;
	raffleCode: string;
	redirectSentAt: Date | null;
	redirectCount: number;
}>;

export type OutboundAction =
	| { kind: "text"; body: string }
	| { kind: "interactive"; interactive: InteractiveMessage["interactive"] }
	| { kind: "image"; link: string; caption?: string }
	| { kind: "generateAndSendCode" };

export interface StateMachineConfig {
	eventEndBR: string; // "29/05"
	eventName: string;
	eventStartBR: string; // "26/05"
	raffleDate?: string;
	redirectCooldownMs?: number; // default 4h
	termsVersion: string;
	vendorName: string;
	vendorPhone: string;
	welcomeImageUrl?: string;
}

export interface HandleResult {
	createParticipant?: { waId: string; state: ParticipantState };
	outbounds: OutboundAction[];
	participantPatch: ParticipantPatch | null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Converte mensagem de texto de messages.ts → OutboundAction kind="text" */
function toTextAction(msg: { type: "text"; body: string }): OutboundAction {
	return { kind: "text", body: msg.body };
}

/** Converte mensagem interativa de messages.ts → OutboundAction kind="interactive" */
function toInteractiveAction(msg: InteractiveMessage): OutboundAction {
	return { kind: "interactive", interactive: msg.interactive };
}

/**
 * Remove diacríticos, converte para minúsculas e faz trim.
 * Usado para normalização antes de comparações de texto no fluxo de consentimento.
 */
function normalize(s: string): string {
	return s
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.trim();
}

const YES_RE = /^(aceito|sim|quero|ok)$/;
const NO_RE = /^(nao|recusar|recuso|nao aceito)$/;

function isYes(normalized: string): boolean {
	return YES_RE.test(normalized);
}

function isNo(normalized: string): boolean {
	return NO_RE.test(normalized);
}

/** Extrai o body de texto cru da mensagem, se disponível. */
function getTextBody(message: InboundMessage): string | null {
	if (message.type !== "text") {
		return null;
	}
	// Narrowed to the text branch — `text` field is a well-typed object here.
	const m = message as Extract<InboundMessage, { type: "text" }>;
	return m.text.body;
}

/** Verifica se a mensagem é um button_reply interativo com o id fornecido. */
function isButtonReply(message: InboundMessage, id: string): boolean {
	if (message.type !== "interactive") {
		return false;
	}
	const m = message as Extract<InboundMessage, { type: "interactive" }>;
	return (
		m.interactive.type === "button_reply" &&
		m.interactive.button_reply.id === id
	);
}

/** Retorna a action de redirect para reuso nos handlers. */
function redirectAction(config: StateMachineConfig): OutboundAction {
	return toInteractiveAction(
		redirect({
			vendorName: config.vendorName,
			vendorPhone: config.vendorPhone,
			eventStart: config.eventStartBR,
			eventEnd: config.eventEndBR,
		})
	);
}

/**
 * Verifica se o participante atingiu o limite de redirects (fix #12).
 * Quando redirectCount >= 3, o bot fica em silêncio permanente.
 */
function hasExhaustedRedirects(participant: Participant): boolean {
	return (participant.redirectCount ?? 0) >= 3;
}

/**
 * Verifica se o anti-loop de cooldown está ativo.
 */
function isWithinCooldown(
	participant: Participant,
	cooldownMs: number
): boolean {
	const lastSent = participant.redirectSentAt;
	return !!lastSent && Date.now() - lastSent.getTime() < cooldownMs;
}

// ---------------------------------------------------------------------------
// TTL check (fix #10 + #13)
// ---------------------------------------------------------------------------

const INTERMEDIATE_STATES: ParticipantState[] = [
	"AWAITING_CONSENT",
	"AWAITING_NAME",
	"AWAITING_COMPANY",
];

const TTL_MS = 24 * 60 * 60 * 1000; // 24h

function isStaleIntermediate(participant: Participant): boolean {
	const state = participant.state as ParticipantState;
	if (!INTERMEDIATE_STATES.includes(state)) return false;
	return Date.now() - participant.updatedAt.getTime() > TTL_MS;
}

// ---------------------------------------------------------------------------
// State handlers
// ---------------------------------------------------------------------------

function handleNew(args: {
	message: InboundMessage;
	config: StateMachineConfig;
}): HandleResult {
	const { message, config } = args;
	const waId = message.from;
	const body = getTextBody(message);

	// Botão de redirect: cliente clicou "Participar sorteio" ou "Ja me cadastrei" sem ter participant
	if (
		isButtonReply(message, "want_to_participate") ||
		isButtonReply(message, "already_registered")
	) {
		return {
			participantPatch: null,
			createParticipant: { waId, state: "AWAITING_CONSENT" },
			outbounds: [
				toInteractiveAction(
					welcome({
						eventName: config.eventName,
						imageUrl: config.welcomeImageUrl,
					})
				),
			],
		};
	}

	// Keyword detectada → fluxo do sorteio
	if (body !== null && isSorteioKeyword(body)) {
		return {
			participantPatch: null,
			createParticipant: { waId, state: "AWAITING_CONSENT" },
			outbounds: [
				toInteractiveAction(
					welcome({
						eventName: config.eventName,
						imageUrl: config.welcomeImageUrl,
					})
				),
			],
		};
	}

	// Não-keyword: cria participant NON_PARTICIPANT e envia redirect
	return {
		participantPatch: null,
		createParticipant: { waId, state: "NON_PARTICIPANT" },
		outbounds: [redirectAction(config)],
	};
}

function handleAwaitingConsent(args: {
	participant: Participant;
	message: InboundMessage;
	config: StateMachineConfig;
}): HandleResult {
	const { participant, message, config } = args;

	// Accept: button OR text match
	if (
		isButtonReply(message, "accept") ||
		(getTextBody(message) !== null &&
			isYes(normalize(getTextBody(message) as string)))
	) {
		return {
			participantPatch: {
				state: "AWAITING_NAME",
				consentAt: new Date(),
				termsVersion: config.termsVersion,
			},
			outbounds: [toTextAction(askName())],
		};
	}

	// Decline: button OR text match
	if (
		isButtonReply(message, "decline") ||
		(getTextBody(message) !== null &&
			isNo(normalize(getTextBody(message) as string)))
	) {
		return {
			participantPatch: {
				state: "DECLINED",
				declinedAt: new Date(),
			},
			outbounds: [toTextAction(declined())],
		};
	}

	// Invalid — increment retry counter
	const newRetryCount = participant.retryCount + 1;

	// Fix #9: após 3 tentativas inválidas → NON_PARTICIPANT + redirect (não silêncio)
	if (newRetryCount >= 3) {
		// Checar limite de redirect antes de enviar (fix #12)
		if (hasExhaustedRedirects(participant)) {
			return {
				participantPatch: { retryCount: newRetryCount, state: "NON_PARTICIPANT" },
				outbounds: [],
			};
		}
		return {
			participantPatch: {
				retryCount: newRetryCount,
				state: "NON_PARTICIPANT",
			},
			outbounds: [redirectAction(config)],
		};
	}

	return {
		participantPatch: { retryCount: newRetryCount },
		outbounds: [toInteractiveAction(invalidConsentRetry())],
	};
}

function handleAwaitingName(args: {
	participant: Participant;
	message: InboundMessage;
	config: StateMachineConfig;
}): HandleResult {
	const { participant, message, config } = args;
	const body = getTextBody(message);

	// Fix #14: mídia (não-texto) conta retry
	if (body === null) {
		return handleNameInvalid({ participant, config });
	}

	const trimmed = body.trim();

	if (trimmed.length < 2 || trimmed.length > 80) {
		return handleNameInvalid({ participant, config });
	}

	return {
		participantPatch: {
			state: "AWAITING_COMPANY",
			name: trimmed,
			retryCount: 0,
		},
		outbounds: [toTextAction(askCompany({ name: trimmed }))],
	};
}

/** Helper para inválido em AWAITING_NAME com retry e fallback (fix #14). */
function handleNameInvalid(args: {
	participant: Participant;
	config: StateMachineConfig;
}): HandleResult {
	const { participant, config } = args;
	const newRetryCount = participant.retryCount + 1;

	if (newRetryCount >= 3) {
		if (hasExhaustedRedirects(participant)) {
			return {
				participantPatch: {
					retryCount: newRetryCount,
					state: "NON_PARTICIPANT",
				},
				outbounds: [],
			};
		}
		return {
			participantPatch: {
				retryCount: newRetryCount,
				state: "NON_PARTICIPANT",
			},
			outbounds: [redirectAction(config)],
		};
	}

	return {
		participantPatch: { retryCount: newRetryCount },
		outbounds: [toTextAction(nameInvalid())],
	};
}

function handleAwaitingCompany(args: {
	participant: Participant;
	message: InboundMessage;
	config: StateMachineConfig;
}): HandleResult {
	const { participant, message, config } = args;
	const body = getTextBody(message);

	// Fix #14: mídia (não-texto) conta retry
	if (body === null) {
		return handleCompanyInvalid({ participant, config });
	}

	const trimmed = body.trim();

	if (trimmed.length < 1 || trimmed.length > 80) {
		return handleCompanyInvalid({ participant, config });
	}

	return {
		participantPatch: {
			state: "COMPLETED",
			company: trimmed,
			retryCount: 0,
		},
		outbounds: [{ kind: "generateAndSendCode" }],
	};
}

/** Helper para inválido em AWAITING_COMPANY com retry e fallback (fix #14). */
function handleCompanyInvalid(args: {
	participant: Participant;
	config: StateMachineConfig;
}): HandleResult {
	const { participant, config } = args;
	const newRetryCount = participant.retryCount + 1;

	if (newRetryCount >= 3) {
		if (hasExhaustedRedirects(participant)) {
			return {
				participantPatch: {
					retryCount: newRetryCount,
					state: "NON_PARTICIPANT",
				},
				outbounds: [],
			};
		}
		return {
			participantPatch: {
				retryCount: newRetryCount,
				state: "NON_PARTICIPANT",
			},
			outbounds: [redirectAction(config)],
		};
	}

	return {
		participantPatch: { retryCount: newRetryCount },
		outbounds: [toTextAction(companyInvalid())],
	};
}

function handleNonParticipant(args: {
	participant: Participant;
	message: InboundMessage;
	config: StateMachineConfig;
}): HandleResult {
	const { participant, message, config } = args;
	const body = getTextBody(message);

	// Botão "Participar sorteio" → entra no fluxo
	if (isButtonReply(message, "want_to_participate")) {
		return {
			participantPatch: {
				state: "AWAITING_CONSENT",
				retryCount: 0,
				redirectSentAt: null,
			},
			outbounds: [
				toInteractiveAction(
					welcome({
						eventName: config.eventName,
						imageUrl: config.welcomeImageUrl,
					})
				),
			],
		};
	}

	// Botão "Ja me cadastrei" → checa se tem código; se não tem, entra no fluxo
	if (isButtonReply(message, "already_registered")) {
		if (participant.raffleCode && participant.name) {
			return {
				participantPatch: null,
				outbounds: [
					toTextAction(
						alreadyParticipated({
							name: participant.name,
							raffleCode: participant.raffleCode,
						})
					),
				],
			};
		}
		return {
			participantPatch: {
				state: "AWAITING_CONSENT",
				retryCount: 0,
				redirectSentAt: null,
			},
			outbounds: [
				toInteractiveAction(
					welcome({
						eventName: config.eventName,
						imageUrl: config.welcomeImageUrl,
					})
				),
			],
		};
	}

	// Keyword detectada → entra no fluxo
	if (body !== null && isSorteioKeyword(body)) {
		return {
			participantPatch: {
				state: "AWAITING_CONSENT",
				retryCount: 0,
				redirectSentAt: null,
			},
			outbounds: [
				toInteractiveAction(
					welcome({
						eventName: config.eventName,
						imageUrl: config.welcomeImageUrl,
					})
				),
			],
		};
	}

	// Fix #12: limite de 3 redirects — silêncio permanente
	if (hasExhaustedRedirects(participant)) {
		return { participantPatch: null, outbounds: [] };
	}

	// Outra mensagem: aplica anti-loop (4h cooldown padrão)
	const cooldownMs = config.redirectCooldownMs ?? 4 * 60 * 60 * 1000;
	if (isWithinCooldown(participant, cooldownMs)) {
		return { participantPatch: null, outbounds: [] };
	}

	return {
		participantPatch: null, // redirectSentAt e redirectCount setados pelo webhook após enviar
		outbounds: [redirectAction(config)],
	};
}

function handleCompleted(args: {
	participant: Participant;
	message: InboundMessage;
}): HandleResult {
	const { participant } = args;

	// Qualquer mensagem → alreadyParticipated (status e help removidos)
	return {
		participantPatch: null,
		outbounds: [
			toTextAction(
				alreadyParticipated({
					name: participant.name ?? "",
					raffleCode: participant.raffleCode ?? "",
				})
			),
		],
	};
}

function handleDeclined(args: {
	participant: Participant;
	message: InboundMessage;
	config: StateMachineConfig;
}): HandleResult {
	const { participant, message, config } = args;

	// Fix #11: botão "Participar sorteio" → AWAITING_CONSENT + welcome (não reoffer)
	if (isButtonReply(message, "want_to_participate")) {
		return {
			participantPatch: {
				state: "AWAITING_CONSENT",
				declinedAt: null,
				retryCount: 0,
			},
			outbounds: [
				toInteractiveAction(
					welcome({
						eventName: config.eventName,
						imageUrl: config.welcomeImageUrl,
					})
				),
			],
		};
	}

	// Fix #11: keyword ou qualquer outra mensagem → redirect com cooldown + limite
	// (keyword não mais faz reoffer)

	// Fix #12: limite de 3 redirects — silêncio permanente
	if (hasExhaustedRedirects(participant)) {
		return { participantPatch: null, outbounds: [] };
	}

	// Anti-loop cooldown
	const cooldownMs = config.redirectCooldownMs ?? 4 * 60 * 60 * 1000;
	if (isWithinCooldown(participant, cooldownMs)) {
		return { participantPatch: null, outbounds: [] };
	}

	return {
		participantPatch: null,
		outbounds: [redirectAction(config)],
	};
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function handleInbound(args: {
	participant: Participant | null;
	message: InboundMessage;
	config: StateMachineConfig;
}): HandleResult {
	const { participant, message, config } = args;

	if (participant === null) {
		return handleNew({ message, config });
	}

	// Fix #10 + #13: TTL 24h em estados intermediários → tratar como NEW
	if (isStaleIntermediate(participant)) {
		return handleNew({ message, config });
	}

	const state = participant.state as ParticipantState;

	switch (state) {
		case "NEW":
			return handleNew({ message, config });

		case "NON_PARTICIPANT":
			return handleNonParticipant({ participant, message, config });

		case "AWAITING_CONSENT":
			return handleAwaitingConsent({ participant, message, config });

		case "AWAITING_NAME":
			return handleAwaitingName({ participant, message, config });

		case "AWAITING_COMPANY":
			return handleAwaitingCompany({ participant, message, config });

		case "COMPLETED":
			return handleCompleted({ participant, message });

		case "DECLINED":
			return handleDeclined({ participant, message, config });

		default: {
			const _exhaustive: never = state as never;
			return _exhaustive;
		}
	}
}
