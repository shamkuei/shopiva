import { sql, eq } from 'drizzle-orm';
import { db, client } from './index';
import { stores, products } from './schema';

/**
 * Idempotent setup + seed, run on every container start (after `drizzle-kit push`):
 *   1. ensure an auto-updating `updated_at` trigger on every table,
 *   2. ensure the default store exists,
 *   3. insert sample products the first time around.
 *
 * Run manually with: `npm run db:seed`.
 */

// Tables that own an `updated_at` column and should auto-update it on change.
const TABLES_WITH_UPDATED_AT = ['stores', 'users', 'categories', 'products'];

async function ensureUpdatedAtTriggers() {
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  for (const table of TABLES_WITH_UPDATED_AT) {
    // Table names are hardcoded constants -> safe to interpolate via sql.raw.
    await db.execute(
      sql.raw(
        `CREATE OR REPLACE TRIGGER ${table}_updated_at
         BEFORE UPDATE ON ${table}
         FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,
      ),
    );
  }
}

async function main() {
  const slug = process.env.STORE_DEFAULT_SLUG ?? 'default';

  await ensureUpdatedAtTriggers();

  const existing = await db.select().from(stores).where(eq(stores.slug, slug)).limit(1);
  let store = existing[0];
  if (!store) {
    const [created] = await db
      .insert(stores)
      .values({
        slug,
        name: 'Default Store',
        status: 'ACTIVE',
        plan: 'FREE',
        defaultCurrency: 'USD',
      })
      .returning();
    store = created;
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.storeId, store.id));

  if ((countRow?.count ?? 0) === 0) {
    await db.insert(products).values([
      {
        storeId: store.id,
        name: 'Acme Wireless Headphones',
        description: 'A great-sounding pair of wireless headphones to get you started.',
        price: '129.00',
        currency: 'USD',
        sku: 'ACME-WH-001',
        stock: 42,
        active: true,
      },
      {
        storeId: store.id,
        name: 'Shopiva Tote Bag',
        description: 'Carry everything. Sustainable cotton tote.',
        price: '19.50',
        currency: 'USD',
        sku: 'SHOP-TOTE',
        stock: 200,
        active: true,
      },
    ]);
  }

  console.log(`[seed] store ready: slug=${store.slug} id=${store.id}`);
}

main()
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
