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
	eventNotice,
	invalidConsentRetry,
	nameInvalid,
	tasksConfirm,
	tasksList,
	welcome,
} from "./messages";
import type { InboundMessage } from "./types";
import type { ValidationError } from "./validation";
import { validateCompany, validateName } from "./validation";

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type ParticipantState =
	| "NEW"
	| "NON_PARTICIPANT"
	| "AWAITING_CONSENT"
	| "AWAITING_NAME"
	| "AWAITING_COMPANY"
	| "AWAITING_TASKS"
	| "COMPLETED"
	| "DECLINED";

export type TaskProgress = {
	follow_1: boolean;
	follow_2: boolean;
	follow_3: boolean;
	comment: boolean;
};

export const EMPTY_TASK_PROGRESS: TaskProgress = {
	follow_1: false,
	follow_2: false,
	follow_3: false,
	comment: false,
};

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
	lastResponseAt: Date | null;
	taskProgress: TaskProgress;
}>;

export type OutboundAction =
	| { kind: "text"; body: string }
	| { kind: "interactive"; interactive: InteractiveMessage["interactive"] }
	| { kind: "generateAndSendCode" };

export interface StateMachineConfig {
	eventEndBR: string; // "29/05"
	eventName: string;
	eventStartBR: string; // "26/05"
	logoUrl?: string; // header de imagem do eventNotice (logo Profills)
	raffleDate?: string;
	redirectCooldownMs?: number; // default 4h
	responseCooldownMs?: number; // default 8s — silencia respostas repetidas em COMPLETED/AWAITING_CONSENT
	termsVersion: string;
	vendorPhone: string;
	welcomeImageUrl?: string;
}

