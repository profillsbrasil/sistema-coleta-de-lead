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
	help,
	invalidConsentRetry,
	nameInvalid,
	redirect,
	reoffer,
	status,
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
const STATUS_RE = /^status$|^!status|^\/status/i;
const HELP_RE = /^ajuda|^help|^\?/i;

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
		outbounds: [
			toInteractiveAction(
				redirect({
					vendorName: config.vendorName,
					vendorPhone: config.vendorPhone,
					eventStart: config.eventStartBR,
					eventEnd: config.eventEndBR,
				})
			),
		],
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

	if (newRetryCount >= 3) {
		return {
			participantPatch: { retryCount: newRetryCount },
			outbounds: [], // silent timeout
		};
	}

	return {
		participantPatch: { retryCount: newRetryCount },
		outbounds: [toInteractiveAction(invalidConsentRetry())],
	};
}

function handleAwaitingName(args: { message: InboundMessage }): HandleResult {
	const { message } = args;
	const body = getTextBody(message);

	if (body === null) {
		return {
			participantPatch: null,
			outbounds: [toTextAction(nameInvalid())],
		};
	}

	const trimmed = body.trim();

	if (trimmed.length < 2 || trimmed.length > 80) {
		return {
			participantPatch: null,
			outbounds: [toTextAction(nameInvalid())],
		};
	}

	return {
		participantPatch: {
			state: "AWAITING_COMPANY",
			name: trimmed,
		},
		outbounds: [toTextAction(askCompany({ name: trimmed }))],
	};
}

function handleAwaitingCompany(args: {
	message: InboundMessage;
}): HandleResult {
	const { message } = args;
	const body = getTextBody(message);

	if (body === null) {
		return {
			participantPatch: null,
			outbounds: [toTextAction(companyInvalid())],
		};
	}

	const trimmed = body.trim();

	if (trimmed.length < 1 || trimmed.length > 80) {
		return {
			participantPatch: null,
			outbounds: [toTextAction(companyInvalid())],
		};
	}

	return {
		participantPatch: {
			state: "COMPLETED",
			company: trimmed,
		},
		outbounds: [{ kind: "generateAndSendCode" }],
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

	// Outra mensagem: aplica anti-loop (4h cooldown padrão)
	const cooldownMs = config.redirectCooldownMs ?? 4 * 60 * 60 * 1000;
	const lastSent = participant.redirectSentAt;
	if (lastSent && Date.now() - lastSent.getTime() < cooldownMs) {
		return {
			participantPatch: null,
			outbounds: [],
		};
	}

	return {
		participantPatch: null, // redirectSentAt setado pelo webhook após enviar
		outbounds: [
			toInteractiveAction(
				redirect({
					vendorName: config.vendorName,
					vendorPhone: config.vendorPhone,
					eventStart: config.eventStartBR,
					eventEnd: config.eventEndBR,
				})
			),
		],
	};
}

function handleCompleted(args: {
	participant: Participant;
	message: InboundMessage;
}): HandleResult {
	const { participant, message } = args;
	const body = getTextBody(message);

	if (body !== null) {
		const trimmed = body.trim();

		if (STATUS_RE.test(trimmed)) {
			return {
				participantPatch: null,
				outbounds: [
					toTextAction(status({ raffleCode: participant.raffleCode ?? "" })),
				],
			};
		}

		if (HELP_RE.test(trimmed)) {
			return {
				participantPatch: null,
				outbounds: [toTextAction(help())],
			};
		}
	}

	// Anything else
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
	const body = getTextBody(message);

	// Keyword OR botão "Participar sorteio" → reoferta
	if (
		(body !== null && isSorteioKeyword(body)) ||
		isButtonReply(message, "want_to_participate")
	) {
		return {
			participantPatch: {
				state: "AWAITING_CONSENT",
				declinedAt: null,
				retryCount: 0,
			},
			outbounds: [toInteractiveAction(reoffer())],
		};
	}

	// Outra mensagem: silêncio (cliente já optou por não participar)
	// Aplicar anti-loop opcional via redirectSentAt
	const cooldownMs = config.redirectCooldownMs ?? 4 * 60 * 60 * 1000;
	const lastSent = participant.redirectSentAt;
	if (lastSent && Date.now() - lastSent.getTime() < cooldownMs) {
		return { participantPatch: null, outbounds: [] };
	}

	return {
		participantPatch: null,
		outbounds: [
			toInteractiveAction(
				redirect({
					vendorName: config.vendorName,
					vendorPhone: config.vendorPhone,
					eventStart: config.eventStartBR,
					eventEnd: config.eventEndBR,
				})
			),
		],
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

	const state = participant.state as ParticipantState;

	switch (state) {
		case "NEW":
			return handleNew({ message, config });

		case "NON_PARTICIPANT":
			return handleNonParticipant({ participant, message, config });

		case "AWAITING_CONSENT":
			return handleAwaitingConsent({ participant, message, config });

		case "AWAITING_NAME":
			return handleAwaitingName({ message });

		case "AWAITING_COMPANY":
			return handleAwaitingCompany({ message });

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
