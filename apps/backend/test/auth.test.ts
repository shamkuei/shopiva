/**
 * Auth endpoint tests (single store). Mocked DB + Redis; real bcryptjs + JWT.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { hash } from 'bcryptjs';

const { state } = vi.hoisted(() => ({ state: { selectResults: new Map<unknown, unknown[]>() } }));

vi.mock('../src/config/redis', () => ({
  redis: { ping: () => Promise.resolve('PONG'), quit: () => Promise.resolve(), on: () => {} },
}));

vi.mock('../src/db', () => {
  const builder = (table: unknown, kind: 'select' | 'insert' | 'update' | 'delete') => {
    const b: Record<string, unknown> = {
      values: () => b,
      set: () => b,
      from: () => b,
      where: () => b,
      limit: () => b,
      orderBy: () => b,
      for: () => b,
      returning: () => b,
      then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
        Promise.resolve(kind === 'select' ? (state.selectResults.get(table) ?? []) : []).then(resolve, reject),
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

import { users } from '../src/db/schema';

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
});

const cookie = (name: string, value: string) => `${name}=${value}`;
const sampleUser = () => ({ id: 'user-1', email: 'owner@shopiva.test', passwordHash, role: 'OWNER' });

describe('POST /api/auth/login', () => {
  it('authenticates and sets auth cookies', async () => {
    state.selectResults.set(users, [sampleUser()]);
    const res = await request.post('/api/auth/login').send({ email: 'owner@shopiva.test', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('owner@shopiva.test');
    expect(res.body.data.user.role).toBe('OWNER');
    expect((res.headers['set-cookie'] as string[]).some((c) => c.startsWith('access_token='))).toBe(true);
  });

  it('rejects a wrong password with 401', async () => {
    state.selectResults.set(users, [sampleUser()]);
    const res = await request.post('/api/auth/login').send({ email: 'owner@shopiva.test', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rejects an unknown email with 401', async () => {
    state.selectResults.set(users, []);
    const res = await request.post('/api/auth/login').send({ email: 'nobody@x.com', password: 'password123' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without a token', async () => {
    const res = await request.get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the user with a valid access cookie', async () => {
    const token = signAccessToken({ sub: 'user-1', role: 'OWNER', email: 'owner@shopiva.test' });
    const res = await request.get('/api/auth/me').set('Cookie', cookie('access_token', token));
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('owner@shopiva.test');
  });
});

describe('POST /api/auth/refresh', () => {
  it('issues a new access token from a refresh cookie', async () => {
    const refresh = signRefreshToken({ sub: 'user-1' });
    state.selectResults.set(users, [sampleUser()]);
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
    expect((res.headers['set-cookie'] as string[]).some((c) => c.startsWith('access_token=;'))).toBe(true);
  });
});
