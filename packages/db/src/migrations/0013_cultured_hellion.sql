ALTER TABLE "whatsapp"."messages" ADD COLUMN "replay_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp"."messages" ADD COLUMN "replay_of_message_id" uuid;--> statement-breakpoint
CREATE INDEX "messages_replay_of_idx" ON "whatsapp"."messages" USING btree ("replay_of_message_id");