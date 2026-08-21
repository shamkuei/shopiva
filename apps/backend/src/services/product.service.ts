import { desc, eq, ilike, or } from 'drizzle-orm';
import { db } from '../db';
import { products, type Product } from '../db/schema';

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
 * Product data access. Single store — products are global (no storeId).
 */

export const productService = {
  /**
   * List products, newest first. Optional `search` filters by
   * title/category/description (case-insensitive LIKE) server-side.
   */
  list(search?: string): Promise<Product[]> {
    const q = search?.trim();
    const filter = q
      ? or(
          ilike(products.title, `%${q}%`),
          ilike(products.category, `%${q}%`),
          ilike(products.description, `%${q}%`),
        )
      : undefined;
    return db.select().from(products).where(filter).orderBy(desc(products.createdAt));
  },

  async getById(id: string): Promise<Product | null> {
    const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async create(data: ProductWrite): Promise<Product> {
    const [row] = await db.insert(products).values(data).returning();
    return row;
  },

  async update(id: string, data: Partial<ProductWrite>): Promise<Product | null> {
    const [row] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return row ?? null;
  },

  async delete(id: string): Promise<Product | null> {
    const [row] = await db.delete(products).where(eq(products.id, id)).returning();
    return row ?? null;
  },
};
