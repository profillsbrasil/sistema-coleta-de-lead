import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	client: {
		NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
		NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
		NEXT_PUBLIC_BETTER_AUTH_URL: z.string().url(),
		NEXT_PUBLIC_EVENT_END: z.string().optional(),
		NEXT_PUBLIC_EVENT_NAME: z.string().min(1).optional(),
		NEXT_PUBLIC_EVENT_WHATSAPP_NUMBER: z.string().min(1).optional(),
		NEXT_PUBLIC_RAFFLE_DATE: z.string().min(1).optional(),
		NEXT_PUBLIC_WHATSAPP_WELCOME_IMAGE_URL: z.string().url().optional(),
	},
	runtimeEnv: {
		NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
		NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		NEXT_PUBLIC_BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
		NEXT_PUBLIC_EVENT_END: process.env.NEXT_PUBLIC_EVENT_END,
		NEXT_PUBLIC_EVENT_NAME: process.env.NEXT_PUBLIC_EVENT_NAME,
		NEXT_PUBLIC_EVENT_WHATSAPP_NUMBER:
			process.env.NEXT_PUBLIC_EVENT_WHATSAPP_NUMBER,
		NEXT_PUBLIC_RAFFLE_DATE: process.env.NEXT_PUBLIC_RAFFLE_DATE,
		NEXT_PUBLIC_WHATSAPP_WELCOME_IMAGE_URL:
			process.env.NEXT_PUBLIC_WHATSAPP_WELCOME_IMAGE_URL,
	},
	emptyStringAsUndefined: true,
});
