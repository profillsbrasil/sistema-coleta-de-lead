-- Drop legado de scaffolding (tech-debt #24)
DROP TABLE IF EXISTS "user_roles" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "todo" CASCADE;--> statement-breakpoint
DROP TYPE IF EXISTS "public"."app_role";--> statement-breakpoint

-- Habilitar RLS (issue #20). Sem policies: default-deny via PostgREST/anon.
-- O app Drizzle conecta como role owner e tem bypass implícito de RLS.
ALTER TABLE "public"."leads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."verification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."signup_invite_rate_limit" ENABLE ROW LEVEL SECURITY;
