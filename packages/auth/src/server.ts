import { env } from "@dashboard-leads-profills/env/server";
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";

export function createServerClient(cookieStore: {
	getAll(): Array<{ name: string; value: string }>;
	set(name: string, value: string, options?: Record<string, unknown>): void;
}) {
	return createSupabaseServerClient(
		env.NEXT_PUBLIC_SUPABASE_URL,
		env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll();
				},
				setAll(cookiesToSet) {
					try {
						for (const { name, value, options } of cookiesToSet) {
							cookieStore.set(name, value, options as Record<string, unknown>);
						}
					} catch {
						// Ignoravel se chamado de Server Component
					}
				},
			},
		}
	);
}
