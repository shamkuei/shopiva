/**
 * Unit tests for the admin order endpoints. Mocked DB + Redis; real app via
 * supertest. Focus: every route is owner-scoped (foreign-store order id → 404),
 * the status filter is validated, and status updates are persisted.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

const { state } = vi.hoisted(() => ({
  state: {
    selectResults: new Map<unknown, unknown[]>(),
    updateResults: new Map<unknown, unknown[]>(),
    updates: [] as Array<{ table: unknown; data: unknown }>,
  },
}));

vi.mock('../src/config/redis', () => ({
  redis: { ping: () => Promise.resolve('PONG'), quit: () => Promise.resolve(), on: () => {} },
}));

vi.mock('../src/db', () => {
  const builder = (table: unknown, kind: 'insert' | 'select' | 'update' | 'delete') => {
    const b: Record<string, unknown> = {
      values: () => b,
      set: (data: unknown) => {
        state.updates.push({ table, data });
        return b;
      },
      from: () => b,
      innerJoin: () => b,
      leftJoin: () => b,
      where: () => b,
      limit: () => b,
      orderBy: () => b,
      for: () => b,
      returning: () => b,
      then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
        const rows =
          kind === 'select'
            ? (state.selectResults.get(table) ?? [])
            : kind === 'update'
              ? (state.updateResults.get(table) ?? [])
              : kind === 'insert'
                ? []
                : [];
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

import { orders, orderItems } from '../src/db/schema';

let request: ReturnType<typeof import('supertest')['default']>;
let signAccessToken: typeof import('../src/utils/jwt')['signAccessToken'];
let ownerToken: string;

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
  const jwt = await import('../src/utils/jwt');
  request = supertest(createApp());
  signAccessToken = jwt.signAccessToken;
  ownerToken = signAccessToken({ sub: 'user-1', storeId: 'store-1', role: 'OWNER', email: 'owner@acme.com' });
});

beforeEach(() => {
  state.selectResults.clear();
  state.updateResults.clear();
  state.updates = [];
});

const withAuth = () => ({ Cookie: `access_token=${ownerToken}` });
const order = (id: string, status = 'pending') => ({
  id,
  storeId: 'store-1',
  status,
  totalAmount: '30.00',
  customerName: 'Jane',
  customerPhone: '555',
  customerAddress: '1 Main St',
  authority: null,
  refId: null,
  createdAt: new Date(),
});

describe('GET /api/admin/orders', () => {
  it('lists the store orders', async () => {
    state.selectResults.set(orders, [order('o1', 'paid'), order('o2', 'shipped')]);
    const res = await request.get('/api/admin/orders').set(withAuth());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('accepts a valid status filter', async () => {
    state.selectResults.set(orders, [order('o1', 'paid')]);
    const res = await request.get('/api/admin/orders?status=paid').set(withAuth());
    expect(res.status).toBe(200);
  });

  it('rejects an invalid status filter with 400', async () => {
    const res = await request.get('/api/admin/orders?status=bogus').set(withAuth());
    expect(res.status).toBe(400);
  });

  it('rejects without a token with 401', async () => {
    const res = await request.get('/api/admin/orders');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/admin/orders/pending-count', () => {
  it('returns the pending order count', async () => {
    state.selectResults.set(orders, [{ count: 3 }]);
    const res = await request.get('/api/admin/orders/pending-count').set(withAuth());
    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(3);
  });
});

describe('GET /api/admin/orders/:id', () => {
  it('returns the order with items', async () => {
    state.selectResults.set(orders, [order('o1', 'paid')]);
    state.selectResults.set(orderItems, [
      { id: 'oi1', orderId: 'o1', productId: 'p1', quantity: 2, unitPrice: '12.00', productTitle: 'Mug' },
    ]);
    const res = await request.get('/api/admin/orders/o1').set(withAuth());
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('o1');
    expect(res.body.data.items[0].productTitle).toBe('Mug');
    expect(res.body.data.items[0].unitPrice).toBe('12.00');
  });

  it('returns 404 for a foreign-store order', async () => {
    state.selectResults.set(orders, []); // scoped lookup finds nothing
    const res = await request.get('/api/admin/orders/oX').set(withAuth());
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/admin/orders/:id/status', () => {
  it('updates the status', async () => {
    state.updateResults.set(orders, [order('o1', 'shipped')]);
    const res = await request
      .put('/api/admin/orders/o1/status')
      .set(withAuth())
      .send({ status: 'shipped' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('shipped');
    expect((state.updates[0].data as { status: string }).status).toBe('shipped');
  });

  it('returns 404 for a foreign-store order', async () => {
    state.updateResults.set(orders, []);
    const res = await request.put('/api/admin/orders/oX/status').set(withAuth()).send({ status: 'shipped' });
    expect(res.status).toBe(404);
  });

  it('rejects an invalid status with 400', async () => {
    const res = await request.put('/api/admin/orders/o1/status').set(withAuth()).send({ status: 'nope' });
    expect(res.status).toBe(400);
  });
});
