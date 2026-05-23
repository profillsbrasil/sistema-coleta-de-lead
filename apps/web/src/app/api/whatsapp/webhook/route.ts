import { generateRaffleCode } from "@dashboard-leads-profills/api/whatsapp/code-generator";
import { codeGenerated } from "@dashboard-leads-profills/api/whatsapp/messages";
import { checkWhatsappRateLimit } from "@dashboard-leads-profills/api/whatsapp/rate-limit";
import {
	sendImage,
	sendInteractive,
	sendText,
} from "@dashboard-leads-profills/api/whatsapp/sender";
import { verifySignature } from "@dashboard-leads-profills/api/whatsapp/signature";
import {
	handleInbound,
	type OutboundAction,
	type Participant,
	type StateMachineConfig,
} from "@dashboard-leads-profills/api/whatsapp/state-machine";
import {
	type InboundMessage,
	type WebhookPayload,
	webhookPayloadSchema,
} from "@dashboard-leads-profills/api/whatsapp/types";
import { db } from "@dashboard-leads-profills/db";
import {
	messages as messagesTable,
	participants,
} from "@dashboard-leads-profills/db/schema/whatsapp";
import { env } from "@dashboard-leads-profills/env/server";
import { env as webEnv } from "@dashboard-leads-profills/env/web";
import { and, eq, isNull } from "drizzle-orm";

// ---------------------------------------------------------------------------
// isRedirectInteractive — detecta se o outbound interativo é um redirect
// ---------------------------------------------------------------------------

function isRedirectInteractive(interactive: {
	action: { buttons: Array<{ reply: { id: string } }> };
}): boolean {
	return interactive.action.buttons.some(
		(b) => b.reply.id === "want_to_participate"
	);
}

// ---------------------------------------------------------------------------
// formatBR — converte ISO date "YYYY-MM-DD" para "DD/MM"
// ---------------------------------------------------------------------------

function formatBR(isoDate: string): string {
	const [, m, d] = isoDate.split("-");
	return `${d}/${m}`;
}

// ---------------------------------------------------------------------------
// GET — webhook verification
// ---------------------------------------------------------------------------

export function GET(request: Request): Response {
	const url = new URL(request.url);
	const mode = url.searchParams.get("hub.mode");
	const token = url.searchParams.get("hub.verify_token");
	const challenge = url.searchParams.get("hub.challenge");

	if (
		mode === "subscribe" &&
		token === env.WHATSAPP_VERIFY_TOKEN &&
		challenge
	) {
		return new Response(challenge, {
			status: 200,
			headers: { "content-type": "text/plain" },
		});
	}

	return new Response("Forbidden", { status: 403 });
}

// ---------------------------------------------------------------------------
// POST — message events
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
	const rawBody = await request.text();
	const signatureHeader = request.headers.get("x-hub-signature-256");

	if (!verifySignature(rawBody, signatureHeader, env.WHATSAPP_APP_SECRET)) {
		return new Response("Invalid signature", { status: 401 });
	}

	let parsed: WebhookPayload;
	try {
		parsed = webhookPayloadSchema.parse(JSON.parse(rawBody));
	} catch (err) {
		console.error(
			JSON.stringify({
				tag: "whatsapp:webhook",
				event: "parse_error",
				err: String(err),
			})
		);
		// Return 200 to prevent Meta from retrying malformed payloads
		return new Response("OK", { status: 200 });
	}

	for (const entry of parsed.entry) {
		for (const change of entry.changes) {
			const value = change.value;
			const inboundMessages = value.messages;
			if (!inboundMessages || inboundMessages.length === 0) {
				// Status-only event or empty — skip
				continue;
			}
			for (const message of inboundMessages) {
				await processMessage(message, value);
			}
		}
	}

	return new Response("OK", { status: 200 });
}

// ---------------------------------------------------------------------------
// processMessage
// ---------------------------------------------------------------------------

type WebhookValue = WebhookPayload["entry"][number]["changes"][number]["value"];

