CREATE TABLE "synthesis" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"themes" text,
	"pain_points" text,
	"feature_requests" text,
	"consensus" text,
	"ai_summary" text,
	"interview_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "synthesis" ADD CONSTRAINT "synthesis_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "synthesis" ADD CONSTRAINT "synthesis_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "synthesis_project_id_idx" ON "synthesis" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "synthesis_user_id_idx" ON "synthesis" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "synthesis_user_project_uidx" ON "synthesis" USING btree ("user_id","project_id");