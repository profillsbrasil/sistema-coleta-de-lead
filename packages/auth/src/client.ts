import { env } from "@dashboard-leads-profills/env/server";
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
	return createBrowserClient(
		env.NEXT_PUBLIC_SUPABASE_URL,
		env.NEXT_PUBLIC_SUPABASE_ANON_KEY
	);
}
