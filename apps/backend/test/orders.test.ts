/**
 * Unit tests for the public checkout endpoint (POST /api/orders).
 *
 * Mocked DB + Redis; real Express app via supertest. Focus: stock validation,
 * atomic create (Order + OrderItems + stock decrement), and that prices come
 * from the DB, not the client.
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
      values: (data: unknown) => {
        state.inserts.push({ table, data });
        return b;
      },
      set: (data: unknown) => {
        state.updates.push({ table, data });
        return b;
      },
      from: () => b,
      where: () => b,
      limit: () => b,
      orderBy: () => b,
      for: () => b,
      returning: () => b,
      then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
        const rows =
          kind === 'insert'
            ? (state.insertResults.get(table) ?? [])
            : kind === 'select'
              ? (state.selectResults.get(table) ?? [])
              : []; // update/delete resolve to [] (unused)
        return Promise.resolve(rows).then(resolve, reject);
      },
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

import { products, orderItems, orders, stores } from '../src/db/schema';

let request: ReturnType<typeof import('supertest')['default']>;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test@localhost:5432/test';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.JWT_ACCESS_TTL = '15m';
  process.env.JWT_REFRESH_TTL = '7d';
  process.env.COOKIE_SECURE = 'false';
  process.env.STORE_DEFAULT_SUBDOMAIN = 'default';

  const { createApp } = await import('../src/app');
  const supertest = (await import('supertest')).default;
  request = supertest(createApp());
});

beforeEach(() => {
  state.selectResults.clear();
  state.insertResults.clear();
  state.inserts = [];
  state.updates = [];
  // The orders endpoint is tenant-scoped, so the tenant middleware must
  // resolve a store for the default subdomain before the route runs.
  state.selectResults.set(stores, [
    { id: 'store-1', name: 'Acme', subdomain: 'default', ownerId: null, createdAt: new Date() },
  ]);
});

const product = (id: string, price: string, stock: number) => ({
  id,
  storeId: 'store-1',
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
      {
        id: 'order-1',
        storeId: 'store-1',
        status: 'pending',
        totalAmount: '29.50',
        customerName: 'Jane',
        customerPhone: null,
        customerAddress: null,
        createdAt: new Date(),
      },
    ]);

    const res = await request.post('/api/orders').send({
      items: [
        { productId: 'p1', quantity: 2 },
        { productId: 'p2', quantity: 1 },
      ],
      customer: { name: 'Jane', phone: '555-0100', address: '1 Main St' },
    });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('order-1');
    expect(res.body.data.status).toBe('pending');

    // OrderItem insert uses DB unit prices and the new order id.
    const itemsInsert = state.inserts.find((i) => i.table === orderItems)?.data as Array<{
      orderId: string;
      productId: string;
      quantity: number;
      unitPrice: string;
    }>;
    expect(itemsInsert).toHaveLength(2);
    expect(itemsInsert[0].unitPrice).toBe('12.00');
    expect(itemsInsert[0].orderId).toBe('order-1');

    // Stock was decremented once per item.
    expect(state.updates.filter((u) => u.table === products)).toHaveLength(2);
  });

  it('rejects when stock is insufficient (409)', async () => {
    state.selectResults.set(products, [product('p1', '10.00', 1)]); // only 1 in stock
    const res = await request
      .post('/api/orders')
      .send({ items: [{ productId: 'p1', quantity: 2 }], customer: { name: 'Jane' } });
    expect(res.status).toBe(409);
    // No order/items inserted on failure.
    expect(state.inserts.find((i) => i.table === orderItems)).toBeUndefined();
  });

  it('rejects a product that does not belong to the store (400)', async () => {
    state.selectResults.set(products, []); // scoped lookup finds nothing
    const res = await request
      .post('/api/orders')
      .send({ items: [{ productId: 'pX', quantity: 1 }], customer: { name: 'Jane' } });
    expect(res.status).toBe(400);
  });

  it('rejects an empty items array (400)', async () => {
    const res = await request.post('/api/orders').send({ items: [], customer: { name: 'Jane' } });
    expect(res.status).toBe(400);
  });

  it('rejects a non-positive quantity (400)', async () => {
    const res = await request
      .post('/api/orders')
      .send({ items: [{ productId: 'p1', quantity: 0 }], customer: { name: 'Jane' } });
    expect(res.status).toBe(400);
  });

  it('rejects a missing customer name (400)', async () => {
    const res = await request
      .post('/api/orders')
      .send({ items: [{ productId: 'p1', quantity: 1 }], customer: {} });
    expect(res.status).toBe(400);
  });
});
