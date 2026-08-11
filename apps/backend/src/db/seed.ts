import { eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';
import { db, client } from './index';
import { stores, users, products, orders, orderItems, type Product } from './schema';

/**
 * Template seed — populates the DB so you can see every screen without
 * registering anything.
 *
 *   Store "default" (فروشگاه نمونه):
 *     - owner: owner@shopiva.test / password123
 *     - 8 Persian products (Toman pricing)
 *     - 6 orders across all statuses (pending/paid/shipped/cancelled)
 *   Store "boutique" (بوتیک نمونه): 3 products (multi-tenant demo)
 *
 * Idempotent: re-running won't duplicate. Run with: `npm run db:seed`.
 */

const OWNER_EMAIL = 'owner@shopiva.test';
const OWNER_PASSWORD = 'password123';

type ProductSeed = {
  title: string;
  description: string;
  price: string;
  imageUrl: string;
  stock: number;
  category: string;
};

const DEFAULT_PRODUCTS: ProductSeed[] = [
  { title: 'هدفون بی‌سیم اکمی', description: 'هدفون روی‌گوشی بی‌سیم با حذف نویز فعال.', price: '2990000', imageUrl: 'https://picsum.photos/seed/shp-headphones/600/400', stock: 12, category: 'الکترونیک' },
  { title: 'گوشی هوشمند سامسونگ', description: 'گوشی هوشمند با دوربین ۱۰۸ مگاپیکسل.', price: '18900000', imageUrl: 'https://picsum.photos/seed/shp-phone/600/400', stock: 5, category: 'الکترونیک' },
  { title: 'کفش ورزشی نایک', description: 'کفش دویدن سبک و راحت.', price: '3500000', imageUrl: 'https://picsum.photos/seed/shp-shoes/600/400', stock: 20, category: 'پوشاک' },
  { title: 'تی‌شرت پنبه‌ای', description: 'تی‌شرت نخی، طرح‌های متنوع.', price: '850000', imageUrl: 'https://picsum.photos/seed/shp-tshirt/600/400', stock: 50, category: 'پوشاک' },
  { title: 'ماگ سرامیکی', description: 'ماگ دست‌ساز ۳۰۰ میلی‌لیتر.', price: '320000', imageUrl: 'https://picsum.photos/seed/shp-mug/600/400', stock: 40, category: 'خانه' },
  { title: 'چراغ رومیزی LED', description: 'چراغ مطالعه با قابلیت تنظیم نور.', price: '1200000', imageUrl: 'https://picsum.photos/seed/shp-lamp/600/400', stock: 15, category: 'خانه' },
  { title: 'رمان «رودکی»', description: 'رمان تاریخی پرفروش.', price: '280000', imageUrl: 'https://picsum.photos/seed/shp-book/600/400', stock: 30, category: 'کتاب' },
  { title: 'کیبورد مکانیکی', description: 'کیبورد گیمینق با کلیدهای تعویض‌پذیر.', price: '4700000', imageUrl: 'https://picsum.photos/seed/shp-keyboard/600/400', stock: 8, category: 'الکترونیک' },
];

const BOUTIQUE_PRODUCTS: ProductSeed[] = [
  { title: 'لباس مجلسی', description: 'لباس مجلسی شب، دوخت ظریف.', price: '12000000', imageUrl: 'https://picsum.photos/seed/shp-dress/600/400', stock: 6, category: 'پوشاک' },
  { title: 'کیف چرم', description: 'کیف دستی چرم طبیعی.', price: '4500000', imageUrl: 'https://picsum.photos/seed/shp-bag/600/400', stock: 14, category: 'لوازم جانبی' },
  { title: 'شال ابریشمی', description: 'شال ابریشمی با طرح سنتی.', price: '1800000', imageUrl: 'https://picsum.photos/seed/shp-scarf/600/400', stock: 22, category: 'لوازم جانبی' },
];

// Each order: status, customer, and lines as [productIndex, quantity].
const TEMPLATE_ORDERS: Array<{
  status: 'pending' | 'paid' | 'failed' | 'shipped' | 'cancelled';
  name: string;
  phone: string;
  address: string;
  lines: Array<[number, number]>;
  refId?: string;
}> = [
  { status: 'pending', name: 'رضا محمدی', phone: '09121111111', address: 'تهران، خیابان ولیعصر، پلاک ۱۲', lines: [[0, 1], [4, 2]] },
  { status: 'pending', name: 'مریم حسینی', phone: '09122222222', address: 'شیراز، خیابان زند، مجتمع آرا', lines: [[7, 1]] },
  { status: 'paid', name: 'علی رضایی', phone: '09133333333', address: 'اصفهان، میدان نقش جهان', lines: [[1, 1], [3, 2]], refId: '10002345' },
  { status: 'paid', name: 'زهرا کریمی', phone: '09144444444', address: 'مشهد، بلوار سجاد', lines: [[2, 1]], refId: '10002346' },
  { status: 'shipped', name: 'سینا اکبری', phone: '09155555555', address: 'تبریز، خیابان امام، ساختمان آریا', lines: [[5, 1], [6, 3], [4, 1]], refId: '10002347' },
  { status: 'cancelled', name: 'نرگس صادقی', phone: '09166666666', address: 'کرمان، خیابان جوادی', lines: [[0, 1]] },
];

async function ensureStore(subdomain: string, name: string, plan: 'FREE' | 'PRO' | 'ENTERPRISE' = 'PRO') {
  const existing = await db.select().from(stores).where(eq(stores.subdomain, subdomain)).limit(1);
  if (existing[0]) {
    await db.update(stores).set({ name, status: 'ACTIVE', plan }).where(eq(stores.id, existing[0].id));
    return existing[0];
  }
  const [created] = await db
    .insert(stores)
    .values({ subdomain, name, status: 'ACTIVE', plan, defaultCurrency: 'IRR' })
    .returning();
  return created;
}

async function ensureOwner(storeId: string) {
  const existing = await db.select().from(users).where(eq(users.email, OWNER_EMAIL)).limit(1);
  if (existing[0]) {
    await db.update(stores).set({ ownerId: existing[0].id }).where(eq(stores.id, storeId));
    return existing[0];
  }
  const passwordHash = await hash(OWNER_PASSWORD, 10);
  const [owner] = await db
    .insert(users)
    .values({ email: OWNER_EMAIL, passwordHash, storeId, role: 'OWNER' })
    .returning();
  await db.update(stores).set({ ownerId: owner.id }).where(eq(stores.id, storeId));
  return owner;
}

async function seedProducts(storeId: string, list: ProductSeed[]): Promise<Product[]> {
  const existing = await db.select().from(products).where(eq(products.storeId, storeId));
  if (existing.length > 0) return existing;
  return db.insert(products).values(list.map((p) => ({ ...p, storeId }))).returning();
}

async function seedOrders(storeId: string, prods: Product[]) {
  const existing = await db.select().from(orders).where(eq(orders.storeId, storeId)).limit(1);
  if (existing.length > 0) return;

  for (const t of TEMPLATE_ORDERS) {
    let total = 0;
    const itemRows = t.lines.map(([idx, qty]) => {
      const p = prods[idx];
      total += Number(p.price) * qty;
      return { productId: p.id, quantity: qty, unitPrice: p.price };
    });

    const [order] = await db
      .insert(orders)
      .values({
        storeId,
        status: t.status,
        totalAmount: String(total),
        customerName: t.name,
        customerPhone: t.phone,
        customerAddress: t.address,
        authority: t.refId ? `SEED-${t.refId}` : null,
        refId: t.refId ?? null,
      })
      .returning();

    await db.insert(orderItems).values(itemRows.map((i) => ({ orderId: order.id, ...i })));
  }
}

async function main() {
  const store = await ensureStore('default', 'فروشگاه نمونه');
  await ensureOwner(store.id);
  const prods = await seedProducts(store.id, DEFAULT_PRODUCTS);
  await seedOrders(store.id, prods);

  const store2 = await ensureStore('boutique', 'بوتیک نمونه', 'FREE');
  await seedProducts(store2.id, BOUTIQUE_PRODUCTS);

  console.log(
    `[seed] done — login: ${OWNER_EMAIL} / ${OWNER_PASSWORD} | stores: default, boutique`,
  );
}

main()
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
