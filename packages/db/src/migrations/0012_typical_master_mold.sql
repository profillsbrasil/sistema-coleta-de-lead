CREATE TABLE "whatsapp"."alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "whatsapp"."dsr_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wa_id" text NOT NULL,
	"deleted_by_user_id" uuid,
	"deleted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text,
	"participant_snapshot" jsonb
);
--> statement-breakpoint
CREATE TABLE "whatsapp"."health_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"quality_rating" text,
	"messaging_limit_tier" text,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "whatsapp"."config" ADD COLUMN "privacy_policy_url" text;--> statement-breakpoint
ALTER TABLE "whatsapp"."messages" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "whatsapp"."messages" ADD COLUMN "read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "whatsapp"."messages" ADD COLUMN "failed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "whatsapp"."messages" ADD COLUMN "failed_code" integer;--> statement-breakpoint
ALTER TABLE "whatsapp"."messages" ADD COLUMN "failed_reason" text;--> statement-breakpoint
ALTER TABLE "whatsapp"."messages" ADD COLUMN "pricing_category" text;--> statement-breakpoint
ALTER TABLE "whatsapp"."messages" ADD COLUMN "pricing_billable" boolean;--> statement-breakpoint
ALTER TABLE "whatsapp"."participants" ADD COLUMN "opted_out_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "whatsapp"."participants" ADD COLUMN "opted_out_reason" text;--> statement-breakpoint
ALTER TABLE "whatsapp"."participants" ADD COLUMN "human_handoff_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "whatsapp"."participants" ADD COLUMN "last_inbound_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "whatsapp"."participants" ADD COLUMN "terms_url_snapshot" text;--> statement-breakpoint
CREATE INDEX "alerts_unread_idx" ON "whatsapp"."alerts" USING btree ("created_at") WHERE "whatsapp"."alerts"."read_at" IS NULL;--> statement-breakpoint
CREATE INDEX "alerts_event_idx" ON "whatsapp"."alerts" USING btree ("event");--> statement-breakpoint
CREATE INDEX "health_snapshots_captured_at_idx" ON "whatsapp"."health_snapshots" USING btree ("captured_at");--> statement-breakpoint
CREATE INDEX "messages_failed_at_idx" ON "whatsapp"."messages" USING btree ("failed_at");--> statement-breakpoint
CREATE INDEX "participants_opted_out_at_idx" ON "whatsapp"."participants" USING btree ("opted_out_at");--> statement-breakpoint
CREATE INDEX "participants_handoff_at_idx" ON "whatsapp"."participants" USING btree ("human_handoff_requested_at");--> statement-breakpoint
ALTER TABLE "whatsapp"."alerts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "whatsapp"."health_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "whatsapp"."dsr_audit" ENABLE ROW LEVEL SECURITY;