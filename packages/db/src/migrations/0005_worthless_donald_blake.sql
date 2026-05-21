CREATE SCHEMA "whatsapp";
--> statement-breakpoint
CREATE TABLE "whatsapp"."messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"direction" text NOT NULL,
	"wamid" text,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_wamid_unique" UNIQUE("wamid")
);
--> statement-breakpoint
CREATE TABLE "whatsapp"."participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wa_id" text NOT NULL,
	"state" text DEFAULT 'NEW' NOT NULL,
	"name" text,
	"company" text,
	"raffle_code" text,
	"consent_at" timestamp with time zone,
	"declined_at" timestamp with time zone,
	"terms_version" text,
	"winner_of" text,
	"winner_at" timestamp with time zone,
	"notified_at" timestamp with time zone,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participants_wa_id_unique" UNIQUE("wa_id"),
	CONSTRAINT "participants_raffle_code_unique" UNIQUE("raffle_code")
);
--> statement-breakpoint
CREATE TABLE "whatsapp"."rate_limit" (
	"wa_id" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "whatsapp"."messages" ADD CONSTRAINT "messages_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "whatsapp"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_participant_id_idx" ON "whatsapp"."messages" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "messages_wamid_idx" ON "whatsapp"."messages" USING btree ("wamid");--> statement-breakpoint
CREATE INDEX "participants_state_idx" ON "whatsapp"."participants" USING btree ("state");--> statement-breakpoint
CREATE INDEX "participants_winner_of_idx" ON "whatsapp"."participants" USING btree ("winner_of");--> statement-breakpoint
ALTER TABLE "whatsapp"."participants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "whatsapp"."messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "whatsapp"."rate_limit" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "winner_of_unique" ON "whatsapp"."participants" ("winner_of") WHERE "winner_of" IS NOT NULL;