/**
 * Public checkout tests (single store). Mocked DB + Redis. No tenant header.
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

import { products, orderItems, orders } from '../src/db/schema';

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

describe('POST /api/orders', () => {
  it('creates an order + items and decrements stock', async () => {
    state.selectResults.set(products, [product('p1', '12.00', 10), product('p2', '5.50', 3)]);
    state.insertResults.set(orders, [
      { id: 'order-1', status: 'pending', totalAmount: '29.50', customerName: 'Jane', customerPhone: null, customerAddress: null, authority: null, refId: null, createdAt: new Date() },
    ]);

    const res = await request.post('/api/orders').send({
      items: [{ productId: 'p1', quantity: 2 }, { productId: 'p2', quantity: 1 }],
      customer: { name: 'Jane', phone: '555', address: '1 Main St' },
    });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('order-1');

    const itemsInsert = state.inserts.find((i) => i.table === orderItems)?.data as Array<{ orderId: string; unitPrice: string }>;
    expect(itemsInsert).toHaveLength(2);
    expect(itemsInsert[0].unitPrice).toBe('12.00');
    expect(itemsInsert[0].orderId).toBe('order-1');
    expect(state.updates.filter((u) => u.table === products)).toHaveLength(2);
  });

  it('rejects insufficient stock (409)', async () => {
    state.selectResults.set(products, [product('p1', '10.00', 1)]);
    const res = await request.post('/api/orders').send({ items: [{ productId: 'p1', quantity: 2 }], customer: { name: 'Jane' } });
    expect(res.status).toBe(409);
  });

  it('rejects an unavailable product (400)', async () => {
    state.selectResults.set(products, []);
    const res = await request.post('/api/orders').send({ items: [{ productId: 'pX', quantity: 1 }], customer: { name: 'Jane' } });
    expect(res.status).toBe(400);
  });

  it('rejects empty items (400)', async () => {
    const res = await request.post('/api/orders').send({ items: [], customer: { name: 'Jane' } });
    expect(res.status).toBe(400);
  });

  it('rejects a non-positive quantity (400)', async () => {
    const res = await request.post('/api/orders').send({ items: [{ productId: 'p1', quantity: 0 }], customer: { name: 'Jane' } });
    expect(res.status).toBe(400);
  });

  it('rejects a missing customer name (400)', async () => {
    const res = await request.post('/api/orders').send({ items: [{ productId: 'p1', quantity: 1 }], customer: {} });
    expect(res.status).toBe(400);
  });
});
