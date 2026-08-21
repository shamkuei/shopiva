/**
 * Zarinpal payment tests (single store). Mocked DB + Redis; gateway HTTP via
 * global fetch. Order mock carries no storeId.
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
    select: () => ({ from: (t: unknown) => builder(t, 'select') }),
  };
  return {
    db: { ...queryable, transaction: async (cb: (tx: typeof queryable) => Promise<unknown>) => cb(queryable) },
    client: { end: () => Promise.resolve() },
  };
});

import { orders } from '../src/db/schema';

let request: ReturnType<typeof import('supertest')['default']>;
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function jsonResponse(body: unknown, status = 200): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as unknown as Response;
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test@localhost:5432/test';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.JWT_ACCESS_TTL = '15m';
  process.env.JWT_REFRESH_TTL = '7d';
  process.env.COOKIE_SECURE = 'false';
  process.env.ZARINPAL_MERCHANT_ID = 'test-merchant-id';
  process.env.ZARINPAL_SANDBOX = 'true';
  process.env.ZARINPAL_CALLBACK_URL = 'http://localhost:4000/api/payments/callback';
  process.env.WEB_URL = 'http://localhost:3000';

  const { createApp } = await import('../src/app');
  const supertest = (await import('supertest')).default;
  request = supertest(createApp());
});

beforeEach(() => {
  state.selectResults.clear();
  state.updateResults.clear();
  state.updates = [];
  fetchMock.mockReset();
});

const pendingOrder = () => ({
  id: 'order-1',
  status: 'pending',
  totalAmount: '1500.00',
  discountAmount: '0.00',
  discountCode: null,
  customerName: 'Jane',
  customerPhone: null,
  customerAddress: null,
  authority: null,
  refId: null,
  paidAt: null,
  shippedAt: null,
  createdAt: new Date(),
});

describe('POST /api/orders/:id/pay (start payment)', () => {
  it('returns the Zarinpal gateway URL and records the authority', async () => {
    state.selectResults.set(orders, [pendingOrder()]);
    fetchMock.mockResolvedValue(jsonResponse({ data: { code: 100, authority: 'A000123' }, errors: [] }));
    const res = await request.post('/api/orders/order-1/pay').send({});
    expect(res.status).toBe(200);
    expect(res.body.data.gatewayUrl).toContain('A000123');
  });

  it('rejects an already-paid order with 409', async () => {
    state.selectResults.set(orders, [{ ...pendingOrder(), status: 'paid' }]);
    const res = await request.post('/api/orders/order-1/pay').send({});
    expect(res.status).toBe(409);
  });

  it('rejects a shipped order with 409 (no re-paying)', async () => {
    state.selectResults.set(orders, [{ ...pendingOrder(), status: 'shipped' }]);
    const res = await request.post('/api/orders/order-1/pay').send({});
    expect(res.status).toBe(409);
  });

  it('returns 502 when the gateway refuses to issue an authority', async () => {
    state.selectResults.set(orders, [pendingOrder()]);
    fetchMock.mockResolvedValue(jsonResponse({ data: { code: -53 }, errors: [{ code: -53, message: 'Invalid merchant' }] }));
    const res = await request.post('/api/orders/order-1/pay').send({});
    expect(res.status).toBe(502);
  });
});

describe('GET /api/payments/callback (verify)', () => {
  it('verifies, marks paid, and redirects to the success page', async () => {
    // The order must carry the authority the gateway issued at pay time.
    state.selectResults.set(orders, [{ ...pendingOrder(), authority: 'A000123' }]);
    fetchMock.mockResolvedValue(jsonResponse({ data: { code: 100, ref_id: 12345 }, errors: [] }));

    const res = await request
      .get('/api/payments/callback')
      .redirects(0)
      .query({ order: 'order-1', Authority: 'A000123', Status: 'OK' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('status=paid');
    expect(state.updates.some((u) => u.table === orders && (u.data as { status: string }).status === 'paid')).toBe(true);
  });

  it('marks failed on a cancelled payment (Status=NOK)', async () => {
    state.selectResults.set(orders, [pendingOrder()]);
    const res = await request
      .get('/api/payments/callback')
      .redirects(0)
      .query({ order: 'order-1', Authority: 'A000123', Status: 'NOK' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('status=failed');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('marks failed when verification returns a non-success code', async () => {
    state.selectResults.set(orders, [pendingOrder()]);
    fetchMock.mockResolvedValue(jsonResponse({ data: { code: -54 }, errors: [{ code: -54, message: 'not verified' }] }));
    const res = await request
      .get('/api/payments/callback')
      .redirects(0)
      .query({ order: 'order-1', Authority: 'A000123', Status: 'OK' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('status=failed');
  });

  it('marks failed when the gateway call itself errors', async () => {
    state.selectResults.set(orders, [pendingOrder()]);
    fetchMock.mockRejectedValue(new Error('network down'));
    const res = await request
      .get('/api/payments/callback')
      .redirects(0)
      .query({ order: 'order-1', Authority: 'A000123', Status: 'OK' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('status=failed');
  });

  it('redirects to failed when callback params are missing', async () => {
    const res = await request.get('/api/payments/callback').redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('status=failed');
  });
});
