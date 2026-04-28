import {
	computeInviteToken,
	INVITE_COOKIE_MAX_AGE,
	INVITE_COOKIE_NAME,
	timingSafeEqual,
} from "@dashboard-leads-profills/auth/invite-token";
import { env } from "@dashboard-leads-profills/env/server";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const attempts = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Request): string {
	const forwarded = req.headers.get("x-forwarded-for");
	if (forwarded) {
		return (forwarded.split(",")[0] ?? "").trim();
	}
	return req.headers.get("x-real-ip") ?? "unknown";
}

function checkRateLimit(ip: string): boolean {
	const now = Date.now();
	const entry = attempts.get(ip);
	if (!entry || entry.resetAt < now) {
		attempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
		return true;
	}
	if (entry.count >= RATE_LIMIT_MAX) {
		return false;
	}
	entry.count += 1;
	return true;
}

export async function POST(req: Request) {
	const inviteCode = env.SIGNUP_INVITE_CODE;
	if (!inviteCode) {
		return Response.json(
			{ error: "Signup por convite indisponível neste ambiente." },
			{ status: 503 }
		);
	}

	const ip = getClientIp(req);
	if (!checkRateLimit(ip)) {
		return Response.json(
			{ error: "Muitas tentativas. Tente novamente em 1 minuto." },
			{ status: 429 }
		);
	}

	let body: unknown;
	try {
		body = await req.json();
	} catch {
		return Response.json({ error: "Body inválido." }, { status: 400 });
	}

	const code =
		body && typeof body === "object" && "code" in body
			? String((body as { code: unknown }).code ?? "")
			: "";

	if (!code) {
		return Response.json({ error: "Código obrigatório." }, { status: 400 });
	}

	if (!timingSafeEqual(code, inviteCode)) {
		return Response.json({ error: "Código inválido." }, { status: 401 });
	}

	const token = await computeInviteToken(inviteCode, env.BETTER_AUTH_SECRET);

	const isProd = env.NODE_ENV === "production";
	const cookie = [
		`${INVITE_COOKIE_NAME}=${token}`,
		"HttpOnly",
		"Path=/",
		"SameSite=Lax",
		`Max-Age=${INVITE_COOKIE_MAX_AGE}`,
		isProd ? "Secure" : "",
	]
		.filter(Boolean)
		.join("; ");

	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			"Set-Cookie": cookie,
		},
	});
}
