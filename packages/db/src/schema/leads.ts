import {
	bigserial,
	index,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const interestTagEnum = pgEnum("interest_tag", [
	"quente",
	"morno",
	"frio",
]);

export const followUpStatusEnum = pgEnum("follow_up_status", [
	"pendente",
	"contatado",
	"em_negociacao",
	"convertido",
	"perdido",
]);

export const leads = pgTable(
	"leads",
	{
		id: bigserial("id", { mode: "number" }).primaryKey(),
		localId: uuid("local_id").notNull().unique(),
		userId: uuid("user_id").notNull(),
		name: text("name").notNull(),
		phone: text("phone"),
		email: text("email"),
		company: text("company"),
		position: text("position"),
		segment: text("segment"),
		notes: text("notes"),
		interestTag: interestTagEnum("interest_tag").notNull(),
		followUpStatus: followUpStatusEnum("follow_up_status")
			.notNull()
			.default("pendente"),
		photoUrl: text("photo_url"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => [
		index("leads_user_id_idx").on(table.userId),
		index("leads_interest_tag_idx").on(table.interestTag),
		index("leads_updated_at_idx").on(table.updatedAt),
	]
);
