import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { products, type Product } from '../db/schema';

type ProductInsert = typeof products.$inferInsert;

/**
 * Product data access. Every method is scoped by `storeId` — the tenant —
 * which is the core of the multi-tenant contract: a request for tenant A can
 * never read or mutate tenant B's products.
 */

export const productService = {
  listByStore(storeId: string): Promise<Product[]> {
    return db
      .select()
      .from(products)
      .where(eq(products.storeId, storeId))
      .orderBy(desc(products.createdAt));
  },

  async getById(storeId: string, id: string): Promise<Product | null> {
    const rows = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.storeId, storeId)))
      .limit(1);
    return rows[0] ?? null;
  },

  async create(storeId: string, data: Omit<ProductInsert, 'storeId'>): Promise<Product> {
    const [row] = await db.insert(products).values({ ...data, storeId }).returning();
    return row;
  },

  /** Returns the deleted row, or null if the id didn't belong to this store. */
  async delete(storeId: string, id: string): Promise<Product | null> {
    const [row] = await db
      .delete(products)
      .where(and(eq(products.id, id), eq(products.storeId, storeId)))
      .returning();
    return row ?? null;
  },
};
