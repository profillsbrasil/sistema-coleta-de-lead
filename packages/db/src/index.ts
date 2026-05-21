import { env } from "@dashboard-leads-profills/env/server";
import { drizzle } from "drizzle-orm/node-postgres";

import { interestTagEnum, leads, signupInviteRateLimit } from "./schema";

export const db = drizzle(env.DATABASE_URL, {
	schema: { interestTagEnum, leads, signupInviteRateLimit },
});
