import {
	check,
	date,
	index,
	integer,
	jsonb,
	pgSchema,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
		retryCount: integer("retry_count").notNull().default(0),
		redirectSentAt: timestamp("redirect_sent_at", {
			withTimezone: true,
			mode: "date",
		}),
		redirectCount: integer("redirect_count").notNull().default(0),
		lastResponseAt: timestamp("last_response_at", {
			withTimezone: true,
			mode: "date",
		}),
		taskProgress: jsonb("task_progress")
			.$type<{
				follow_1: boolean;
				follow_2: boolean;
				follow_3: boolean;
				comment: boolean;
			}>()
			.notNull()
			.default({
				follow_1: false,
				follow_2: false,
				follow_3: false,
				comment: false,
			}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [index("participants_state_idx").on(table.state)]
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
	]
);

export const rateLimit = whatsappSchema.table("rate_limit", {
	waId: text("wa_id").primaryKey(),
	count: integer("count").notNull(),
	resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

export const config = whatsappSchema.table(
	"config",
	{
		id: integer("id").primaryKey(),
		vendorPhone: text("vendor_phone").notNull(),
		eventName: text("event_name").notNull(),
		eventStart: date("event_start", { mode: "string" }).notNull(),
		eventEnd: date("event_end", { mode: "string" }).notNull(),
		raffleDate: date("raffle_date", { mode: "string" }).notNull(),
		welcomeImageUrl: text("welcome_image_url"),
		logoUrl: text("logo_url"),
		instagramProfiles: jsonb("instagram_profiles")
			.$type<Array<{ handle: string; url: string }>>()
			.notNull(),
		officialPostUrl: text("official_post_url").notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
		updatedByUserId: uuid("updated_by_user_id"),
	},
	(table) => [check("config_singleton", sql`${table.id} = 1`)]
);
