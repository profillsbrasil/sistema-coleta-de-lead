import {
	index,
	integer,
	jsonb,
	pgSchema,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const whatsappSchema = pgSchema("whatsapp");

export const participants = whatsappSchema.table(
	"participants",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		waId: text("wa_id").notNull().unique(),
		state: text("state").notNull().default("NEW"),
		name: text("name"),
		company: text("company"),
		raffleCode: text("raffle_code").unique(),
		consentAt: timestamp("consent_at", {
			withTimezone: true,
			mode: "date",
		}),
		declinedAt: timestamp("declined_at", {
			withTimezone: true,
			mode: "date",
		}),
		termsVersion: text("terms_version"),
		winnerOf: text("winner_of"),
		winnerAt: timestamp("winner_at", {
			withTimezone: true,
			mode: "date",
		}),
		notifiedAt: timestamp("notified_at", {
			withTimezone: true,
			mode: "date",
		}),
		retryCount: integer("retry_count").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index("participants_state_idx").on(table.state),
		index("participants_winner_of_idx").on(table.winnerOf),
	],
);

export const messages = whatsappSchema.table(
	"messages",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		participantId: uuid("participant_id")
			.notNull()
			.references(() => participants.id, { onDelete: "cascade" }),
		direction: text("direction").notNull(),
		wamid: text("wamid").unique(),
		type: text("type").notNull(),
		payload: jsonb("payload").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("messages_participant_id_idx").on(table.participantId),
		index("messages_wamid_idx").on(table.wamid),
	],
);

export const rateLimit = whatsappSchema.table("rate_limit", {
	waId: text("wa_id").primaryKey(),
	count: integer("count").notNull(),
	resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});
