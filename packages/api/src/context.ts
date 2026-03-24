import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

export async function createContext(req: NextRequest) {
	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return req.cookies.getAll();
				},
				setAll() {
					// tRPC route handler nao precisa setar cookies
					// proxy.ts ja cuida do refresh
				},
			},
		}
	);

	const { data } = await supabase.auth.getClaims();
	const claims = data?.claims as Record<string, unknown> | null;

	return {
		supabase,
		user: claims ?? null,
		userRole: (claims?.user_role as string) ?? null,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
