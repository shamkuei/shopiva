/**
 * Admin product endpoint tests (single store — products are global, no storeId).
 * Mocked DB + Redis; real JWT.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

const { state } = vi.hoisted(() => ({
  state: {
    selectResults: new Map<unknown, unknown[]>(),
    insertResults: new Map<unknown, unknown[]>(),
    updateResults: new Map<unknown, unknown[]>(),
    deleteResults: new Map<unknown, unknown[]>(),
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
      then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
        const rows =
          kind === 'select' ? (state.selectResults.get(table) ?? [])
          : kind === 'insert' ? (state.insertResults.get(table) ?? [])
          : kind === 'update' ? (state.updateResults.get(table) ?? [])
          : (state.deleteResults.get(table) ?? []);
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

import { products } from '../src/db/schema';

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
  ownerToken = signAccessToken({ sub: 'user-1', role: 'OWNER', email: 'owner@shopiva.test' });
});

beforeEach(() => {
  state.selectResults.clear();
  state.insertResults.clear();
  state.updateResults.clear();
  state.deleteResults.clear();
  state.inserts = [];
  state.updates = [];
});

const withAuth = () => ({ Cookie: `access_token=${ownerToken}` });

const sampleProduct = () => ({
  id: 'prod-1',
  title: 'Mug',
  description: 'A mug',
  price: '12.00',
  imageUrl: null,
  stock: 5,
  category: 'Home',
  createdAt: new Date(),
});

describe('authorization', () => {
  it('rejects without a token with 401', async () => {
    const res = await request.get('/api/admin/products');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/admin/products', () => {
  it('creates a product', async () => {
    state.insertResults.set(products, [sampleProduct()]);
    const res = await request.post('/api/admin/products').set(withAuth()).send({ title: 'Mug', price: '12.00' });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('prod-1');
  });
});

describe('GET /api/admin/products', () => {
  it('lists products', async () => {
    state.selectResults.set(products, [sampleProduct()]);
    const res = await request.get('/api/admin/products').set(withAuth());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('GET /api/admin/products/:id', () => {
  it('returns the product', async () => {
    state.selectResults.set(products, [sampleProduct()]);
    const res = await request.get('/api/admin/products/prod-1').set(withAuth());
    expect(res.status).toBe(200);
  });

  it('returns 404 when not found', async () => {
    state.selectResults.set(products, []);
    const res = await request.get('/api/admin/products/missing').set(withAuth());
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/admin/products/:id', () => {
  it('updates the product', async () => {
    state.updateResults.set(products, [{ ...sampleProduct(), title: 'Updated' }]);
    const res = await request.put('/api/admin/products/prod-1').set(withAuth()).send({ title: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated');
  });

  it('returns 404 when not found', async () => {
    state.updateResults.set(products, []);
    const res = await request.put('/api/admin/products/prod-x').set(withAuth()).send({ title: 'X' });
    expect(res.status).toBe(404);
  });

  it('rejects an invalid price with 400', async () => {
    const res = await request.put('/api/admin/products/prod-1').set(withAuth()).send({ price: 'not-a-number' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/admin/products/:id', () => {
  it('deletes the product', async () => {
    state.deleteResults.set(products, [sampleProduct()]);
    const res = await request.delete('/api/admin/products/prod-1').set(withAuth());
    expect(res.status).toBe(204);
  });

  it('returns 404 when not found', async () => {
    state.deleteResults.set(products, []);
    const res = await request.delete('/api/admin/products/prod-x').set(withAuth());
    expect(res.status).toBe(404);
  });
});

describe('POST /api/admin/products/image', () => {
  it('returns 400 when no file is uploaded', async () => {
    const res = await request.post('/api/admin/products/image').set(withAuth());
    expect(res.status).toBe(400);
  });
});
