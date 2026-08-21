/**
 * Toman/Rial money tests + end-to-end amount consistency.
 *
 * Verifies the three amounts the user cares about are exactly consistent:
 *   1. what the customer is shown (the order total, in Toman),
 *   2. what is recorded on the order (orders.total_amount, Toman),
 *   3. what is sent to Zarinpal (request AND verify, converted to Rial),
 * with no rounding errors and the correct ×10 conversion.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import {
  toZarinpalAmount,
  fromZarinpalAmount,
  RIALS_PER_TOMAN,
} from '../src/utils/money';

// ── Unit tests for the single conversion point ───────────────────────────────

describe('toZarinpalAmount (Toman -> Rial)', () => {
  it('multiplies by RIALS_PER_TOMAN exactly', () => {
    expect(RIALS_PER_TOMAN).toBe(10);
    expect(toZarinpalAmount(150000)).toBe(1500000);
    expect(toZarinpalAmount(0)).toBe(0);
    expect(toZarinpalAmount(1)).toBe(10);
  });

  it('has no float drift on large amounts', () => {
    // amounts big enough that a sloppy (*10 with rounding) could drift
    expect(toZarinpalAmount(123456789)).toBe(1234567890);
    expect(toZarinpalAmount(9999999)).toBe(99999990);
    expect(toZarinpalAmount(20000000)).toBe(200000000);
  });

  it('rejects fractional Toman (no rounding allowed)', () => {
    expect(() => toZarinpalAmount(150000.5)).toThrow();
    expect(() => toZarinpalAmount(99.99)).toThrow();
  });

  it('round-trips through fromZarinpalAmount with no loss', () => {
    expect(fromZarinpalAmount(toZarinpalAmount(6300000))).toBe(6300000);
    expect(fromZarinpalAmount(toZarinpalAmount(1))).toBe(1);
  });
});

// ── End-to-end consistency (customer -> order -> Zarinpal) ───────────────────

const { state } = vi.hoisted(() => ({
  state: {
    selectResults: new Map<unknown, unknown[]>(),
    insertResults: new Map<unknown, unknown[]>(),
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

import { products, orders } from '../src/db/schema';

let request: ReturnType<typeof import('supertest')['default']>;
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function jsonResponse(body: unknown, status = 200): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as unknown as Response;
}

/** Parse the JSON body of the Nth fetch call (the Zarinpal request/verify). */
function fetchBody(callIndex: number): Record<string, unknown> {
  const args = fetchMock.mock.calls[callIndex];
  return JSON.parse(String(args?.[1]?.body)) as Record<string, unknown>;
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
  state.insertResults.clear();
  fetchMock.mockReset();
});

describe('customer -> order -> Zarinpal amount consistency', () => {
  it('the shown, recorded, and Zarinpal amounts are exactly consistent', async () => {
    // Two products, integer Toman prices.
    const p1 = { id: 'p1', title: 'هدفون', description: null, price: '2990000', imageUrl: null, stock: 10, category: null, createdAt: new Date() };
    const p2 = { id: 'p2', title: 'ماگ', description: null, price: '320000', imageUrl: null, stock: 10, category: null, createdAt: new Date() };
    // Customer orders 2× p1 + 1× p2 = 6,300,000 Toman.
    const expectedToman = 2 * 2990000 + 1 * 320000; // 6300000

    // 1) Create the order. createOrder computes the total from DB prices.
    state.selectResults.set(products, [p1, p2]);
    state.insertResults.set(orders, [
      { id: 'order-1', status: 'pending', totalAmount: String(expectedToman), discountAmount: '0.00', discountCode: null, customerName: 'Jane', customerPhone: null, customerAddress: null, authority: null, refId: null, paidAt: null, shippedAt: null, createdAt: new Date() },
    ]);

    const createRes = await request.post('/api/orders').send({
      items: [{ productId: 'p1', quantity: 2 }, { productId: 'p2', quantity: 1 }],
      customer: { name: 'Jane' },
    });
    expect(createRes.status).toBe(201);

    // (1) Recorded on the order = the integer Toman the customer agreed to.
    const orderToman = Number(createRes.body.data.totalAmount);
    expect(orderToman).toBe(expectedToman); // shown basis == recorded
    expect(Number.isInteger(orderToman)).toBe(true);

    // 2) Start payment -> Zarinpal request.
    // After pay() records the authority, subsequent order reads (the callback
    // re-reads it) must return the authority the gateway issued.
    state.selectResults.set(orders, [
      { ...(createRes.body.data as object), authority: 'A0001' } as never,
    ]);
    fetchMock.mockResolvedValue(jsonResponse({ data: { code: 100, authority: 'A0001' }, errors: [] }));

    const payRes = await request.post('/api/orders/order-1/pay').send({});
    expect(payRes.status).toBe(200);

    // (2) Zarinpal REQUEST amount = Toman × 10 (Rial), currency IRR.
    const requestBody = fetchBody(0);
    const requestAmount = Number(requestBody.amount);
    expect(requestBody.currency).toBe('IRR');
    expect(requestAmount).toBe(toZarinpalAmount(orderToman));
    expect(requestAmount).toBe(expectedToman * 10);

    // 3) Callback -> Zarinpal verify.
    fetchMock.mockResolvedValue(jsonResponse({ data: { code: 100, ref_id: 12345 }, errors: [] }));
    const cbRes = await request
      .get('/api/payments/callback')
      .redirects(0)
      .query({ order: 'order-1', Authority: 'A0001', Status: 'OK' });
    expect(cbRes.status).toBe(302);

    // (3) Zarinpal VERIFY amount uses the SAME conversion -> identical to request.
    const verifyBody = fetchBody(1);
    const verifyAmount = Number(verifyBody.amount);
    expect(verifyAmount).toBe(requestAmount); // request == verify
    expect(verifyAmount).toBe(toZarinpalAmount(orderToman));

    // (4) Round-trips back to the original Toman with no rounding loss.
    expect(fromZarinpalAmount(requestAmount)).toBe(orderToman);
    expect(fromZarinpalAmount(requestAmount)).toBe(expectedToman);
  });
});
