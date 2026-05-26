import { auth } from "@dashboard-leads-profills/auth";
import { env } from "@dashboard-leads-profills/env/server";

async function callGraph(
	method: "GET" | "POST" | "DELETE",
	path: string,
	body?: Record<string, unknown>
): Promise<{ status: number; ok: boolean; response: unknown }> {
	const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${path}`;
	const init: RequestInit = {
		method,
		headers: {
			Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
			"Content-Type": "application/json",
		},
	};
	if (body) init.body = JSON.stringify(body);
	const response = await fetch(url, init);
	const text = await response.text();
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		parsed = text;
	}
	return { status: response.status, ok: response.ok, response: parsed };
}

export async function POST(req: Request): Promise<Response> {
	const session = await auth.api.getSession({ headers: req.headers });
	if (!session || session.user.role !== "admin") {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body: unknown = await req.json().catch(() => ({}));
	const action =
		typeof body === "object" && body !== null && "action" in body
			? String((body as { action: unknown }).action ?? "register")
			: "register";

	if (action === "subscribe") {
		const result = await callGraph(
			"POST",
			`${env.WHATSAPP_BUSINESS_ACCOUNT_ID}/subscribed_apps`
		);
		return Response.json({ action, ...result });
	}

	if (action === "list_subscribed") {
		const result = await callGraph(
			"GET",
			`${env.WHATSAPP_BUSINESS_ACCOUNT_ID}/subscribed_apps`
		);
		return Response.json({ action, ...result });
	}

	if (action === "phone_info") {
		const result = await callGraph(
			"GET",
			`${env.WHATSAPP_PHONE_NUMBER_ID}?fields=display_phone_number,verified_name,quality_rating,status,messaging_limit_tier`
		);
		return Response.json({ action, ...result });
	}

	// default: register
	const requestedPin =
		typeof body === "object" && body !== null && "pin" in body
			? String((body as { pin: unknown }).pin ?? "")
			: "";
	const pin = /^\d{6}$/.test(requestedPin)
		? requestedPin
		: String(Math.floor(100000 + Math.random() * 900000));

	const result = await callGraph(
		"POST",
		`${env.WHATSAPP_PHONE_NUMBER_ID}/register`,
		{ messaging_product: "whatsapp", pin }
	);

	return Response.json({
		action: "register",
		...result,
		pin: result.ok ? pin : undefined,
	});
}
