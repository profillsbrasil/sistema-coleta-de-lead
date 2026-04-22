export const INVITE_COOKIE_NAME = "signup_invite_token";
export const INVITE_COOKIE_MAX_AGE = 15 * 60;

const B64_PLUS = /\+/g;
const B64_SLASH = /\//g;
const B64_PAD = /=+$/;

function toBase64Url(bytes: ArrayBuffer): string {
	const bin = String.fromCharCode(...new Uint8Array(bytes));
	return btoa(bin)
		.replace(B64_PLUS, "-")
		.replace(B64_SLASH, "_")
		.replace(B64_PAD, "");
}

export async function computeInviteToken(
	code: string,
	secret: string
): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"]
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(code)
	);
	return toBase64Url(signature);
}

export function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) {
		return false;
	}
	let diff = 0;
	for (let i = 0; i < a.length; i++) {
		// biome-ignore lint/suspicious/noBitwiseOperators: constant-time string compare requires bitwise XOR/OR
		diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return diff === 0;
}
