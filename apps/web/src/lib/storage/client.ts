import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase Storage client — auth da app vem do Better Auth; este client serve
 * apenas para `storage.from(...)` do bucket `lead-photos`. Não usa sessão.
 * Singleton lazy para evitar múltiplas instâncias de GoTrueClient na mesma
 * storage key quando `syncCycle` roda periodicamente.
 */
let cached: SupabaseClient | null = null;

export function createStorageClient(): SupabaseClient {
	if (cached) {
		return cached;
	}
	cached = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			auth: { persistSession: false, autoRefreshToken: false },
		},
	);
	return cached;
}
