import { env } from "@dashboard-leads-profills/env/server";
import type { InteractiveMessage } from "./messages.ts";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class WhatsappSendError extends Error {
	status: number;
	responseBody: string;
	metaCode: number | null;

	constructor(status: number, responseBody: string, metaCode: number | null = null) {
		super(`WhatsApp API error ${status}: ${responseBody}`);
		this.name = "WhatsappSendError";
		this.status = status;
		this.responseBody = responseBody;
		this.metaCode = metaCode;
	}
}

/**
 * Lançado após esgotar todas as tentativas de retry, ou no primeiro 4xx
 * não-retentável. Subclasse de WhatsappSendError pra manter compat com
 * caller existente; carrega `attempts` pro caller (loggedSend) gravar
 * dead-letter row.
 */
export class WhatsappSendPermanentError extends WhatsappSendError {
	attempts: number;

	constructor(
		status: number,
		responseBody: string,
		metaCode: number | null,
		attempts: number
	) {
		super(status, responseBody, metaCode);
		this.name = "WhatsappSendPermanentError";
		this.attempts = attempts;
		this.message = `WhatsApp send permanently failed after ${attempts} attempt(s) — status ${status} code ${metaCode ?? "n/a"}: ${responseBody}`;
	}
}

// ---------------------------------------------------------------------------
// Retry policy (B3)
// ---------------------------------------------------------------------------

const TIMEOUT_MS = 8_000;
const MAX_ATTEMPTS = 3;
const BACKOFFS_MS = [500, 1_500, 4_500] as const;

// Meta error codes que vale tentar de novo: rate limits / throttling.
// 130429 = rate limit hit, 131056 = pair rate limit hit.
const RETRYABLE_META_CODES = new Set([130429, 131056]);

function jitter(ms: number): number {
	// ±30% random jitter
	const delta = ms * 0.3 * (Math.random() * 2 - 1);
	return Math.max(0, Math.round(ms + delta));
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNetworkError(err: unknown): boolean {
	if (err === null || typeof err !== "object") return false;
	const name = (err as { name?: unknown }).name;
	if (name === "AbortError" || name === "TimeoutError") return true;
	// fetch network failures: TypeError com causa
	if (err instanceof TypeError) return true;
	return false;
}

function isRetryable(status: number, metaCode: number | null): boolean {
	if (status >= 500) return true;
	if (status === 429) return true;
	if (metaCode !== null && RETRYABLE_META_CODES.has(metaCode)) return true;
	return false;
}

/** Tenta extrair Meta error code do body de resposta. */
function parseMetaCode(body: string): number | null {
	try {
		const parsed = JSON.parse(body) as { error?: { code?: unknown } };
		const code = parsed.error?.code;
		return typeof code === "number" ? code : null;
	} catch {
		return null;
	}
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface SendResult {
	wamid: string;
}

function apiUrl(): string {
	return `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
}

function headers(): Record<string, string> {
	return {
		Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
		"Content-Type": "application/json",
	};
}

async function postMessageOnce(body: unknown): Promise<SendResult> {
	const response = await fetch(apiUrl(), {
		method: "POST",
		headers: headers(),
		body: JSON.stringify(body),
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new WhatsappSendError(response.status, text, parseMetaCode(text));
	}

	const data = (await response.json()) as { messages: Array<{ id: string }> };
	const wamid = data.messages[0]?.id;
	if (!wamid) {
		throw new WhatsappSendError(200, "Response missing messages[0].id", null);
	}
	return { wamid };
}

async function postMessage(body: unknown): Promise<SendResult> {
	let lastError: WhatsappSendError | null = null;

	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		try {
			return await postMessageOnce(body);
		} catch (err) {
			// Network/timeout error → retryable
			if (isNetworkError(err)) {
				lastError = new WhatsappSendError(
					0,
					err instanceof Error ? err.message : String(err),
					null
				);
				if (attempt < MAX_ATTEMPTS) {
					await sleep(jitter(BACKOFFS_MS[attempt - 1] ?? 0));
					continue;
				}
				throw new WhatsappSendPermanentError(
					lastError.status,
					lastError.responseBody,
					lastError.metaCode,
					attempt
				);
			}

			// HTTP error
			if (err instanceof WhatsappSendError) {
				lastError = err;
				if (!isRetryable(err.status, err.metaCode)) {
					// Erro permanente / não-retentável (4xx, codes 131026/131047, etc.)
					throw new WhatsappSendPermanentError(
						err.status,
						err.responseBody,
						err.metaCode,
						attempt
					);
				}
				if (attempt < MAX_ATTEMPTS) {
					await sleep(jitter(BACKOFFS_MS[attempt - 1] ?? 0));
					continue;
				}
				throw new WhatsappSendPermanentError(
					err.status,
					err.responseBody,
					err.metaCode,
					attempt
				);
			}

			// Unknown error type — não retenta
			throw err;
		}
	}

	// Inalcançável, mas pro TS
	throw new WhatsappSendPermanentError(
		lastError?.status ?? 0,
		lastError?.responseBody ?? "unknown",
		lastError?.metaCode ?? null,
		MAX_ATTEMPTS
	);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function sendText(to: string, body: string): Promise<SendResult> {
	return await postMessage({
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to,
		type: "text",
		text: { body },
	});
}

export async function sendInteractive(
	to: string,
	interactive: InteractiveMessage["interactive"]
): Promise<SendResult> {
	return await postMessage({
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to,
		type: "interactive",
		interactive,
	});
}

export async function sendImage(
	to: string,
	link: string,
	caption?: string
): Promise<SendResult> {
	return await postMessage({
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to,
		type: "image",
		image: { link, ...(caption === undefined ? {} : { caption }) },
	});
}
