CREATE TABLE "signup_invite_rate_limit" (
	"ip" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
