import { env } from "@dashboard-leads-profills/env/server";
import { drizzle } from "drizzle-orm/node-postgres";

import { appRoleEnum, interestTagEnum, leads, todo, userRoles } from "./schema";

export const db = drizzle(env.DATABASE_URL, {
	schema: { appRoleEnum, interestTagEnum, leads, todo, userRoles },
});
