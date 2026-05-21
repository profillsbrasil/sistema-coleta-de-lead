import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
		NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.string().url(),
		GOOGLE_CLIENT_ID: z.string().min(1),
		GOOGLE_CLIENT_SECRET: z.string().min(1),
		SIGNUP_INVITE_CODE: z.string().min(1).optional(),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
		// WhatsApp Cloud API
		WHATSAPP_ACCESS_TOKEN: z.string().min(1),
		WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
		WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().min(1),
		WHATSAPP_APP_SECRET: z.string().min(1),
		WHATSAPP_VERIFY_TOKEN: z.string().min(1),
		WHATSAPP_API_VERSION: z.string().min(1).default("v25.0"),
		SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
		TERMS_VERSION: z.string().min(1).default("v1"),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
