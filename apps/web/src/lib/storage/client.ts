import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Storage client — auth da app vem do Better Auth; este client serve
 * apenas para `storage.from(...)` do bucket `lead-photos`. Não usa sessão.
 */
export function createStorageClient() {
	return createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
		{
			auth: { persistSession: false, autoRefreshToken: false },
		},
	);
}
