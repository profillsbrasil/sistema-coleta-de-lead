import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_EXACT = new Set(["/", "/login", "/offline", "/sw.js"]);
const PUBLIC_PREFIXES = ["/api/auth"];

export default function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl;

	if (PUBLIC_EXACT.has(pathname)) return NextResponse.next();
	if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
		return NextResponse.next();
	}
	if (pathname.startsWith("/api/")) return NextResponse.next();

	const cookie = getSessionCookie(req);
	if (!cookie) {
		const url = req.nextUrl.clone();
		url.pathname = "/login";
		return NextResponse.redirect(url);
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|icon.png|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
