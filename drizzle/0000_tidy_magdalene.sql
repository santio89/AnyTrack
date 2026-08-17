CREATE TABLE "logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tracker_id" integer NOT NULL,
	"extracted_value" text,
	"confidence" double precision,
	"model" text,
	"error" text,
	"screenshot_path" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"storage_state" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "site_sessions_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "trackers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"url" text NOT NULL,
	"target_description" text NOT NULL,
	"reference_image_path" text,
	"reference_image_paths" text,
	"frequency_minutes" integer DEFAULT 60 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"notify_on_change" boolean DEFAULT false NOT NULL,
	"notification_email" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"image" text,
	"google_id" text,
	"clerk_id" text,
	"ai_provider" text,
	"ai_api_key_encrypted" text,
	"ai_fallback_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id"),
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_tracker_id_trackers_id_fk" FOREIGN KEY ("tracker_id") REFERENCES "public"."trackers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trackers" ADD CONSTRAINT "trackers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;