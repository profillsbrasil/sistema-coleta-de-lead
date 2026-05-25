CREATE TABLE IF NOT EXISTS "whatsapp"."config" (
	"id" integer PRIMARY KEY NOT NULL,
	"vendor_phone" text NOT NULL,
	"event_name" text NOT NULL,
	"event_start" date NOT NULL,
	"event_end" date NOT NULL,
	"raffle_date" date NOT NULL,
	"welcome_image_url" text,
	"logo_url" text,
	"instagram_profiles" jsonb NOT NULL,
	"official_post_url" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_user_id" uuid,
	CONSTRAINT "config_singleton" CHECK ("whatsapp"."config"."id" = 1)
);

INSERT INTO "whatsapp"."config" (
	"id", "vendor_phone", "event_name", "event_start", "event_end", "raffle_date",
	"welcome_image_url", "logo_url", "instagram_profiles", "official_post_url"
) VALUES (
	1,
	'5555996913627',
	'Sorteio Profills Fispal 2026',
	'2026-05-26',
	'2026-05-29',
	'2026-06-05',
	'https://lead.profills.com/whatsapp/banner-sorteio.png',
	'https://lead.profills.com/whatsapp/logo.png',
	'[
		{"handle": "@profillsdobrasil", "url": "https://instagram.com/profillsdobrasil"},
		{"handle": "@acarvalhovendas", "url": "https://instagram.com/acarvalhovendas"},
		{"handle": "@rafael_prachedes", "url": "https://instagram.com/rafael_prachedes"}
	]'::jsonb,
	'https://instagram.com/profillsdobrasil'
) ON CONFLICT (id) DO NOTHING;