async function processMessage(
	message: InboundMessage,
	_value: WebhookValue
): Promise<void> {
	const waId = message.from;
	const messageId = message.id;

	try {
		// 1. Rate limit check
		const allowed = await checkWhatsappRateLimit(waId);
		if (!allowed) {
			console.log(
				JSON.stringify({
					tag: "whatsapp:webhook",
					event: "rate_limited",
					waId,
					messageId,
				})
			);
			return;
		}

		// 2. Dedup: skip if wamid already processed
		const existing = await db
			.select({ id: messagesTable.id })
			.from(messagesTable)
			.where(eq(messagesTable.wamid, messageId))
			.limit(1);

		if (existing.length > 0) {
			console.log(
				JSON.stringify({
					tag: "whatsapp:webhook",
					event: "duplicate_skipped",
					waId,
					messageId,
				})
			);
			return;
		}

		// 3. Load participant (may be null)
		const participantRows = await db
			.select()
			.from(participants)
			.where(eq(participants.waId, waId))
			.limit(1);

		let participant: Participant | null = participantRows[0] ?? null;

		// 4. Build config
		const config: StateMachineConfig = {
			eventName:
				webEnv.NEXT_PUBLIC_EVENT_NAME ?? "Sorteio Profills Fispal 2026",
			raffleDate: webEnv.NEXT_PUBLIC_RAFFLE_DATE,
			termsVersion: env.TERMS_VERSION,
			welcomeImageUrl: webEnv.NEXT_PUBLIC_WHATSAPP_WELCOME_IMAGE_URL,
			vendorName: env.WHATSAPP_REDIRECT_VENDOR_NAME,
			vendorPhone: env.WHATSAPP_REDIRECT_VENDOR_PHONE,
			eventStartBR: formatBR(env.WHATSAPP_REDIRECT_EVENT_START),
			eventEndBR: formatBR(env.WHATSAPP_REDIRECT_EVENT_END),
		};

		// 5. Run state machine
		const result = handleInbound({ participant, message, config });

		// 6. Apply DB changes
		// 6a. Create participant if needed
		if (result.createParticipant) {
			const [inserted] = await db
				.insert(participants)
				.values({
					waId: result.createParticipant.waId,
					state: result.createParticipant.state,
				})
				.returning();
			participant = inserted ?? null;
		}

		// 6b. Update participant if patch is provided
		if (result.participantPatch && participant !== null) {
			await db
				.update(participants)
				.set(result.participantPatch)
				.where(eq(participants.id, participant.id));
			// Merge patch into local participant for use below (e.g., for code generation)
			participant = {
				...participant,
				...result.participantPatch,
			} as Participant;
		}

		// 7. Log inbound message to whatsapp.messages
		// participant must exist at this point (created above if new)
		if (participant !== null) {
			await db.insert(messagesTable).values({
				participantId: participant.id,
				direction: "inbound",
				wamid: messageId,
				type: message.type,
				payload: message as Record<string, unknown>,
			});
		}

		// 8. Process outbound actions
		for (const action of result.outbounds) {
			await handleOutboundAction(action, waId, participant, config);
		}

		// 9. Se enviamos redirect (NON_PARTICIPANT ou DECLINED), registra timestamp
		const sentRedirect = result.outbounds.some(
			(a) => a.kind === "interactive" && isRedirectInteractive(a.interactive)
		);
		if (sentRedirect && participant !== null) {
			await db
				.update(participants)
				.set({ redirectSentAt: new Date() })
				.where(eq(participants.id, participant.id));
		}

		console.log(
			JSON.stringify({
				tag: "whatsapp:webhook",
				event: "processed",
				waId,
				messageId,
				outboundsCount: result.outbounds.length,
			})
		);
	} catch (err) {
		// Catch-all: log but never rethrow — Meta should not retry on our internal errors
		console.error(
			JSON.stringify({
				tag: "whatsapp:webhook",
				event: "error",
				waId,
				messageId,
				err: String(err),
			})
		);
	}
}

// ---------------------------------------------------------------------------
// handleOutboundAction — dispatches a single outbound action
// ---------------------------------------------------------------------------

