ALTER TABLE "competitor" DROP CONSTRAINT "competitor_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "competitor" ADD CONSTRAINT "competitor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "synthesis" DROP CONSTRAINT "synthesis_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "synthesis" ADD CONSTRAINT "synthesis_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
