/**
 * Order lifecycle tests: state machine, stock restore on cancel, payment
 * authority binding, and pending-order expiry. Mocked DB.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

const { state } = vi.hoisted(() => ({
  state: {
    selectResults: new Map<unknown, unknown[]>(),
    insertResults: new Map<unknown, unknown[]>(),
    updateResults: new Map<unknown, unknown[]>(),
    updates: [] as Array<{ table: unknown; data: unknown }>,
    now: new Date('2026-08-21T10:00:00Z'),
  },
}));

vi.mock('../src/config/redis', () => ({
  redis: { ping: () => Promise.resolve('PONG'), quit: () => Promise.resolve(), on: () => {} },
}));

vi.mock('../src/db', () => {
  const builder = (table: unknown, kind: 'insert' | 'select' | 'update' | 'delete') => {
    const b: Record<string, unknown> = {
      values: (data: unknown) => { state.updates.push({ table, data }); return b; },
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

import { orders, orderItems, products } from '../src/db/schema';
import { orderService, ORDER_STATUSES } from '../src/services/order.service';
import { ApiError } from '../src/utils/ApiError';

const order = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'o1',
  status: 'pending',
  totalAmount: '100.00',
  discountAmount: '0.00',
  discountCode: null,
  authority: 'AUTH-1',
  refId: null,
  paidAt: null,
  shippedAt: null,
  createdAt: new Date(),
  ...over,
});

beforeEach(() => {
  state.selectResults.clear();
  state.insertResults.clear();
  state.updateResults.clear();
  state.updates = [];
});

describe('state machine', () => {
  it('allows exactly the legal transitions', () => {
    const legal: Array<[string, string, boolean]> = [
      ['pending', 'paid', true],
      ['pending', 'failed', true],
      ['pending', 'cancelled', true],
      ['pending', 'shipped', false],
      ['paid', 'shipped', true],
      ['paid', 'cancelled', true],
      ['paid', 'pending', false],
      ['failed', 'pending', true], // retry
      ['failed', 'cancelled', true],
      ['shipped', 'cancelled', false],
      ['shipped', 'pending', false],
      ['cancelled', 'paid', false],
      ['cancelled', 'pending', false],
    ];
    for (const [from, to, ok] of legal) {
      expect(orderService.canTransition(from as never, to as never), `${from}->${to}`).toBe(ok);
    }
    expect(ORDER_STATUSES).toHaveLength(5);
  });

  it('updateStatus rejects an illegal transition with 409', async () => {
    state.selectResults.set(orders, [order({ status: 'paid' })]);
    await expect(orderService.updateStatus('o1', 'pending')).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('updateStatus to cancelled restores stock', async () => {
    state.selectResults.set(orders, [order({ status: 'paid' })]);
    state.selectResults.set(orderItems, [
      { productId: 'p1', quantity: 2 },
      { productId: 'p2', quantity: 1 },
    ]);
    // The mocked update().returning() must yield a row or the restore is skipped.
    state.updateResults.set(orders, [order({ status: 'cancelled' })]);

    await orderService.updateStatus('o1', 'cancelled');

    // restoreStock issues one UPDATE per line item against `products`.
    const productUpdates = state.updates.filter((u) => u.table === products);
    expect(productUpdates).toHaveLength(2);
  });
});

describe('markPaid authority binding', () => {
  it('rejects a mismatched authority (400)', async () => {
    state.selectResults.set(orders, [order({ authority: 'AUTH-1' })]);
    await expect(orderService.markPaid('o1', 'ref', 'AUTH-OTHER')).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('accepts the matching authority', async () => {
    state.selectResults.set(orders, [order({ authority: 'AUTH-1' })]);
    // The mocked update().returning() resolves to [] — assert no throw and
    // that the paid-status UPDATE was issued with the ref id.
    await orderService.markPaid('o1', 'ref-9', 'AUTH-1');
    const paidUpdate = state.updates.find((u) => u.table === orders && u.data?.status === 'paid');
    expect(paidUpdate?.data).toMatchObject({ status: 'paid', refId: 'ref-9' });
  });

  it('rejects marking a shipped order paid (409)', async () => {
    state.selectResults.set(orders, [order({ status: 'shipped' })]);
    await expect(orderService.markPaid('o1', 'ref', 'AUTH-1')).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});

describe('expirePendingOrders', () => {
  it('cancels stale pending orders via the state machine', async () => {
    // First select: the stale sweep; then updateStatus re-reads the order.
    state.selectResults.set(orders, [order({ id: 'o1', status: 'pending' })]);
    state.insertResults.set(orders, [order({ status: 'cancelled' })]);
    state.selectResults.set(orderItems, []);

    const expired = await orderService.expirePendingOrders(60);
    expect(expired).toEqual(['o1']);
    const statusUpdate = state.updates.find((u) => u.table === orders && u.data?.status === 'cancelled');
    expect(statusUpdate).toBeTruthy();
  });
});

// Touch imports so the mock wiring stays type-checked.
void ApiError;
