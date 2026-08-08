CREATE TYPE "public"."element_kind" AS ENUM('system_landscape', 'person', 'system', 'container', 'component', 'code');--> statement-breakpoint
CREATE TABLE "element" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"parent_id" uuid,
	"kind" "element_kind" NOT NULL,
	"is_external" boolean DEFAULT false NOT NULL,
	"seq" bigserial NOT NULL,
	"created_at_milestone_id" uuid NOT NULL,
	"deleted_at_milestone_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "element_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"element_id" uuid NOT NULL,
	"milestone_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"technology" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "element_version_element_id_milestone_id_unique" UNIQUE("element_id","milestone_id")
);
--> statement-breakpoint
CREATE TABLE "milestone" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"label" text NOT NULL,
	"occurs_on" date,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "milestone_project_id_sort_order_unique" UNIQUE("project_id","sort_order")
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "element" ADD CONSTRAINT "element_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "element" ADD CONSTRAINT "element_parent_id_element_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."element"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "element" ADD CONSTRAINT "element_created_at_milestone_id_milestone_id_fk" FOREIGN KEY ("created_at_milestone_id") REFERENCES "public"."milestone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "element" ADD CONSTRAINT "element_deleted_at_milestone_id_milestone_id_fk" FOREIGN KEY ("deleted_at_milestone_id") REFERENCES "public"."milestone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "element_version" ADD CONSTRAINT "element_version_element_id_element_id_fk" FOREIGN KEY ("element_id") REFERENCES "public"."element"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "element_version" ADD CONSTRAINT "element_version_milestone_id_milestone_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone" ADD CONSTRAINT "milestone_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;