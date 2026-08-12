// Shopiva data model (Drizzle ORM) — single-store.
//
// There is no `stores`/tenant table: this is one online store. Products and
// orders are global (no storeId). Staff accounts (users) are not tied to a
// store either.
//
// Conventions: snake_case table/column names in Postgres, camelCase JS props
// (Drizzle maps between them).

import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  integer,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['OWNER', 'ADMIN', 'STAFF']);
export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'paid',
  'failed',
  'shipped',
  'cancelled',
]);

// ─────────────────────────────────────────────────────────────
// User (store staff / owner)
// ─────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  // Stored hashed; never returned by the API.
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').default('STAFF').notNull(),
});

// ─────────────────────────────────────────────────────────────
// Product
// ─────────────────────────────────────────────────────────────

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    // Monetary values are stored as numeric to avoid float rounding errors.
    // Drizzle returns decimal columns as strings by default.
    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    imageUrl: varchar('image_url', { length: 512 }),
    stock: integer('stock').default(0).notNull(),
    // Free-form category label (e.g. "Electronics").
    category: varchar('category', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('products_category_idx').on(t.category)],
);

// ─────────────────────────────────────────────────────────────
// Order
// ─────────────────────────────────────────────────────────────

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    status: orderStatusEnum('status').default('pending').notNull(),
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
    customerName: varchar('customer_name', { length: 255 }).notNull(),
    customerPhone: varchar('customer_phone', { length: 50 }),
    customerAddress: text('customer_address'),
    // Zarinpal payment tracking (nullable; populated during the payment flow).
    authority: varchar('authority', { length: 255 }),
    refId: varchar('ref_id', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('orders_status_idx').on(t.status)],
);

// ─────────────────────────────────────────────────────────────
// OrderItem (line items belonging to an Order)
// ─────────────────────────────────────────────────────────────

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  },
  (t) => [
    index('order_items_order_id_idx').on(t.orderId),
    index('order_items_product_id_idx').on(t.productId),
  ],
);

// ─────────────────────────────────────────────────────────────
// Relations (power the relational query API: db.query.*.findMany({ with }))
// ─────────────────────────────────────────────────────────────

export const productsRelations = relations(products, ({ many }) => ({
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

// Convenience inferred types.
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
