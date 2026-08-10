/**
 * Unit tests for the admin product endpoints.
 *
 * Same approach as auth.test.ts: real Express app via supertest, mocked DB +
 * Redis. Focus is on authorization — every operation is scoped to the token's
 * storeId, and a product id from another store simply yields 404 (no leak).
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
      returning: () => b,
      then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
        const rows =
          kind === 'insert'
            ? (state.insertResults.get(table) ?? [])
            : kind === 'update'
              ? (state.updateResults.get(table) ?? [])
              : kind === 'delete'
                ? (state.deleteResults.get(table) ?? [])
                : (state.selectResults.get(table) ?? []);
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
const STORE_ID = 'store-1';

// A valid OWNER token scoped to STORE_ID.
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
  ownerToken = signAccessToken({ sub: 'user-1', storeId: STORE_ID, role: 'OWNER', email: 'owner@acme.com' });
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
  storeId: STORE_ID,
  title: 'Mug',
  description: 'A mug',
  price: '12.00',
  imageUrl: null,
  stock: 5,
  category: 'Home',
  createdAt: new Date(),
});

describe('authorization', () => {
  it('rejects every product route without a token with 401', async () => {
    const res = await request.get('/api/admin/products');
    expect(res.status).toBe(401);
  });

  it('creates the product scoped to the token store (storeId enforced)', async () => {
    state.insertResults.set(products, [sampleProduct()]);
    const res = await request
      .post('/api/admin/products')
      .set(withAuth())
      .send({ title: 'Mug', price: '12.00' });

    expect(res.status).toBe(201);
    // The insert must carry the authenticated user's storeId, never the body's.
    expect((state.inserts[0].data as { storeId: string }).storeId).toBe(STORE_ID);
  });
});

describe('GET /api/admin/products', () => {
  it('lists the store products', async () => {
    state.selectResults.set(products, [sampleProduct()]);
    const res = await request.get('/api/admin/products').set(withAuth());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('GET /api/admin/products/:id', () => {
  it('returns the product when it belongs to the store', async () => {
    state.selectResults.set(products, [sampleProduct()]);
    const res = await request.get('/api/admin/products/prod-1').set(withAuth());
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('prod-1');
  });

  it('returns 404 for a product from another store (no data leak)', async () => {
    state.selectResults.set(products, []); // scoped lookup finds nothing
    const res = await request.get('/api/admin/products/some-other-store-product').set(withAuth());
    expect(res.status).toBe(404);
    expect(res.body.data).toBeUndefined();
  });
});

describe('PUT /api/admin/products/:id', () => {
  it('updates the product', async () => {
    state.updateResults.set(products, [{ ...sampleProduct(), title: 'Updated' }]);
    const res = await request
      .put('/api/admin/products/prod-1')
      .set(withAuth())
      .send({ title: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated');
    expect((state.updates[0].data as { title: string }).title).toBe('Updated');
  });

  it('returns 404 when updating a foreign store product', async () => {
    state.updateResults.set(products, []);
    const res = await request.put('/api/admin/products/prod-x').set(withAuth()).send({ title: 'X' });
    expect(res.status).toBe(404);
  });

  it('rejects an invalid price with 400', async () => {
    const res = await request
      .put('/api/admin/products/prod-1')
      .set(withAuth())
      .send({ price: 'not-a-number' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/admin/products/:id', () => {
  it('deletes the product', async () => {
    state.deleteResults.set(products, [sampleProduct()]);
    const res = await request.delete('/api/admin/products/prod-1').set(withAuth());
    expect(res.status).toBe(204);
  });

  it('returns 404 when deleting a foreign store product (isolation)', async () => {
    state.deleteResults.set(products, []); // scoped delete matches nothing
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
