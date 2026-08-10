// Shopiva data model (Drizzle ORM).
//
// Multi-tenant by design: every business row carries a `storeId` and is scoped
// to a `stores` tenant. The API resolves the tenant per request (tenant
// middleware) and the services layer always filters by `storeId`.
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
  boolean,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
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
// Store (tenant)
// ─────────────────────────────────────────────────────────────

export const stores = pgTable(
  'stores',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    // Unique per-platform subdomain, e.g. `acme` -> `acme.shopiva.app`.
    subdomain: varchar('subdomain', { length: 63 }).notNull().unique(),
    // Owner of the store (a User). Kept as a plain column on purpose: adding a
    // `.references(() => users.id)` FK here would create a circular type
    // dependency (stores <-> users both reference each other). Ownership is
    // enforced the other way via `users.storeId` (FK + cascade), and the
    // `owner` relation below still lets you query the owner of a store.
    ownerId: uuid('owner_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('stores_owner_id_idx').on(t.ownerId)],
);

// ─────────────────────────────────────────────────────────────
// User (store owner / staff)
// ─────────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    // Stored hashed; never returned by the API.
    passwordHash: text('password_hash').notNull(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    role: userRoleEnum('role').default('STAFF').notNull(),
  },
  (t) => [index('users_store_id_idx').on(t.storeId)],
);

// ─────────────────────────────────────────────────────────────
// Product
// ─────────────────────────────────────────────────────────────

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    // Monetary values are stored as numeric to avoid float rounding errors.
    // Drizzle returns decimal columns as strings by default.
    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    imageUrl: varchar('image_url', { length: 512 }),
    stock: integer('stock').default(0).notNull(),
    // Free-form category label (e.g. "Electronics"). Kept as a plain column
    // rather than a separate table per the current spec.
    category: varchar('category', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('products_store_id_idx').on(t.storeId),
    index('products_category_idx').on(t.category),
  ],
);

// ─────────────────────────────────────────────────────────────
// Order
// ─────────────────────────────────────────────────────────────

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
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
  (t) => [
    index('orders_store_id_idx').on(t.storeId),
    index('orders_status_idx').on(t.status),
  ],
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
// StoreFeature (per-tenant feature flags / entitlements)
// ─────────────────────────────────────────────────────────────

export const storeFeatures = pgTable(
  'store_features',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    featureKey: varchar('feature_key', { length: 100 }).notNull(),
    enabled: boolean('enabled').default(false).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (t) => [
    // One entry per (store, feature).
    uniqueIndex('store_features_store_key_uniq').on(t.storeId, t.featureKey),
    index('store_features_store_id_idx').on(t.storeId),
  ],
);

// ─────────────────────────────────────────────────────────────
// Relations (power the relational query API: db.query.*.findMany({ with }))
//
// Note: stores <-> users has TWO relationships (store.owner and store members),
// so both sides carry a `relationName` to disambiguate.
// ─────────────────────────────────────────────────────────────

export const storesRelations = relations(stores, ({ one, many }) => ({
  owner: one(users, {
    fields: [stores.ownerId],
    references: [users.id],
    relationName: 'owner',
  }),
  members: many(users, { relationName: 'membership' }),
  products: many(products),
  orders: many(orders),
  features: many(storeFeatures),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  store: one(stores, {
    fields: [users.storeId],
    references: [stores.id],
    relationName: 'membership',
  }),
  owns: many(stores, { relationName: 'owner' }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  store: one(stores, { fields: [products.storeId], references: [stores.id] }),
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  store: one(stores, { fields: [orders.storeId], references: [stores.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const storeFeaturesRelations = relations(storeFeatures, ({ one }) => ({
  store: one(stores, { fields: [storeFeatures.storeId], references: [stores.id] }),
}));

// Convenience inferred types.
export type Store = typeof stores.$inferSelect;
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type StoreFeature = typeof storeFeatures.$inferSelect;
