/**
 * Coupon tests: public validation + order-creation application. Mocked DB.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

const { state } = vi.hoisted(() => ({
  state: {
    selectResults: new Map<unknown, unknown[]>(),
    insertResults: new Map<unknown, unknown[]>(),
    inserts: [] as Array<{ table: unknown; data: unknown }>,
    updates: [] as Array<{ table: unknown; data: unknown }>,
  },
}));

vi.mock('../src/config/redis', () => ({
  redis: { ping: () => Promise.resolve('PONG'), quit: () => Promise.resolve(), on: () => {} },
}));

vi.mock('../src/db', () => {
  const builder = (table: unknown, kind: 'insert' | 'select' | 'update' | 'delete') => {
    const b: Record<string, unknown> = {
      values: (data: unknown) => { state.inserts.push({ table, data }); return b; },
      set: (data: unknown) => { state.updates.push({ table, data }); return b; },
      from: () => b,
      where: () => b,
      limit: () => b,
      orderBy: () => b,
      for: () => b,
      returning: () => b,
      then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
        Promise.resolve(
          kind === 'select' ? (state.selectResults.get(table) ?? [])
          : kind === 'insert' ? (state.insertResults.get(table) ?? [])
          : [],
        ).then(resolve, reject),
    };
    return b;
  };
  const queryable = {
    insert: (t: unknown) => builder(t, 'insert'),
    update: (t: unknown) => builder(t, 'update'),
    delete: (t: unknown) => builder(t, 'delete'),
    select: () => ({ from: (t: unknown) => builder(t, 'select') }),
  };
  return {
    db: { ...queryable, transaction: async (cb: (tx: typeof queryable) => Promise<unknown>) => cb(queryable) },
    client: { end: () => Promise.resolve() },
  };
});

import { products, coupons, orders } from '../src/db/schema';

let request: ReturnType<typeof import('supertest')['default']>;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test@localhost:5432/test';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.JWT_ACCESS_TTL = '15m';
  process.env.JWT_REFRESH_TTL = '7d';
  process.env.COOKIE_SECURE = 'false';
  const { createApp } = await import('../src/app');
  const supertest = (await import('supertest')).default;
  request = supertest(createApp());
});

beforeEach(() => {
  state.selectResults.clear();
  state.insertResults.clear();
  state.inserts = [];
  state.updates = [];
});

const product = (id: string, price: string, stock: number) => ({
  id,
  title: `Product ${id}`,
  description: null,
  price,
  imageUrl: null,
  stock,
  category: null,
  createdAt: new Date(),
});

const coupon = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'c1',
  code: 'WELCOME20',
  percentOff: 20,
  active: true,
  expiresAt: null,
  maxRedemptions: null,
  timesRedeemed: 0,
  createdAt: new Date(),
  ...over,
});

describe('GET /api/coupons/:code', () => {
  it('validates an active coupon (case-insensitive)', async () => {
    state.selectResults.set(coupons, [coupon()]);
    const res = await request.get('/api/coupons/welcome20');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ code: 'WELCOME20', percentOff: 20 });
  });

  it('404s an unknown code', async () => {
    state.selectResults.set(coupons, []);
    const res = await request.get('/api/coupons/NOPE');
    expect(res.status).toBe(404);
  });

  it('rejects an inactive coupon (400)', async () => {
    state.selectResults.set(coupons, [coupon({ active: false })]);
    const res = await request.get('/api/coupons/WELCOME20');
    expect(res.status).toBe(400);
  });

  it('rejects an expired coupon (400)', async () => {
    state.selectResults.set(coupons, [coupon({ expiresAt: new Date(Date.now() - 1000) })]);
    const res = await request.get('/api/coupons/WELCOME20');
    expect(res.status).toBe(400);
  });

  it('rejects an exhausted coupon (400)', async () => {
    state.selectResults.set(coupons, [coupon({ maxRedemptions: 5, timesRedeemed: 5 })]);
    const res = await request.get('/api/coupons/WELCOME20');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/orders with discountCode', () => {
  it('applies the discount and stores both amounts + code', async () => {
    state.selectResults.set(products, [product('p1', '100.00', 10)]);
    // The coupon SELECT inside the transaction resolves to the coupon row.
    state.selectResults.set(coupons, [coupon()]);
    state.insertResults.set(orders, [
      { id: 'order-1', status: 'pending', totalAmount: '100.00', discountAmount: '20.00', discountCode: 'WELCOME20' },
    ]);

    const res = await request.post('/api/orders').send({
      items: [{ productId: 'p1', quantity: 1 }],
      customer: { name: 'Jane' },
      discountCode: 'welcome20', // lowercase on purpose
    });

    expect(res.status).toBe(201);
    const orderInsert = state.inserts.find((i) => i.table === orders)?.data as Record<string, unknown>;
    expect(orderInsert.totalAmount).toBe('100.00'); // gross
    expect(orderInsert.discountAmount).toBe('20.00'); // 20% of 100
    expect(orderInsert.discountCode).toBe('WELCOME20');
  });

  it('rejects the order when the coupon is invalid (fails atomically)', async () => {
    state.selectResults.set(products, [product('p1', '100.00', 10)]);
    state.selectResults.set(coupons, []); // unknown code

    const res = await request.post('/api/orders').send({
      items: [{ productId: 'p1', quantity: 1 }],
      customer: { name: 'Jane' },
      discountCode: 'GHOST',
    });

    expect(res.status).toBe(400);
    // No order may be inserted when the coupon fails.
    expect(state.inserts.find((i) => i.table === orders)).toBeUndefined();
  });

  it('creates a normal order when no code is sent', async () => {
    state.selectResults.set(products, [product('p1', '50.00', 10)]);
    state.insertResults.set(orders, [
      { id: 'order-2', status: 'pending', totalAmount: '50.00' },
    ]);

    const res = await request.post('/api/orders').send({
      items: [{ productId: 'p1', quantity: 1 }],
      customer: { name: 'Jane' },
    });

    expect(res.status).toBe(201);
    const orderInsert = state.inserts.find((i) => i.table === orders)?.data as Record<string, unknown>;
    expect(orderInsert.totalAmount).toBe('50.00');
    expect(orderInsert.discountAmount).toBe('0.00');
    expect(orderInsert.discountCode).toBeNull();
  });
});
