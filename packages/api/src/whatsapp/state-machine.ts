/**
 * State machine pura do bot WhatsApp Profills.
 *
 * Sem I/O: sem DB, sem fetch, sem env.
 * Recebe estado atual + mensagem + config → retorna patch + outbounds.
 */

import type { participants as ParticipantTable } from "@dashboard-leads-profills/db/schema/whatsapp";
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
}>;

export type OutboundAction =
	| { kind: "text"; body: string }
	| { kind: "interactive"; interactive: InteractiveMessage["interactive"] }
	| { kind: "image"; link: string; caption?: string }
	| { kind: "generateAndSendCode" };

export type StateMachineConfig = {
	eventName: string;
	raffleDate?: string;
	termsVersion: string;
	welcomeImageUrl?: string;
};

export type HandleResult = {
	participantPatch: ParticipantPatch | null;
	createParticipant?: { waId: string; state: ParticipantState };
	outbounds: OutboundAction[];
};

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

// ---------------------------------------------------------------------------
// State handlers
// ---------------------------------------------------------------------------

function handleNew(args: {
	message: InboundMessage;
	config: StateMachineConfig;
}): HandleResult {
	const { message, config } = args;
	const waId = message.from;

	const outbounds: OutboundAction[] = [];

	if (config.welcomeImageUrl) {
		outbounds.push({ kind: "image", link: config.welcomeImageUrl });
	}

	outbounds.push(toInteractiveAction(welcome({ eventName: config.eventName })));

	return {
		participantPatch: null,
		createParticipant: { waId, state: "AWAITING_CONSENT" },
		outbounds,
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

function handleCompleted(args: {
	participant: Participant;
	message: InboundMessage;
}): HandleResult {
	const { participant, message } = args;
	const body = getTextBody(message);

	if (body !== null) {
		const trimmed = body.trim();

		if (/^status$|^!status|^\/status/i.test(trimmed)) {
			return {
				participantPatch: null,
				outbounds: [
					toTextAction(status({ raffleCode: participant.raffleCode ?? "" })),
				],
			};
		}

		if (/^ajuda|^help|^\?/i.test(trimmed)) {
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

function handleDeclined(): HandleResult {
	return {
		participantPatch: {
			state: "AWAITING_CONSENT",
			declinedAt: null,
			retryCount: 0,
		},
		outbounds: [toInteractiveAction(reoffer())],
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

	// No participant yet → treat as NEW
	if (participant === null) {
		return handleNew({ message, config });
	}

	const state = participant.state as ParticipantState;

	switch (state) {
		case "NEW":
		case "AWAITING_CONSENT":
			return handleAwaitingConsent({ participant, message, config });

		case "AWAITING_NAME":
			return handleAwaitingName({ message });

		case "AWAITING_COMPANY":
			return handleAwaitingCompany({ message });

		case "COMPLETED":
			return handleCompleted({ participant, message });

		case "DECLINED":
			return handleDeclined();

		default: {
			// Exhaustiveness guard — unreachable at runtime if DB state is always valid
			void (state as never);
			return { participantPatch: null, outbounds: [] };
		}
	}
}
