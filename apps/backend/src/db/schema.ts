// Shopiva data model (Drizzle ORM).
//
// Multi-tenant by design: every business row carries a `storeId` and is scoped
// to a `stores` tenant. The API resolves the tenant per request (tenant
// middleware) and the services layer always filters by `storeId`.
//
// Only one store is created today (the default, seeded on boot), but the schema
// is ready to host many tenants side by side.
//
// Conventions: snake_case table/column names in Postgres, camelCase JS props
// (Drizzle maps between them). `updated_at` is kept current by a trigger set up
// by the seed/migration script (Postgres has no native auto-updating timestamp).

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

export const storeStatusEnum = pgEnum('store_status', ['TRIAL', 'ACTIVE', 'SUSPENDED']);
export const storePlanEnum = pgEnum('store_plan', ['FREE', 'PRO', 'ENTERPRISE']);
export const userRoleEnum = pgEnum('user_role', ['OWNER', 'ADMIN', 'STAFF']);

// ─────────────────────────────────────────────────────────────
// Tenant
// ─────────────────────────────────────────────────────────────

export const stores = pgTable(
  'stores',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    // URL-safe identifier, unique across the platform. Used for subdomains
    // (`<slug>.shopiva.app`) and as the `x-store-slug` request header value.
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    // Optional custom domain (e.g. `store.example.com`).
    domain: varchar('domain', { length: 255 }).unique(),
    status: storeStatusEnum('status').default('TRIAL').notNull(),
    plan: storePlanEnum('plan').default('FREE').notNull(),
    defaultCurrency: varchar('default_currency', { length: 3 }).default('USD').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('stores_status_idx').on(t.status)],
);

// ─────────────────────────────────────────────────────────────
// Store staff (admins / merchants). One user belongs to one store for now;
// when we need platform-wide accounts, add a many-to-many via a Membership.
// ─────────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    // Stored hashed; never returned by the API.
    passwordHash: text('password_hash').notNull(),
    name: varchar('name', { length: 255 }),
    role: userRoleEnum('role').default('STAFF').notNull(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('users_store_id_idx').on(t.storeId)],
);

// ─────────────────────────────────────────────────────────────
// Catalog
// ─────────────────────────────────────────────────────────────

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    // A category slug is unique within a store, not globally.
    uniqueIndex('categories_store_slug_uniq').on(t.storeId, t.slug),
    index('categories_store_id_idx').on(t.storeId),
  ],
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    // Monetary values are stored as numeric to avoid float rounding errors.
    // Drizzle returns decimal columns as strings by default.
    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('USD').notNull(),
    sku: varchar('sku', { length: 255 }),
    stock: integer('stock').default(0).notNull(),
    active: boolean('active').default(true).notNull(),

    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    // SKU must be unique within a store (NULL skus don't conflict in Postgres).
    uniqueIndex('products_store_sku_uniq').on(t.storeId, t.sku),
    index('products_store_id_idx').on(t.storeId),
    index('products_category_id_idx').on(t.categoryId),
    index('products_active_idx').on(t.active),
  ],
);

// ─────────────────────────────────────────────────────────────
// Relations (power the relational query API: db.query.*.findMany({ with }))
// ─────────────────────────────────────────────────────────────

export const storesRelations = relations(stores, ({ many }) => ({
  users: many(users),
  categories: many(categories),
  products: many(products),
}));

export const usersRelations = relations(users, ({ one }) => ({
  store: one(stores, { fields: [users.storeId], references: [stores.id] }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  store: one(stores, { fields: [categories.storeId], references: [stores.id] }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  store: one(stores, { fields: [products.storeId], references: [stores.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
}));

// Convenience inferred types.
export type Store = typeof stores.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type User = typeof users.$inferSelect;
