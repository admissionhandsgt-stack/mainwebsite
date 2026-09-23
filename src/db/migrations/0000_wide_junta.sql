CREATE TYPE "public"."level" AS ENUM('ug', 'pg');--> statement-breakpoint
CREATE TYPE "public"."ownership" AS ENUM('government', 'private', 'deemed', 'central', 'aiims', 'jipmer', 'esic', 'other');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(48) NOT NULL,
	"label" text NOT NULL,
	"vertical_category" text,
	"is_pwd" boolean DEFAULT false NOT NULL,
	"scheme" text
);
--> statement-breakpoint
CREATE TABLE "closing_ranks" (
	"id" serial PRIMARY KEY NOT NULL,
	"level" "level" NOT NULL,
	"counselling_id" integer,
	"institute_id" integer,
	"course_id" integer,
	"quota_id" integer,
	"category_id" integer,
	"year" smallint NOT NULL,
	"round" smallint,
	"round_label" varchar(24),
	"closing_rank" integer,
	"ai_rank" integer,
	"counselling_rank" integer,
	"seats_allotted" integer,
	"fee_inr" real,
	"bond_years" real,
	"low_confidence" boolean DEFAULT false NOT NULL,
	"rank_basis" text,
	"extracted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "counsellings" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer,
	"name" text NOT NULL,
	"slug" varchar(120) NOT NULL,
	"level" "level" NOT NULL,
	"state_group" text,
	"state_id" integer,
	"authority" text
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer,
	"name" text NOT NULL,
	"short_name" text,
	"slug" varchar(160) NOT NULL,
	"level" "level" NOT NULL,
	"degree_type" text,
	"course_type" text,
	"branch_group" text,
	"duration_years" real
);
--> statement-breakpoint
CREATE TABLE "fees" (
	"id" serial PRIMARY KEY NOT NULL,
	"level" "level" NOT NULL,
	"institute_id" integer,
	"course_id" integer,
	"quota_id" integer,
	"counselling_id" integer,
	"fee_session" text,
	"fee_inr" real,
	"fee_periodicity" text,
	"fee_usd" real,
	"fee_null_reason" text,
	"hostel_min_inr" real,
	"hostel_max_inr" real,
	"hostel_note" text,
	"stipend_y1_inr" real,
	"stipend_y2_inr" real,
	"stipend_y3_inr" real,
	"stipend_periodicity" text,
	"stipend_note" text,
	"bond_years" real,
	"bond_penalty_inr" real,
	"bond_note" text,
	"year" smallint,
	"is_carried_forward" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institutes" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer,
	"name" text NOT NULL,
	"short_name" text,
	"slug" varchar(180) NOT NULL,
	"level" "level" NOT NULL,
	"ownership" "ownership" DEFAULT 'other' NOT NULL,
	"state_id" integer,
	"district" text,
	"city" text,
	"university" text,
	"management" text,
	"established_year" smallint,
	"beds" integer,
	"seats_total" integer,
	"branch_count" smallint,
	"mbbs_intake" integer,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"phone" varchar(24) NOT NULL,
	"email" text,
	"level" "level",
	"rank" integer,
	"category" text,
	"home_state" text,
	"message" text,
	"source" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"link_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"media_key" varchar(120) NOT NULL,
	"title" text,
	"image_url" text NOT NULL,
	"mobile_image_url" text,
	"alt_text" text,
	"section_type" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotas" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(48) NOT NULL,
	"label" text NOT NULL,
	"master_quota" text
);
--> statement-breakpoint
CREATE TABLE "states" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(64) NOT NULL,
	"short_code" varchar(8),
	"rules" text
);
--> statement-breakpoint
ALTER TABLE "closing_ranks" ADD CONSTRAINT "closing_ranks_counselling_id_counsellings_id_fk" FOREIGN KEY ("counselling_id") REFERENCES "public"."counsellings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closing_ranks" ADD CONSTRAINT "closing_ranks_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closing_ranks" ADD CONSTRAINT "closing_ranks_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closing_ranks" ADD CONSTRAINT "closing_ranks_quota_id_quotas_id_fk" FOREIGN KEY ("quota_id") REFERENCES "public"."quotas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closing_ranks" ADD CONSTRAINT "closing_ranks_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counsellings" ADD CONSTRAINT "counsellings_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fees" ADD CONSTRAINT "fees_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fees" ADD CONSTRAINT "fees_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fees" ADD CONSTRAINT "fees_quota_id_quotas_id_fk" FOREIGN KEY ("quota_id") REFERENCES "public"."quotas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fees" ADD CONSTRAINT "fees_counselling_id_counsellings_id_fk" FOREIGN KEY ("counselling_id") REFERENCES "public"."counsellings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institutes" ADD CONSTRAINT "institutes_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_code_scheme_idx" ON "categories" USING btree ("code","scheme");--> statement-breakpoint
CREATE INDEX "cr_predict_idx" ON "closing_ranks" USING btree ("level","year","category_id","closing_rank");--> statement-breakpoint
CREATE INDEX "cr_facet_idx" ON "closing_ranks" USING btree ("level","counselling_id","course_id","quota_id","category_id");--> statement-breakpoint
CREATE INDEX "cr_institute_idx" ON "closing_ranks" USING btree ("institute_id","year","round");--> statement-breakpoint
CREATE INDEX "cr_course_idx" ON "closing_ranks" USING btree ("course_id","year");--> statement-breakpoint
CREATE UNIQUE INDEX "counsellings_slug_idx" ON "counsellings" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "courses_slug_level_idx" ON "courses" USING btree ("slug","level");--> statement-breakpoint
CREATE INDEX "courses_source_idx" ON "courses" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "fees_institute_idx" ON "fees" USING btree ("institute_id","course_id");--> statement-breakpoint
CREATE INDEX "fees_level_fee_idx" ON "fees" USING btree ("level","fee_inr");--> statement-breakpoint
CREATE UNIQUE INDEX "institutes_slug_idx" ON "institutes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "institutes_level_state_idx" ON "institutes" USING btree ("level","state_id");--> statement-breakpoint
CREATE INDEX "institutes_source_idx" ON "institutes" USING btree ("source_id","level");--> statement-breakpoint
CREATE INDEX "institutes_order_idx" ON "institutes" USING btree ("display_order","name");--> statement-breakpoint
CREATE INDEX "leads_created_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_phone_idx" ON "leads" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "media_key_idx" ON "media_assets" USING btree ("media_key");--> statement-breakpoint
CREATE UNIQUE INDEX "quotas_code_idx" ON "quotas" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "states_slug_idx" ON "states" USING btree ("slug");