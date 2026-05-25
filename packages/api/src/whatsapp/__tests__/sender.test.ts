import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@dashboard-leads-profills/env/server", () => ({
	env: {
		WHATSAPP_ACCESS_TOKEN: "test-token",
		WHATSAPP_PHONE_NUMBER_ID: "1234567890",
		WHATSAPP_API_VERSION: "v25.0",
	},
}));

const EXPECTED_URL = "https://graph.facebook.com/v25.0/1234567890/messages";
const EXPECTED_AUTH = "Bearer test-token";

function makeFetchOk(wamid = "wamid.ABCDEF") {
	return vi.fn().mockResolvedValue({
		ok: true,
		json: () => Promise.resolve({ messages: [{ id: wamid }] }),
	});
}

function makeFetchError(status: number, body: string) {
	return vi.fn().mockResolvedValue({
		ok: false,
		status,
		text: () => Promise.resolve(body),
	});
}

import {
	sendImage,
	sendInteractive,
	sendText,
	WhatsappSendError,
	WhatsappSendPermanentError,
} from "../sender";

describe("sendText", () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	it("builds correct payload and hits the correct URL", async () => {
		const fetchMock = makeFetchOk();
		vi.stubGlobal("fetch", fetchMock);

		const result = await sendText("5511999990000", "Olá!");

		expect(fetchMock).toHaveBeenCalledOnce();
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe(EXPECTED_URL);
		expect(init.method).toBe("POST");

		const payload = JSON.parse(init.body as string);
		expect(payload).toMatchObject({
			messaging_product: "whatsapp",
			recipient_type: "individual",
			to: "5511999990000",
			type: "text",
			text: { body: "Olá!" },
		});

		expect(result).toEqual({ wamid: "wamid.ABCDEF" });
	});

	it("sets Authorization header", async () => {
		vi.stubGlobal("fetch", makeFetchOk());

		await sendText("5511999990000", "test");

		const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
		const authHeader = (init.headers as Record<string, string>).Authorization;
		expect(authHeader).toBe(EXPECTED_AUTH);
	});

	it("returns the wamid from the first message", async () => {
		vi.stubGlobal("fetch", makeFetchOk("wamid.XYZ123"));

		const result = await sendText("5511999990000", "test");
		expect(result.wamid).toBe("wamid.XYZ123");
	});
});

describe("sendInteractive", () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	it("passes the interactive object verbatim in payload", async () => {
		vi.stubGlobal("fetch", makeFetchOk());

		const interactive = {
			type: "button" as const,
			body: { text: "Participe?" },
			action: {
				buttons: [
					{ type: "reply" as const, reply: { id: "accept", title: "Aceito" } },
				],
			},
		};

		await sendInteractive("5511999990000", interactive);

		const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
		const payload = JSON.parse(init.body as string);
		expect(payload).toMatchObject({
			messaging_product: "whatsapp",
			type: "interactive",
			to: "5511999990000",
			interactive,
		});
	});
});

describe("sendImage", () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	it("includes link in payload and omits caption when not provided", async () => {
		vi.stubGlobal("fetch", makeFetchOk());

		await sendImage("5511999990000", "https://example.com/photo.jpg");

		const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
		const payload = JSON.parse(init.body as string);
		expect(payload).toMatchObject({
			messaging_product: "whatsapp",
			type: "image",
			to: "5511999990000",
			image: { link: "https://example.com/photo.jpg" },
		});
		expect(payload.image.caption).toBeUndefined();
	});

	it("includes caption when provided", async () => {
		vi.stubGlobal("fetch", makeFetchOk());

		await sendImage(
			"5511999990000",
			"https://example.com/photo.jpg",
			"Veja nossa oferta!"
		);

		const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
		const payload = JSON.parse(init.body as string);
		expect(payload.image.caption).toBe("Veja nossa oferta!");
	});
});

describe("WhatsappSendError", () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	it("throws WhatsappSendError with correct status and body on 4xx", async () => {
		vi.stubGlobal("fetch", makeFetchError(400, '{"error":"invalid phone"}'));

		await expect(sendText("bad-number", "test")).rejects.toThrow(
			WhatsappSendError
		);

		try {
			await sendText("bad-number", "test");
		} catch (err) {
			expect(err).toBeInstanceOf(WhatsappSendError);
			const sendErr = err as WhatsappSendError;
			expect(sendErr.status).toBe(400);
			expect(sendErr.responseBody).toBe('{"error":"invalid phone"}');
		}
	});

	it("5xx é retentável: após 3 tentativas joga WhatsappSendPermanentError", async () => {
		vi.useFakeTimers();
		const fetchMock = makeFetchError(503, "Service Unavailable");
		vi.stubGlobal("fetch", fetchMock);

		const handler = vi.fn();
		const promise = sendText("5511999990000", "test").catch(handler);
		// Avança backoffs (500 + 1500 + 4500 + folga jitter)
		await vi.advanceTimersByTimeAsync(10_000);
		await promise;

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0]?.[0]).toBeInstanceOf(WhatsappSendPermanentError);
		expect(fetchMock).toHaveBeenCalledTimes(3);
		vi.useRealTimers();
	});

	it("4xx não-retentável: 1 tentativa só → WhatsappSendPermanentError", async () => {
		const fetchMock = makeFetchError(404, '{"error":{"code":131026}}');
		vi.stubGlobal("fetch", fetchMock);

		await expect(sendText("5511999990000", "test")).rejects.toThrow(
			WhatsappSendPermanentError
		);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("Meta code 130429 (rate limit) é retentável", async () => {
		vi.useFakeTimers();
		const fetchMock = makeFetchError(400, '{"error":{"code":130429}}');
		vi.stubGlobal("fetch", fetchMock);

		const handler = vi.fn();
		const promise = sendText("5511999990000", "test").catch(handler);
		await vi.advanceTimersByTimeAsync(10_000);
		await promise;

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0]?.[0]).toBeInstanceOf(WhatsappSendPermanentError);
		expect(fetchMock).toHaveBeenCalledTimes(3);
		vi.useRealTimers();
	});

	it("Sucesso na 2ª tentativa após 1 falha 5xx", async () => {
		vi.useFakeTimers();
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({
				ok: false,
				status: 502,
				text: () => Promise.resolve("Bad Gateway"),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ messages: [{ id: "wamid.OK" }] }),
			});
		vi.stubGlobal("fetch", fetchMock);

		const promise = sendText("5511999990000", "test");
		await vi.advanceTimersByTimeAsync(1_000);

		const result = await promise;
		expect(result.wamid).toBe("wamid.OK");
		expect(fetchMock).toHaveBeenCalledTimes(2);
		vi.useRealTimers();
	});
});
