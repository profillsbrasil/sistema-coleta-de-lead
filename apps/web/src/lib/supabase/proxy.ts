import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const PROXY_BYPASS_PREFIXES = ["/api"] as const;
const PUBLIC_EXACT_PATHS = new Set(["/", "/offline", "/sw.js"]);
const PUBLIC_PREFIXES = ["/auth", "/login"] as const;

function getRequiredEnv(
	name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}

	return value;
}

function matchesPrefix(pathname: string, prefix: string) {
	return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function shouldBypassSessionProxy(pathname: string) {
	return PROXY_BYPASS_PREFIXES.some((prefix) =>
		matchesPrefix(pathname, prefix)
	);
}

export function isPublicPath(pathname: string) {
	if (PUBLIC_EXACT_PATHS.has(pathname)) {
		return true;
	}

	return PUBLIC_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

export async function updateSession(request: NextRequest) {
	if (shouldBypassSessionProxy(request.nextUrl.pathname)) {
		return NextResponse.next({ request });
	}

	let supabaseResponse = NextResponse.next({ request });

	const supabase = createServerClient(
		getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
		getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					for (const { name, value } of cookiesToSet) {
						request.cookies.set(name, value);
					}
					supabaseResponse = NextResponse.next({ request });
					for (const { name, value, options } of cookiesToSet) {
						supabaseResponse.cookies.set(name, value, options);
					}
				},
			},
		}
	);

	// CRITICO: nao rodar nada entre createServerClient e getClaims()
	const { data } = await supabase.auth.getClaims();
	const user = data?.claims;

	// Redirecionar nao-autenticados para /login apenas em rotas privadas.
	if (!(user || isPublicPath(request.nextUrl.pathname))) {
		const url = request.nextUrl.clone();
		url.pathname = "/login";
		return NextResponse.redirect(url);
	}

	return supabaseResponse;
}
