import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { products, type Product } from '../db/schema';

type ProductInsert = typeof products.$inferInsert;

/** Writable product fields. `title` and `price` are required on create. */
export type ProductWrite = {
  title: string;
  price: string;
  description?: string | null;
  imageUrl?: string | null;
  stock?: number;
  category?: string | null;
};

/**
 * Product data access. Every method is scoped by `storeId` — the tenant —
 * which is the core of the multi-tenant contract: a request for tenant A can
 * never read or mutate tenant B's products. Lookups filter by BOTH id and
 * storeId, so a foreign store's product id simply yields "not found".
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

  async create(storeId: string, data: ProductWrite): Promise<Product> {
    const [row] = await db.insert(products).values({ ...data, storeId }).returning();
    return row;
  },

  async update(storeId: string, id: string, data: Partial<ProductWrite>): Promise<Product | null> {
    const [row] = await db
      .update(products)
      .set(data)
      .where(and(eq(products.id, id), eq(products.storeId, storeId)))
      .returning();
    return row ?? null;
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

// Re-exported for controllers that need the raw insert type.
export type { ProductInsert };
