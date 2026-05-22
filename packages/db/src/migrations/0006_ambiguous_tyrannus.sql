DROP INDEX IF EXISTS "whatsapp"."winner_of_unique";--> statement-breakpoint
DROP INDEX "whatsapp"."participants_winner_of_idx";--> statement-breakpoint
ALTER TABLE "whatsapp"."participants" DROP COLUMN "winner_of";--> statement-breakpoint
ALTER TABLE "whatsapp"."participants" DROP COLUMN "winner_at";--> statement-breakpoint
ALTER TABLE "whatsapp"."participants" DROP COLUMN "notified_at";