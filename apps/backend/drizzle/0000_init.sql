CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'shipped', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('OWNER', 'ADMIN', 'STAFF');--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"customer_phone" varchar(50),
	"customer_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"price" numeric(12, 2) NOT NULL,
	"image_url" varchar(512),
	"stock" integer DEFAULT 0 NOT NULL,
	"category" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"feature_key" varchar(100) NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"subdomain" varchar(63) NOT NULL,
	"owner_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stores_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"store_id" uuid NOT NULL,
	"role" "user_role" DEFAULT 'STAFF' NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_features" ADD CONSTRAINT "store_features_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_id_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "orders_store_id_idx" ON "orders" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_store_id_idx" ON "products" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "store_features_store_key_uniq" ON "store_features" USING btree ("store_id","feature_key");--> statement-breakpoint
CREATE INDEX "store_features_store_id_idx" ON "store_features" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "stores_owner_id_idx" ON "stores" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "users_store_id_idx" ON "users" USING btree ("store_id");