import { db } from "@dashboard-leads-profills/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { admin } from "better-auth/plugins";
import {
	computeInviteToken,
	INVITE_COOKIE_NAME,
	timingSafeEqual,
} from "./invite-token";
// biome-ignore lint/performance/noNamespaceImport: required by Better Auth drizzleAdapter schema option
import * as authSchema from "./schema";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: authSchema,
	}),
	baseURL: process.env.BETTER_AUTH_URL,
	secret: process.env.BETTER_AUTH_SECRET,
	emailAndPassword: {
		enabled: true,
		autoSignIn: true,
		requireEmailVerification: false,
		minPasswordLength: 6,
	},
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID ?? "",
			clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
		},
	},
	user: {
		additionalFields: {
			role: {
				type: "string",
				defaultValue: "vendedor",
				input: false,
			},
		},
	},
	plugins: [
		admin({
			defaultRole: "vendedor",
			adminRoles: ["admin"],
		}),
	],
	session: {
		expiresIn: 60 * 60 * 24 * 30,
		updateAge: 60 * 60 * 24,
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60,
		},
	},
	databaseHooks: {
		user: {
			create: {
				before: async (_user, ctx) => {
					if (ctx?.path?.startsWith("/admin/")) {
						return;
					}
					const inviteCode = process.env.SIGNUP_INVITE_CODE ?? "";
					const secret = process.env.BETTER_AUTH_SECRET ?? "";
					if (!(inviteCode && secret)) {
						throw new APIError("INTERNAL_SERVER_ERROR", {
							message: "Servidor mal configurado (invite gate).",
						});
					}
					const token =
						ctx?.getCookie?.(INVITE_COOKIE_NAME) ??
						ctx?.request?.headers
							?.get("cookie")
							?.split(";")
							.map((s: string) => s.trim())
							.find((s: string) => s.startsWith(`${INVITE_COOKIE_NAME}=`))
							?.slice(INVITE_COOKIE_NAME.length + 1) ??
						"";
					const expected = await computeInviteToken(inviteCode, secret);
					if (!(token && timingSafeEqual(token, expected))) {
						throw new APIError("BAD_REQUEST", {
							message: "invite_required",
						});
					}
				},
				// biome-ignore lint/suspicious/useAwait: Better Auth expects a Promise-returning hook signature
				after: async (_user, ctx) => {
					ctx?.setCookie?.(INVITE_COOKIE_NAME, "", { maxAge: 0, path: "/" });
				},
			},
		},
	},
	trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3001"],
	advanced: {
		database: {
			generateId: false,
		},
	},
});

export type Session = typeof auth.$Infer.Session;
