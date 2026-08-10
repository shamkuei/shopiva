/**
 * Unit tests for the auth endpoints.
 *
 * Strategy: hit the real Express app via supertest, but mock the database
 * (`../src/db`) and Redis (`../src/config/redis`) so the tests are isolated,
 * fast, and need no live infrastructure. bcryptjs hashing and JWT signing are
 * exercised for real, so credentials and tokens are genuinely validated.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { hash } from 'bcryptjs';

// Shared mock state, hoisted so the vi.mock factory and the tests can both see it.
const { state } = vi.hoisted(() => ({
  state: {
    selectResults: new Map<unknown, unknown[]>(),
    insertResults: new Map<unknown, unknown[]>(),
    inserts: [] as Array<{ table: unknown; data: unknown }>,
  },
}));

// Avoid the real ioredis connection during tests.
vi.mock('../src/config/redis', () => ({
  redis: {
    ping: () => Promise.resolve('PONG'),
    quit: () => Promise.resolve(),
    on: () => {},
  },
}));

// Mock the Drizzle client with just enough chainable API for auth.service.
vi.mock('../src/db', () => {
  const builder = (table: unknown, kind: 'insert' | 'select') => {
    const b: Record<string, unknown> = {
      values: (data: unknown) => {
        state.inserts.push({ table, data });
        return b;
      },
      from: () => b,
      where: () => b,
      limit: () => b,
      orderBy: () => b,
      returning: () => b,
      then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
        Promise.resolve(
          kind === 'insert'
            ? (state.insertResults.get(table) ?? [])
            : (state.selectResults.get(table) ?? []),
        ).then(resolve, reject),
    };
    return b;
  };

  const queryable = {
    insert: (table: unknown) => builder(table, 'insert'),
    select: () => ({ from: (table: unknown) => builder(table, 'select') }),
  };

  return {
    db: {
      ...queryable,
      transaction: async (cb: (tx: typeof queryable) => Promise<unknown>) => cb(queryable),
    },
    client: { end: () => Promise.resolve() },
  };
});

import { users, stores } from '../src/db/schema';

let request: ReturnType<typeof import('supertest')['default']>;
let signAccessToken: typeof import('../src/utils/jwt')['signAccessToken'];
let signRefreshToken: typeof import('../src/utils/jwt')['signRefreshToken'];
let passwordHash: string;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test@localhost:5432/test';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.JWT_ACCESS_TTL = '15m';
  process.env.JWT_REFRESH_TTL = '7d';
  process.env.COOKIE_SECURE = 'false';

  // Import the app dynamically AFTER env is set so env.ts picks it up.
  const { createApp } = await import('../src/app');
  const supertest = (await import('supertest')).default;
  const jwt = await import('../src/utils/jwt');
  request = supertest(createApp());
  signAccessToken = jwt.signAccessToken;
  signRefreshToken = jwt.signRefreshToken;

  passwordHash = await hash('password123', 10);
});

beforeEach(() => {
  state.selectResults.clear();
  state.insertResults.clear();
  state.inserts = [];
});

const cookie = (name: string, value: string) => `${name}=${value}`;

describe('POST /api/auth/register', () => {
  it('creates a store + owner, stores a hashed password, and sets auth cookies', async () => {
    state.insertResults.set(stores, [
      { id: 'store-1', name: 'Acme', subdomain: 'acme', ownerId: null, createdAt: new Date() },
    ]);
    state.insertResults.set(users, [
      { id: 'user-1', email: 'owner@acme.com', passwordHash: 'x', storeId: 'store-1', role: 'OWNER' },
    ]);

    const res = await request.post('/api/auth/register').send({
      storeName: 'Acme',
      subdomain: 'acme',
      email: 'owner@acme.com',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('owner@acme.com');
    expect(res.body.data.user.role).toBe('OWNER');
    expect(res.body.data.store.subdomain).toBe('acme');

    const setCookie = res.headers['set-cookie'] as string[];
    expect(setCookie.some((c) => c.startsWith('access_token='))).toBe(true);
    expect(setCookie.some((c) => c.startsWith('refresh_token='))).toBe(true);

    // A store AND a user were inserted together.
    const insertedUser = state.inserts.find((i) => i.table === users);
    expect(insertedUser).toBeTruthy();
    expect((insertedUser!.data as { role: string }).role).toBe('OWNER');
    // Password was hashed, not stored in plaintext.
    expect((insertedUser!.data as { passwordHash: string }).passwordHash).not.toBe('password123');
    expect(state.inserts.some((i) => i.table === stores)).toBe(true);
  });

  it('rejects an already-taken subdomain with 409', async () => {
    state.selectResults.set(stores, [{ id: 'store-1' }]);
    const res = await request.post('/api/auth/register').send({
      storeName: 'Acme',
      subdomain: 'acme',
      email: 'new@acme.com',
      password: 'password123',
    });
    expect(res.status).toBe(409);
  });

  it('rejects missing fields with 400', async () => {
    const res = await request.post('/api/auth/register').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  it('rejects a short password with 400', async () => {
    const res = await request
      .post('/api/auth/register')
      .send({ storeName: 'A', subdomain: 'a', email: 'a@b.com', password: 'short' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('authenticates with valid credentials and sets auth cookies', async () => {
    state.selectResults.set(users, [
      { id: 'user-1', email: 'owner@acme.com', passwordHash, storeId: 'store-1', role: 'OWNER' },
    ]);
    state.selectResults.set(stores, [
      { id: 'store-1', name: 'Acme', subdomain: 'acme', ownerId: null, createdAt: new Date() },
    ]);

    const res = await request
      .post('/api/auth/login')
      .send({ email: 'owner@acme.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe('user-1');
    expect(res.body.data.store.id).toBe('store-1');
    expect((res.headers['set-cookie'] as string[]).some((c) => c.startsWith('access_token='))).toBe(true);
  });

  it('rejects a wrong password with 401', async () => {
    state.selectResults.set(users, [
      { id: 'user-1', email: 'owner@acme.com', passwordHash, storeId: 'store-1', role: 'OWNER' },
    ]);
    const res = await request
      .post('/api/auth/login')
      .send({ email: 'owner@acme.com', password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('rejects an unknown email with 401', async () => {
    state.selectResults.set(users, []);
    const res = await request
      .post('/api/auth/login')
      .send({ email: 'nobody@acme.com', password: 'password123' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without an access token', async () => {
    const res = await request.get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the user for a valid access cookie', async () => {
    const token = signAccessToken({
      sub: 'user-1',
      storeId: 'store-1',
      role: 'OWNER',
      email: 'owner@acme.com',
    });
    const res = await request.get('/api/auth/me').set('Cookie', cookie('access_token', token));
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('owner@acme.com');
  });
});

describe('POST /api/auth/refresh', () => {
  it('issues a new access token from a valid refresh cookie', async () => {
    const refresh = signRefreshToken({ sub: 'user-1' });
    state.selectResults.set(users, [
      { id: 'user-1', email: 'owner@acme.com', passwordHash, storeId: 'store-1', role: 'OWNER' },
    ]);
    const res = await request.post('/api/auth/refresh').set('Cookie', cookie('refresh_token', refresh));
    expect(res.status).toBe(200);
    expect((res.headers['set-cookie'] as string[]).some((c) => c.startsWith('access_token='))).toBe(true);
  });

  it('rejects without a refresh cookie with 401', async () => {
    const res = await request.post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the auth cookies', async () => {
    const res = await request.post('/api/auth/logout');
    expect(res.status).toBe(200);
    const setCookie = res.headers['set-cookie'] as string[];
    expect(setCookie.some((c) => c.startsWith('access_token=;') || c.includes('access_token=;'))).toBe(true);
  });
});

describe('protected admin routes', () => {
  it('rejects /api/admin/store without a token with 401', async () => {
    const res = await request.get('/api/admin/store');
    expect(res.status).toBe(401);
  });

  it('allows /api/admin/store with a valid access cookie', async () => {
    const token = signAccessToken({
      sub: 'user-1',
      storeId: 'store-1',
      role: 'OWNER',
      email: 'owner@acme.com',
    });
    state.selectResults.set(stores, [
      { id: 'store-1', name: 'Acme', subdomain: 'acme', ownerId: null, createdAt: new Date() },
    ]);
    const res = await request.get('/api/admin/store').set('Cookie', cookie('access_token', token));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('store-1');
  });
});
