ALTER TYPE "public"."order_status" ADD VALUE 'failed' BEFORE 'shipped';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "authority" varchar(255);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "ref_id" varchar(64);