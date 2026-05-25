import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	client: {
		NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
		NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
		NEXT_PUBLIC_BETTER_AUTH_URL: z.string().url(),
		NEXT_PUBLIC_EVENT_END: z.string().optional(),
		NEXT_PUBLIC_EVENT_WHATSAPP_NUMBER: z.string().min(1).optional(),
		// raffle date, event name, logo e welcome image agora moram em
		// whatsapp.config (DB, editável via /admin/whatsapp).
	},
	runtimeEnv: {
		NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
		NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		NEXT_PUBLIC_BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
		NEXT_PUBLIC_EVENT_END: process.env.NEXT_PUBLIC_EVENT_END,
		NEXT_PUBLIC_EVENT_WHATSAPP_NUMBER:
			process.env.NEXT_PUBLIC_EVENT_WHATSAPP_NUMBER,
	},
	emptyStringAsUndefined: true,
});
