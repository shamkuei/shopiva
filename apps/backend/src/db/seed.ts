import { eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';
import { db, client } from './index';
import { users, products, orders, orderItems, type Product } from './schema';

/**
 * Template seed for the single store — populates the DB so you can see every
 * screen without registering anything.
 *
 *   - owner: OWNER_EMAIL / OWNER_PASSWORD env (dev default: owner@shopiva.test / password123)
 *   - 8 Persian products (Toman pricing)
 *   - 6 orders across all statuses (pending/paid/shipped/cancelled)
 *
 * Idempotent: re-running won't duplicate. Run with: `npm run db:seed`.
 * For production use `npm run create-admin` instead of the demo-data seed.
 */

const OWNER_EMAIL = process.env.OWNER_EMAIL ?? 'owner@shopiva.test';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? 'password123';

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

async function ensureOwner() {
  const existing = await db.select().from(users).where(eq(users.email, OWNER_EMAIL)).limit(1);
  if (existing[0]) return existing[0];
  const passwordHash = await hash(OWNER_PASSWORD, 10);
  const [owner] = await db
    .insert(users)
    .values({ email: OWNER_EMAIL, passwordHash, role: 'OWNER' })
    .returning();
  return owner;
}

async function seedProducts(): Promise<Product[]> {
  const existing = await db.select().from(products).limit(1);
  if (existing.length > 0) return db.select().from(products);
  return db.insert(products).values(DEFAULT_PRODUCTS).returning();
}

async function seedOrders(prods: Product[]) {
  const existing = await db.select().from(orders).limit(1);
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
  await ensureOwner();
  const prods = await seedProducts();
  await seedOrders(prods);
  console.log(`[seed] done — login as ${OWNER_EMAIL} (password from OWNER_PASSWORD env)`);
}

main()
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
