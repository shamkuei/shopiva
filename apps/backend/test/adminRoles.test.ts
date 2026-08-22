/**
 * Role hierarchy + dashboard stats tests. Mocked DB.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

const { state } = vi.hoisted(() => ({
  state: {
    selectResults: new Map<unknown, unknown[]>(),
    updateResults: new Map<unknown, unknown[]>(),
  },
}));

vi.mock('../src/config/redis', () => ({
  redis: { ping: () => Promise.resolve('PONG'), quit: () => Promise.resolve(), on: () => {} },
}));

vi.mock('../src/db', () => {
  const builder = (table: unknown, kind: 'insert' | 'select' | 'update' | 'delete') => {
    const b: Record<string, unknown> = {
      values: () => b,
      set: () => b,
      from: () => b,
      where: () => b,
      limit: () => b,
      orderBy: () => b,
      for: () => b,
      returning: () => b,
      groupBy: () => b,
      then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
        Promise.resolve(
          kind === 'select' ? (state.selectResults.get(table) ?? [])
          : kind === 'update' ? (state.updateResults.get(table) ?? [])
          : [],
        ).then(resolve, reject),
    };
    return b;
  };
  const queryable = {
    insert: (t: unknown) => builder(t, 'insert'),
    update: (t: unknown) => builder(t, 'update'),
    delete: (t: unknown) => builder(t, 'delete'),
    select: (_cols?: unknown) => ({ from: (t: unknown) => builder(t, 'select') }),
  };
  return {
    db: { ...queryable, transaction: async (cb: (tx: typeof queryable) => Promise<unknown>) => cb(queryable) },
    client: { end: () => Promise.resolve() },
  };
});

import { orders, products } from '../src/db/schema';

let request: ReturnType<typeof import('supertest')['default']>;
let token: (role: string) => string;

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
  token = (role: string) =>
    jwt.signAccessToken({ sub: 'u1', role, email: 'staff@shopiva.test' });
});

beforeEach(() => {
  state.selectResults.clear();
  state.updateResults.clear();
});

describe('role hierarchy on /api/admin', () => {
  it('401s without a token', async () => {
    const res = await request.get('/api/admin/stats');
    expect(res.status).toBe(401);
  });

  it('lets STAFF read products (not the old blanket 403)', async () => {
    state.selectResults.set(products, []);
    const res = await request
      .get('/api/admin/products')
      .set('Cookie', `access_token=${token('STAFF')}`);
    expect(res.status).toBe(200);
  });

  it('lets STAFF view the dashboard stats', async () => {
    state.selectResults.set(orders, [
      { status: 'paid', count: 2, payable: '500.00' },
      { status: 'pending', count: 1, payable: '100.00' },
    ]);
    state.selectResults.set(products, [
      { id: 'p1', title: 'کالای کم‌موجود', stock: 2 },
    ]);
    const res = await request
      .get('/api/admin/stats')
      .set('Cookie', `access_token=${token('STAFF')}`);
    expect(res.status).toBe(200);
    expect(res.body.data.revenue).toBe('500.00');
    expect(res.body.data.ordersByStatus.paid).toBe(2);
    expect(res.body.data.lowStock).toHaveLength(1);
  });

  it('still blocks STAFF from deleting products (owner-only)', async () => {
    const res = await request
      .delete('/api/admin/products/p1')
      .set('Cookie', `access_token=${token('STAFF')}`);
    expect(res.status).toBe(403);
  });

  it('lets ADMIN edit products', async () => {
    state.updateResults.set(products, [
      { id: 'p1', title: 'ویرایش‌شده', price: '100', stock: 1, imageUrl: null, description: null, category: null, createdAt: new Date() },
    ]);
    const res = await request
      .put('/api/admin/products/p1')
      .set('Cookie', `access_token=${token('ADMIN')}`)
      .send({ title: 'ویرایش‌شده', price: '100' });
    expect(res.status).toBe(200);
  });
});
