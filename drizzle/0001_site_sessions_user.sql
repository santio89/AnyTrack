TRUNCATE TABLE "site_sessions";
--> statement-breakpoint
ALTER TABLE "site_sessions" DROP CONSTRAINT "site_sessions_domain_unique";
--> statement-breakpoint
ALTER TABLE "site_sessions" ADD COLUMN "user_id" integer NOT NULL;
--> statement-breakpoint
ALTER TABLE "site_sessions" ADD CONSTRAINT "site_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "site_sessions_user_domain_idx" ON "site_sessions" USING btree ("user_id","domain");