export interface HandleResult {
	createParticipant?: { waId: string; state: ParticipantState };
	outbounds: OutboundAction[];
	participantPatch: ParticipantPatch | null;
	/**
	 * Sinaliza ao webhook que o outbound enviado foi um eventNotice
	 * (mensagem de atendimento). O webhook usa pra setar redirectSentAt
	 * e incrementar redirectCount.
	 */
	wasEventNotice?: boolean;
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

/** Retorna a action de eventNotice (atendimento) para reuso nos handlers. */
function eventNoticeAction(config: StateMachineConfig): OutboundAction {
	return toInteractiveAction(
		eventNotice({
			vendorPhone: config.vendorPhone,
			eventStart: config.eventStartBR,
			eventEnd: config.eventEndBR,
			logoUrl: config.logoUrl,
		})
	);
}

/**
 * Verifica se o participante atingiu o limite de envios de eventNotice.
 * Quando redirectCount >= 3, o bot fica em silêncio permanente para esse waId.
 * O nome da coluna mantém "redirect" por compatibilidade com schema antigo.
 */
function hasExhaustedNotices(participant: Participant): boolean {
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

const DEFAULT_RESPONSE_COOLDOWN_MS = 8_000;

function isWithinResponseCooldown(
	participant: Participant,
	cooldownMs: number
): boolean {
	const last = participant.lastResponseAt;
	return !!last && Date.now() - last.getTime() < cooldownMs;
}

// ---------------------------------------------------------------------------
// TTL check (fix #10 + #13)
// ---------------------------------------------------------------------------

const INTERMEDIATE_STATES: ParticipantState[] = [
	"AWAITING_CONSENT",
	"AWAITING_NAME",
	"AWAITING_COMPANY",
	"AWAITING_TASKS",
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

	// Cliente comum: cria participant NON_PARTICIPANT e envia eventNotice (atendimento).
	return {
		participantPatch: null,
		createParticipant: { waId, state: "NON_PARTICIPANT" },
		outbounds: [eventNoticeAction(config)],
		wasEventNotice: true,
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
			outbounds: [toInteractiveAction(declined({ vendorPhone: config.vendorPhone }))],
		};
	}

	// Invalid — increment retry counter
	const newRetryCount = participant.retryCount + 1;

	// Fix #9: após 3 tentativas inválidas → NON_PARTICIPANT + eventNotice (não silêncio)
	if (newRetryCount >= 3) {
		if (hasExhaustedNotices(participant)) {
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
			outbounds: [eventNoticeAction(config)],
			wasEventNotice: true,
		};
	}

	// Anti-flood: silencia o invalidConsentRetry se acabamos de mandar um.
	const cooldownMs = config.responseCooldownMs ?? DEFAULT_RESPONSE_COOLDOWN_MS;
	if (isWithinResponseCooldown(participant, cooldownMs)) {
		return {
			participantPatch: { retryCount: newRetryCount },
			outbounds: [],
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

	// Mídia / não-texto: conta como vazio (retry com feedback de empty).
	const result = body === null ? validateName("") : validateName(body);

	if (!result.ok) {
		return handleNameInvalid({ participant, config, reason: result.reason });
	}

	return {
		participantPatch: {
			state: "AWAITING_COMPANY",
			name: result.value,
			retryCount: 0,
		},
		outbounds: [toTextAction(askCompany({ name: result.value }))],
	};
}

/** Retry counter + fallback (NON_PARTICIPANT + eventNotice) após 3 inválidos. */
function handleNameInvalid(args: {
	participant: Participant;
	config: StateMachineConfig;
	reason: ValidationError;
}): HandleResult {
	const { participant, config, reason } = args;
	const newRetryCount = participant.retryCount + 1;

	if (newRetryCount >= 3) {
		if (hasExhaustedNotices(participant)) {
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
			outbounds: [eventNoticeAction(config)],
			wasEventNotice: true,
		};
	}

	return {
		participantPatch: { retryCount: newRetryCount },
		outbounds: [toTextAction(nameInvalid(reason))],
	};
}

function handleAwaitingCompany(args: {
	participant: Participant;
	message: InboundMessage;
	config: StateMachineConfig;
}): HandleResult {
	const { participant, message, config } = args;
	const body = getTextBody(message);

	const result = body === null ? validateCompany("") : validateCompany(body);

	if (!result.ok) {
		return handleCompanyInvalid({
			participant,
			config,
			reason: result.reason,
		});
	}

	return {
		participantPatch: {
			state: "AWAITING_TASKS",
			company: result.value,
			retryCount: 0,
		},
		outbounds: [
			toInteractiveAction(tasksList({ name: participant.name ?? "" })),
			toInteractiveAction(tasksConfirm()),
		],
	};
}

/** Retry counter + fallback (NON_PARTICIPANT + eventNotice) após 3 inválidos. */
function handleCompanyInvalid(args: {
	participant: Participant;
	config: StateMachineConfig;
	reason: ValidationError;
}): HandleResult {
	const { participant, config, reason } = args;
	const newRetryCount = participant.retryCount + 1;

	if (newRetryCount >= 3) {
		if (hasExhaustedNotices(participant)) {
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
			outbounds: [eventNoticeAction(config)],
			wasEventNotice: true,
		};
	}

	return {
		participantPatch: { retryCount: newRetryCount },
		outbounds: [toTextAction(companyInvalid(reason))],
	};
}

function handleNonParticipant(args: {
	participant: Participant;
	message: InboundMessage;
	config: StateMachineConfig;
}): HandleResult {
	const { participant, message, config } = args;
	const body = getTextBody(message);

	// Keyword detectada → entra no fluxo do sorteio
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

	// Limite de 3 envios — silêncio permanente para esse waId
	if (hasExhaustedNotices(participant)) {
		return { participantPatch: null, outbounds: [] };
	}

	// Anti-loop: cooldown 4h padrão entre envios
	const cooldownMs = config.redirectCooldownMs ?? 4 * 60 * 60 * 1000;
	if (isWithinCooldown(participant, cooldownMs)) {
		return { participantPatch: null, outbounds: [] };
	}

	return {
		participantPatch: null, // webhook seta redirectSentAt/Count via wasEventNotice
		outbounds: [eventNoticeAction(config)],
		wasEventNotice: true,
	};
}

function handleAwaitingTasks(args: {
	participant: Participant;
	message: InboundMessage;
	config: StateMachineConfig;
}): HandleResult {
	const { participant, message } = args;

	if (isButtonReply(message, "tasks_done")) {
		return {
			participantPatch: {
				state: "COMPLETED",
				taskProgress: {
					follow_1: true,
					follow_2: true,
					follow_3: true,
					comment: true,
				},
			},
			outbounds: [{ kind: "generateAndSendCode" }],
		};
	}

	// Qualquer outra mensagem (texto, mídia, botão inesperado) — repete a lista
	// e a confirmação. Cooldown de 8s no handleInbound evita spam em flood.
	return {
		participantPatch: null,
		outbounds: [
			toInteractiveAction(tasksList({ name: participant.name ?? "" })),
			toInteractiveAction(tasksConfirm()),
		],
	};
}

function handleCompleted(args: {
	participant: Participant;
	message: InboundMessage;
	config: StateMachineConfig;
}): HandleResult {
	const { participant, config } = args;

	// Anti-flood: silencia se respondemos a mesma mensagem há pouco tempo.
	const cooldownMs = config.responseCooldownMs ?? DEFAULT_RESPONSE_COOLDOWN_MS;
	if (isWithinResponseCooldown(participant, cooldownMs)) {
		return { participantPatch: null, outbounds: [] };
	}

	// Qualquer mensagem → alreadyParticipated (status e help removidos)
	return {
		participantPatch: null,
		outbounds: [
			toInteractiveAction(
				alreadyParticipated({
					name: participant.name ?? "",
					raffleCode: participant.raffleCode ?? "",
					vendorPhone: config.vendorPhone,
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

	// Keyword → cliente mudou de ideia, reabre fluxo do sorteio
	if (body !== null && isSorteioKeyword(body)) {
		return {
			participantPatch: {
				state: "AWAITING_CONSENT",
				declinedAt: null,
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

	// Limite de 3 envios — silêncio permanente
	if (hasExhaustedNotices(participant)) {
		return { participantPatch: null, outbounds: [] };
	}

	// Anti-loop cooldown
	const cooldownMs = config.redirectCooldownMs ?? 4 * 60 * 60 * 1000;
	if (isWithinCooldown(participant, cooldownMs)) {
		return { participantPatch: null, outbounds: [] };
	}

	return {
		participantPatch: null,
		outbounds: [eventNoticeAction(config)],
		wasEventNotice: true,
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

	const result = dispatch({ participant, message, config });

	// Stamp lastResponseAt sempre que produzimos uma resposta, exceto eventNotice
	// (que já tem o próprio timestamp redirectSentAt).
	if (result.outbounds.length > 0 && !result.wasEventNotice) {
		result.participantPatch = {
			...(result.participantPatch ?? {}),
			lastResponseAt: new Date(),
		};
	}

	return result;
}

function dispatch(args: {
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

		case "AWAITING_TASKS":
			return handleAwaitingTasks({ participant, message, config });

		case "COMPLETED":
			return handleCompleted({ participant, message, config });

		case "DECLINED":
			return handleDeclined({ participant, message, config });

		default: {
			const _exhaustive: never = state as never;
			return _exhaustive;
		}
	}
}
