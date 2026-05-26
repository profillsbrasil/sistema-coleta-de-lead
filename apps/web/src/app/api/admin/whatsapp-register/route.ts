import { auth } from "@dashboard-leads-profills/auth";
import { env } from "@dashboard-leads-profills/env/server";

export async function POST(req: Request): Promise<Response> {
	const session = await auth.api.getSession({ headers: req.headers });
	if (!session || session.user.role !== "admin") {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body: unknown = await req.json().catch(() => ({}));
	const requestedPin =
		typeof body === "object" && body !== null && "pin" in body
			? String((body as { pin: unknown }).pin ?? "")
			: "";
	const pin =
		/^\d{6}$/.test(requestedPin)
			? requestedPin
			: String(Math.floor(100000 + Math.random() * 900000));

	const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/register`;

	const response = await fetch(url, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			messaging_product: "whatsapp",
			pin,
		}),
	});

	const text = await response.text();
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		parsed = text;
	}

	return Response.json({
		status: response.status,
		ok: response.ok,
		pin: response.ok ? pin : undefined,
		response: parsed,
	});
}