async function handleOutboundAction(
	action: OutboundAction,
	waId: string,
	participant: Participant | null,
	config: StateMachineConfig
): Promise<void> {
	if (action.kind === "text") {
		await loggedSend(
			waId,
			() => sendText(waId, action.body),
			participant,
			"text",
			{ body: action.body }
		);
	} else if (action.kind === "interactive") {
		await loggedSend(
			waId,
			() => sendInteractive(waId, action.interactive),
			participant,
			"interactive",
			{ interactive: action.interactive }
		);
	} else if (action.kind === "image") {
		await loggedSend(
			waId,
			() => sendImage(waId, action.link, action.caption),
			participant,
			"image",
			{ link: action.link, caption: action.caption }
		);
	} else if (action.kind === "generateAndSendCode") {
		if (participant === null) {
			console.error(
				JSON.stringify({
					tag: "whatsapp:webhook",
					event: "error",
					err: "generateAndSendCode called with null participant",
					waId,
				})
			);
			return;
		}
		const raffleCode = await assignCodeWithRetry(db, participant.id);
		if (raffleCode === null) {
			// Exhausted retries — send fallback message
			console.error(
				JSON.stringify({
					tag: "whatsapp:webhook",
					event: "code_generation_exhausted",
					waId,
					participantId: participant.id,
				})
			);
			await loggedSend(
				waId,
				() =>
					sendText(
						waId,
						"Tivemos um problema ao gerar seu codigo de sorteio. Tente novamente em alguns minutos."
					),
				participant,
				"text",
				{ body: "fallback_code_error" }
			);
		} else {
			const name = participant.name ?? "";
			const codeMsgBody = codeGenerated({
				name,
				raffleCode,
				raffleDate: config.raffleDate,
			}).body;
			await loggedSend(
				waId,
				() => sendText(waId, codeMsgBody),
				participant,
				"text",
				{ body: codeMsgBody, raffleCode }
			);
		}
	}
}

// ---------------------------------------------------------------------------
// loggedSend — sends a message and logs the outbound record to the DB
// ---------------------------------------------------------------------------

async function loggedSend(
	_waId: string,
	send: () => Promise<{ wamid: string }>,
	participant: Participant | null,
	type: string,
	payloadSnippet: Record<string, unknown>
): Promise<void> {
	const { wamid } = await send();
	if (participant !== null) {
		await db.insert(messagesTable).values({
			participantId: participant.id,
			direction: "outbound",
			wamid,
			type,
			payload: payloadSnippet,
		});
	}
}

// ---------------------------------------------------------------------------
// assignCodeWithRetry — retries up to maxRetries times on UNIQUE violation
// ---------------------------------------------------------------------------

async function assignCodeWithRetry(
	drizzleDb: typeof db,
	participantId: string,
	maxRetries = 5
): Promise<string | null> {
	// Idempotência: se já tem código (retry inesperado de webhook), devolve o existente.
	const initial = await drizzleDb
		.select({ raffleCode: participants.raffleCode })
		.from(participants)
		.where(eq(participants.id, participantId))
		.limit(1);
	if (initial[0]?.raffleCode) {
		return initial[0].raffleCode;
	}

	for (let i = 0; i < maxRetries; i++) {
		const candidate = generateRaffleCode();
		try {
			const [updated] = await drizzleDb
				.update(participants)
				.set({ raffleCode: candidate })
				.where(
					and(
						eq(participants.id, participantId),
						isNull(participants.raffleCode)
					)
				)
				.returning({ raffleCode: participants.raffleCode });
			if (updated?.raffleCode) {
				return updated.raffleCode;
			}

			// 0 linhas atualizadas — outro processo concorrente atribuiu primeiro. Releia.
			const refreshed = await drizzleDb
				.select({ raffleCode: participants.raffleCode })
				.from(participants)
				.where(eq(participants.id, participantId))
				.limit(1);
			if (refreshed[0]?.raffleCode) {
				return refreshed[0].raffleCode;
			}
		} catch (err) {
			if (isUniqueViolation(err)) {
				// candidate colide com código de outro participante — tenta de novo.
				continue;
			}
			throw err;
		}
	}
	return null;
}

// ---------------------------------------------------------------------------
// isUniqueViolation — detects pg unique constraint errors from Drizzle
// ---------------------------------------------------------------------------

function isUniqueViolation(err: unknown): boolean {
	if (err === null || typeof err !== "object") {
		return false;
	}
	// postgres-js wraps pg errors in err.cause
	const cause = (err as { cause?: unknown }).cause;
	if (cause !== null && typeof cause === "object") {
		const code = (cause as { code?: unknown }).code;
		if (code === "23505") {
			return true;
		}
	}
	// Fallback: check message string
	const message = (err as { message?: unknown }).message;
	if (typeof message === "string") {
		return (
			message.includes("23505") || message.toLowerCase().includes("unique")
		);
	}
	return false;
}
