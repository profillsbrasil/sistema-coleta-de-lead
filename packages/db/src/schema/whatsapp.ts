import {
	boolean,
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
		optedOutAt: timestamp("opted_out_at", {
			withTimezone: true,
			mode: "date",
		}),
		optedOutReason: text("opted_out_reason"),
		humanHandoffRequestedAt: timestamp("human_handoff_requested_at", {
			withTimezone: true,
			mode: "date",
		}),
		lastInboundAt: timestamp("last_inbound_at", {
			withTimezone: true,
			mode: "date",
		}),
		termsUrlSnapshot: text("terms_url_snapshot"),
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
		index("participants_opted_out_at_idx").on(table.optedOutAt),
		index("participants_handoff_at_idx").on(table.humanHandoffRequestedAt),
	]
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
		deliveredAt: timestamp("delivered_at", {
			withTimezone: true,
			mode: "date",
		}),
		readAt: timestamp("read_at", { withTimezone: true, mode: "date" }),
		failedAt: timestamp("failed_at", { withTimezone: true, mode: "date" }),
		failedCode: integer("failed_code"),
		failedReason: text("failed_reason"),
		pricingCategory: text("pricing_category"),
		pricingBillable: boolean("pricing_billable"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("messages_participant_id_idx").on(table.participantId),
		index("messages_wamid_idx").on(table.wamid),
		index("messages_failed_at_idx").on(table.failedAt),
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
		privacyPolicyUrl: text("privacy_policy_url"),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
		updatedByUserId: uuid("updated_by_user_id"),
	},
	(table) => [check("config_singleton", sql`${table.id} = 1`)]
);

export const alerts = whatsappSchema.table(
	"alerts",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		event: text("event").notNull(),
		severity: text("severity").notNull().default("info"),
		payload: jsonb("payload").notNull().default({}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		readAt: timestamp("read_at", { withTimezone: true, mode: "date" }),
	},
	(table) => [
		index("alerts_unread_idx")
			.on(table.createdAt)
			.where(sql`${table.readAt} IS NULL`),
		index("alerts_event_idx").on(table.event),
	]
);

export const healthSnapshots = whatsappSchema.table(
	"health_snapshots",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		capturedAt: timestamp("captured_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		qualityRating: text("quality_rating"),
		messagingLimitTier: text("messaging_limit_tier"),
		raw: jsonb("raw").notNull().default({}),
	},
	(table) => [
		index("health_snapshots_captured_at_idx").on(table.capturedAt),
	]
);

export const dsrAudit = whatsappSchema.table("dsr_audit", {
	id: uuid("id").defaultRandom().primaryKey(),
	waId: text("wa_id").notNull(),
	deletedByUserId: uuid("deleted_by_user_id"),
	deletedAt: timestamp("deleted_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	reason: text("reason"),
	participantSnapshot: jsonb("participant_snapshot"),
});
