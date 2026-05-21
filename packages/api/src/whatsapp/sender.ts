import { env } from "@dashboard-leads-profills/env/server";
import type { InteractiveMessage } from "./messages.ts";

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class WhatsappSendError extends Error {
	status: number;
	responseBody: string;

	constructor(status: number, responseBody: string) {
		super(`WhatsApp API error ${status}: ${responseBody}`);
		this.name = "WhatsappSendError";
		this.status = status;
		this.responseBody = responseBody;
	}
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type SendResult = { wamid: string };

function apiUrl(): string {
	return `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
}

function headers(): Record<string, string> {
	return {
		Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
		"Content-Type": "application/json",
	};
}

async function postMessage(body: unknown): Promise<SendResult> {
	const response = await fetch(apiUrl(), {
		method: "POST",
		headers: headers(),
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new WhatsappSendError(response.status, text);
	}

	const data = (await response.json()) as { messages: Array<{ id: string }> };
	const wamid = data.messages[0]?.id;
	if (!wamid) {
		throw new WhatsappSendError(200, "Response missing messages[0].id");
	}
	return { wamid };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function sendText(to: string, body: string): Promise<SendResult> {
	return postMessage({
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to,
		type: "text",
		text: { body },
	});
}

export async function sendInteractive(
	to: string,
	interactive: InteractiveMessage["interactive"],
): Promise<SendResult> {
	return postMessage({
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
	caption?: string,
): Promise<SendResult> {
	return postMessage({
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to,
		type: "image",
		image: { link, ...(caption !== undefined ? { caption } : {}) },
	});
}
