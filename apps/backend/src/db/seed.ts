import { eq } from 'drizzle-orm';
import { db, client } from './index';
import { stores, products } from './schema';

/**
 * Idempotent seed: ensures one sample store exists and inserts a few test
 * products the first time around. Run on every container start (after the
 * migration/push) and manually with: `npm run db:seed`.
 */

async function main() {
  const subdomain = process.env.STORE_DEFAULT_SUBDOMAIN ?? 'default';

  // 1. Ensure the sample store exists.
  const existing = await db.select().from(stores).where(eq(stores.subdomain, subdomain)).limit(1);
  let store = existing[0];
  if (!store) {
    const [created] = await db
      .insert(stores)
      .values({ subdomain, name: 'Acme Store' })
      .returning();
    store = created;
  }

  // 2. Seed a few test products if the store has none yet.
  const [anyProduct] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.storeId, store.id))
    .limit(1);

  if (!anyProduct) {
    await db.insert(products).values([
      {
        storeId: store.id,
        title: 'Acme Wireless Headphones',
        description: 'Over-ear wireless headphones with active noise cancellation.',
        price: '129.00',
        imageUrl: 'https://picsum.photos/seed/headphones/600/400',
        stock: 42,
        category: 'Electronics',
      },
      {
        storeId: store.id,
        title: 'Shopiva Tote Bag',
        description: 'Durable organic cotton tote — carries everything.',
        price: '19.50',
        imageUrl: 'https://picsum.photos/seed/tote/600/400',
        stock: 200,
        category: 'Accessories',
      },
      {
        storeId: store.id,
        title: 'Ceramic Coffee Mug',
        description: 'Handmade 12oz ceramic mug, dishwasher safe.',
        price: '12.00',
        imageUrl: 'https://picsum.photos/seed/mug/600/400',
        stock: 75,
        category: 'Home',
      },
      {
        storeId: store.id,
        title: 'Mechanical Keyboard',
        description: 'Hot-swappable 75% mechanical keyboard with PBT keycaps.',
        price: '89.99',
        imageUrl: 'https://picsum.photos/seed/keyboard/600/400',
        stock: 15,
        category: 'Electronics',
      },
    ]);
  }

  console.log(`[seed] store ready: subdomain=${store.subdomain} id=${store.id}`);
}

main()
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
