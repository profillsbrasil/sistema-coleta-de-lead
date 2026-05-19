import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const signupInviteRateLimit = pgTable("signup_invite_rate_limit", {
	ip: text("ip").primaryKey(),
	count: integer("count").notNull(),
	resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});
