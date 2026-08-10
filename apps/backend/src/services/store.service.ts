import { desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { stores, type Store } from '../db/schema';

type StoreInsert = typeof stores.$inferInsert;

/**
 * Data access for tenants. Kept thin on purpose — business rules live in
 * controllers; this layer owns the queries so they're easy to find and test.
 */
export const storeService = {
  list(): Promise<Store[]> {
    return db.select().from(stores).orderBy(desc(stores.createdAt));
  },

  async getBySlug(slug: string): Promise<Store | null> {
    const rows = await db.select().from(stores).where(eq(stores.slug, slug)).limit(1);
    return rows[0] ?? null;
  },

  async create(data: StoreInsert): Promise<Store> {
    const [row] = await db.insert(stores).values(data).returning();
    return row;
  },
};
