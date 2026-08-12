-- Remove multi-tenancy: drop the store_id columns (CASCADE removes their
-- FK constraint + store_id index) from users/products/orders, then drop the
-- now-unused tenant tables (store_features, stores).
ALTER TABLE "orders" DROP COLUMN "store_id" CASCADE;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "store_id" CASCADE;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "store_id" CASCADE;--> statement-breakpoint
DROP TABLE "store_features";--> statement-breakpoint
DROP TABLE "stores";
