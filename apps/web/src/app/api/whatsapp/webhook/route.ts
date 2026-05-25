import { recordAlert } from "@dashboard-leads-profills/api/whatsapp/alerts";
import { generateRaffleCode } from "@dashboard-leads-profills/api/whatsapp/code-generator";
import { getWhatsappConfig } from "@dashboard-leads-profills/api/whatsapp/config-repository";
import {
	isHandoffKeyword,
	isOptInKeyword,
	isOptOutKeyword,
	isSorteioKeyword,
} from "@dashboard-leads-profills/api/whatsapp/keyword";
import {
	codeGenerated,
	handoffRedirect,
	optInConfirm,
	optOutConfirm,
	unsupportedMediaReply,
} from "@dashboard-leads-profills/api/whatsapp/messages";
import { checkWhatsappRateLimit } from "@dashboard-leads-profills/api/whatsapp/rate-limit";
import {
	sendInteractive,
	sendText,
	WhatsappSendPermanentError,
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
	type InboundStatus,
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
import { and, eq, isNull, sql } from "drizzle-orm";
import { after } from "next/server";

// ---------------------------------------------------------------------------
// formatBR — converte ISO date "YYYY-MM-DD" para "DD/MM"
// ---------------------------------------------------------------------------

function formatBR(isoDate: string): string {
	const [, m, d] = isoDate.split("-");
	return `${d}/${m}`;
}

/** "YYYY-MM-DD" → "DD/MM/YYYY" (data completa, p.ex. raffle date). */
function formatBRDate(isoDate: string): string {
	const [y, m, d] = isoDate.split("-");
	return `${d}/${m}/${y}`;
}

// ---------------------------------------------------------------------------
// Inbound message type guard
// ---------------------------------------------------------------------------

// "button" = clique em template button (raro). Mantemos compat — não é mídia.
const SUPPORTED_INBOUND_TYPES = new Set(["text", "interactive", "button"]);

function isUnsupportedInbound(type: string): boolean {
	return !SUPPORTED_INBOUND_TYPES.has(type);
}

/** Extrai o texto cru de uma inbound message text — null se não for texto. */
function getInboundTextBody(message: InboundMessage): string | null {
	if (message.type !== "text") return null;
	const m = message as Extract<InboundMessage, { type: "text" }>;
	return m.text.body;
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

	// ACK imediato (B1): processamento async via after(). Meta exige resposta
	// rápida; dedup atômico + advisory lock por wa_id (B2) garantem que retries
	// e mensagens concorrentes do mesmo usuário fiquem seguros mesmo em paralelo.
	for (const entry of parsed.entry) {
		for (const change of entry.changes) {
			const value = change.value;
			const inboundMessages = value.messages;
			if (inboundMessages && inboundMessages.length > 0) {
				for (const message of inboundMessages) {
					after(() => processMessageAsync(message, value));
				}
			}
			// B4: status webhooks (sent/delivered/read/failed) — atualizam o
			// outbound previamente gravado com timestamps, pricing e errors.
			const statuses = value.statuses;
			if (statuses && statuses.length > 0) {
				for (const status of statuses) {
					after(() => processStatusAsync(status));
				}
			}
		}
	}

	return new Response("OK", { status: 200 });
}

// ---------------------------------------------------------------------------
// claimInbound (B2) — advisory lock por wa_id + dedup atômico de wamid.
//
// Em uma única transação serializada por hashtext(wa_id):
//   1. SELECT/INSERT participant (cria como state=NEW se não existir)
//   2. INSERT inbound message ON CONFLICT (wamid) DO NOTHING RETURNING
//   3. Se 0 rows → duplicate retry da Meta → rollback + skip
//
// Como o lock é por wa_id, mensagens concorrentes do mesmo usuário são
// processadas em ordem, sem race de "dois INSERT participant simultâneos".
// ---------------------------------------------------------------------------

type ClaimResult =
	| { isDuplicate: false; participant: Participant }
	| { isDuplicate: true };

async function claimInbound(message: InboundMessage): Promise<ClaimResult> {
	const waId = message.from;
	const messageId = message.id;

	return await db.transaction(async (tx) => {
		await tx.execute(
			sql`SELECT pg_advisory_xact_lock(hashtext(${waId}))`
		);

		const existing = await tx
			.select()
			.from(participants)
			.where(eq(participants.waId, waId))
			.limit(1);

		let participant: Participant;
		if (existing[0]) {
			participant = existing[0];
		} else {
			const [created] = await tx
				.insert(participants)
				.values({ waId, state: "NEW" })
				.returning();
			if (!created) {
				throw new Error("claimInbound: failed to create participant");
			}
			participant = created;
		}

		const inserted = await tx
			.insert(messagesTable)
			.values({
				participantId: participant.id,
				direction: "inbound",
				wamid: messageId,
				type: message.type,
				payload: message as Record<string, unknown>,
			})
			.onConflictDoNothing({ target: messagesTable.wamid })
			.returning({ id: messagesTable.id });

		if (inserted.length === 0) {
			return { isDuplicate: true };
		}

		// Atualiza last_inbound_at — usado pelo guard rail 23h (B5) e por
		// futuro check de janela 24h pra envio fora-de-template.
		const now = new Date();
		await tx
			.update(participants)
			.set({ lastInboundAt: now })
			.where(eq(participants.id, participant.id));
		participant = { ...participant, lastInboundAt: now };

		return { isDuplicate: false, participant };
	});
}

// ---------------------------------------------------------------------------
// processMessageAsync — rodado via after() depois do ACK 200
// ---------------------------------------------------------------------------

type WebhookValue = WebhookPayload["entry"][number]["changes"][number]["value"];

async function processMessageAsync(
	message: InboundMessage,
	_value: WebhookValue
): Promise<void> {
	const waId = message.from;
	const messageId = message.id;

	try {
		// 1. Dedup atômico + load/create participant (B2)
		const claim = await claimInbound(message);
		if (claim.isDuplicate) {
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
		let participant: Participant = claim.participant;

		// 2. Rate limit (inbound já tá logado pelo claim — trilha preservada)
		const rl = await checkWhatsappRateLimit(waId);
		if (!rl.allowed) {
			console.log(
				JSON.stringify({
					tag: "whatsapp:webhook",
					event: "rate_limited",
					waId,
					messageId,
					count: rl.count,
					firstExceeded: rl.firstExceeded,
				})
			);
			if (rl.firstExceeded) {
				try {
					await sendText(
						waId,
						"Recebemos suas mensagens! Aguarde um momento, vamos te responder em instantes."
					);
				} catch (err) {
					console.error(
						JSON.stringify({
							tag: "whatsapp:webhook",
							event: "rate_limit_warning_failed",
							waId,
							err: String(err),
						})
					);
				}
			}
			return;
		}

		// 3a. Mídia inbound (image/audio/video/sticker/document/location/...) →
		// resposta padrão e early-return. Sem download de mídia.
		if (isUnsupportedInbound(message.type)) {
			const reply = unsupportedMediaReply();
			await loggedSend(
				waId,
				() => sendText(waId, reply.body),
				participant,
				"text",
				{ body: reply.body }
			);
			console.log(
				JSON.stringify({
					tag: "whatsapp:webhook",
					event: "unsupported_media_replied",
					waId,
					messageId,
					inboundType: message.type,
				})
			);
			return;
		}

		const textBody = getInboundTextBody(message);

		// 3a-1. Opt-out (A1 ajustado): se já optado pra fora, silencia tudo
		// exceto VOLTAR (que limpa a flag). Não deleta dados — DSR manual.
		if (participant.optedOutAt) {
			if (textBody !== null && isOptInKeyword(textBody)) {
				await db
					.update(participants)
					.set({ optedOutAt: null, optedOutReason: null })
					.where(eq(participants.id, participant.id));
				participant = {
					...participant,
					optedOutAt: null,
					optedOutReason: null,
				};
				const reply = optInConfirm();
				await loggedSend(
					waId,
					() => sendText(waId, reply.body),
					participant,
					"text",
					{ body: reply.body }
				);
				console.log(
					JSON.stringify({
						tag: "whatsapp:webhook",
						event: "opt_in",
						waId,
						messageId,
					})
				);
				return;
			}
			console.log(
				JSON.stringify({
					tag: "whatsapp:webhook",
					event: "opt_out_silence",
					waId,
					messageId,
				})
			);
			return;
		}

		// 3a-2. Keyword de opt-out: precedência máxima sobre sorteio/handoff.
		if (textBody !== null && isOptOutKeyword(textBody)) {
			const reply = optOutConfirm();
			await loggedSend(
				waId,
				() => sendText(waId, reply.body),
				participant,
				"text",
				{ body: reply.body }
			);
			await db
				.update(participants)
				.set({ optedOutAt: new Date(), optedOutReason: "user_keyword" })
				.where(eq(participants.id, participant.id));
			console.log(
				JSON.stringify({
					tag: "whatsapp:webhook",
					event: "opt_out",
					waId,
					messageId,
				})
			);
			return;
		}

		// 3b. Handoff silence (A3): se já houve handoff, silencia tudo exceto
		// keyword sorteio (que reabre o fluxo e limpa a flag).
		if (participant.humanHandoffRequestedAt) {
			if (textBody !== null && isSorteioKeyword(textBody)) {
				await db
					.update(participants)
					.set({ humanHandoffRequestedAt: null })
					.where(eq(participants.id, participant.id));
				participant = { ...participant, humanHandoffRequestedAt: null };
			} else {
				console.log(
					JSON.stringify({
						tag: "whatsapp:webhook",
						event: "handoff_silence",
						waId,
						messageId,
					})
				);
				return;
			}
		}

		// 3c. Keyword de handoff (A3): atende qualquer estado, envia CTA pro vendor.
		if (
			textBody !== null &&
			!isSorteioKeyword(textBody) &&
			isHandoffKeyword(textBody)
		) {
			const dbConfig = await getWhatsappConfig();
			const reply = handoffRedirect({ vendorPhone: dbConfig.vendorPhone });
			await loggedSend(
				waId,
				() => sendInteractive(waId, reply.interactive),
				participant,
				"interactive",
				{ interactive: reply.interactive }
			);
			await db
				.update(participants)
				.set({ humanHandoffRequestedAt: new Date() })
				.where(eq(participants.id, participant.id));
			console.log(
				JSON.stringify({
					tag: "whatsapp:webhook",
					event: "handoff_triggered",
					waId,
					messageId,
				})
			);
			return;
		}

		// 4. Build config — campos textuais/visuais vêm da tabela whatsapp.config.
		const dbConfig = await getWhatsappConfig();
		const config: StateMachineConfig = {
			eventName: dbConfig.eventName,
			raffleDate: formatBRDate(dbConfig.raffleDate),
			termsVersion: env.TERMS_VERSION,
			welcomeImageUrl: dbConfig.welcomeImageUrl ?? undefined,
			logoUrl: dbConfig.logoUrl ?? undefined,
			vendorPhone: dbConfig.vendorPhone,
			eventStartBR: formatBR(dbConfig.eventStart),
			eventEndBR: formatBR(dbConfig.eventEnd),
			instagramProfiles: dbConfig.instagramProfiles,
			officialPostUrl: dbConfig.officialPostUrl,
			privacyPolicyUrl: dbConfig.privacyPolicyUrl,
		};

		// 5. State machine — participant sempre existe (claimInbound criou se null).
		const result = handleInbound({ participant, message, config });

		// 6. Apply DB changes
		// 6a. createParticipant da state machine vira UPDATE state (participant já existe).
		if (result.createParticipant) {
			await db
				.update(participants)
				.set({ state: result.createParticipant.state })
				.where(eq(participants.id, participant.id));
			participant = { ...participant, state: result.createParticipant.state };
		}

		// 6b. Update participant patch.
		if (result.participantPatch) {
			await db
				.update(participants)
				.set(result.participantPatch)
				.where(eq(participants.id, participant.id));
			participant = { ...participant, ...result.participantPatch } as Participant;
		}

		// 7. Outbound actions
		for (const action of result.outbounds) {
			await handleOutboundAction(action, waId, participant, config);
		}

		// 8. Se enviamos eventNotice, registra timestamp e incrementa contador.
		if (result.wasEventNotice) {
			await db
				.update(participants)
				.set({
					redirectSentAt: new Date(),
					redirectCount: (participant.redirectCount ?? 0) + 1,
				})
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
// processStatusAsync (B4) — sent/delivered/read/failed do outbound
// ---------------------------------------------------------------------------

// Meta error codes que indicam falha permanente (não vale retentar).
// 131026 = receiver não encontrado; 131047 = fora da janela 24h.
const PERMANENT_FAILED_CODES = new Set([131026, 131047]);

function pickStatusUpdate(status: InboundStatus): {
	deliveredAt?: Date;
	readAt?: Date;
	failedAt?: Date;
	failedCode?: number | null;
	failedReason?: string | null;
	pricingCategory?: string | null;
	pricingBillable?: boolean | null;
} {
	const ts = new Date(Number(status.timestamp) * 1000);
	const update: ReturnType<typeof pickStatusUpdate> = {};

	if (status.status === "delivered") update.deliveredAt = ts;
	else if (status.status === "read") update.readAt = ts;
	else if (status.status === "failed") {
		update.failedAt = ts;
		const firstError = status.errors?.[0];
		update.failedCode = firstError?.code ?? null;
		update.failedReason =
			firstError?.title ?? firstError?.message ?? "unknown";
	}

	if (status.pricing) {
		if (status.pricing.category !== undefined) {
			update.pricingCategory = status.pricing.category;
		}
		if (status.pricing.billable !== undefined) {
			update.pricingBillable = status.pricing.billable;
		}
	}
	return update;
}

async function processStatusAsync(status: InboundStatus): Promise<void> {
	try {
		const update = pickStatusUpdate(status);
		if (Object.keys(update).length === 0) {
			// "sent" sem pricing — nada a registrar (já gravado no envio).
			return;
		}
		await db
			.update(messagesTable)
			.set(update)
			.where(eq(messagesTable.wamid, status.id));

		if (status.status === "failed") {
			const code = status.errors?.[0]?.code ?? null;
			const isPermanent =
				code !== null && PERMANENT_FAILED_CODES.has(code);
			const eventName = isPermanent
				? "outbound_failed_permanent"
				: "outbound_failed_status";
			console.error(
				JSON.stringify({
					tag: "whatsapp:webhook",
					event: eventName,
					wamid: status.id,
					recipient: status.recipient_id,
					code,
				})
			);
			await recordAlert(eventName, isPermanent ? "high" : "warning", {
				wamid: status.id,
				recipient: status.recipient_id,
				code,
			});
			// TODO: replay automático para códigos retentáveis exige reconstruir
			// o payload original e respeitar contadores — dívida #37.
		}
	} catch (err) {
		console.error(
			JSON.stringify({
				tag: "whatsapp:webhook",
				event: "status_update_error",
				wamid: status.id,
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
			await recordAlert("code_generation_exhausted", "critical", {
				waId,
				participantId: participant.id,
			});
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

const WINDOW_MS = 23 * 60 * 60 * 1000; // 23h — margem de 1h dentro da janela 24h

async function loggedSend(
	waId: string,
	send: () => Promise<{ wamid: string }>,
	participant: Participant | null,
	type: string,
	payloadSnippet: Record<string, unknown>
): Promise<void> {
	// B5: guard rail anti-cobrança — não envia free-form fora da janela 24h.
	// Bot é 100% reativo; só dispara em bug (cron acidental, retry tardio).
	if (
		participant !== null &&
		participant.lastInboundAt &&
		Date.now() - participant.lastInboundAt.getTime() > WINDOW_MS
	) {
		await db.insert(messagesTable).values({
			participantId: participant.id,
			direction: "outbound",
			type,
			payload: payloadSnippet,
			failedAt: new Date(),
			failedCode: null,
			failedReason: "blocked_outside_24h_window",
		});
		console.error(
			JSON.stringify({
				tag: "whatsapp:webhook",
				event: "outbound_blocked_outside_window",
				waId,
				participantId: participant.id,
				lastInboundAt: participant.lastInboundAt.toISOString(),
			})
		);
		await recordAlert("outbound_blocked_outside_window", "high", {
			waId,
			participantId: participant.id,
			lastInboundAt: participant.lastInboundAt.toISOString(),
		});
		return;
	}

	try {
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
	} catch (err) {
		if (err instanceof WhatsappSendPermanentError) {
			if (participant !== null) {
				await db.insert(messagesTable).values({
					participantId: participant.id,
					direction: "outbound",
					type,
					payload: payloadSnippet,
					failedAt: new Date(),
					failedCode: err.metaCode,
					failedReason: err.responseBody.slice(0, 500),
				});
			}
			console.error(
				JSON.stringify({
					tag: "whatsapp:webhook",
					event: "outbound_failed_dead_letter",
					waId,
					participantId: participant?.id ?? null,
					status: err.status,
					metaCode: err.metaCode,
					attempts: err.attempts,
				})
			);
			await recordAlert("outbound_failed_dead_letter", "high", {
				waId,
				participantId: participant?.id ?? null,
				status: err.status,
				metaCode: err.metaCode,
				attempts: err.attempts,
			});
			return;
		}
		// Erro inesperado — re-throw pra o catch-all do processMessageAsync logar.
		throw err;
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
