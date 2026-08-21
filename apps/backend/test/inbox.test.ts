/**
 * Public inbox tests (contact + newsletter). Mocked DB.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';

const { state } = vi.hoisted(() => ({
  state: {
    inserts: [] as Array<{ table: unknown; data: unknown }>,
  },
}));

vi.mock('../src/config/redis', () => ({
  redis: { ping: () => Promise.resolve('PONG'), quit: () => Promise.resolve(), on: () => {} },
}));

vi.mock('../src/db', () => {
  const b: Record<string, unknown> = {
    values: (data: unknown) => { state.inserts.push({ table: 'any', data }); return b; },
    onConflictDoNothing: () => b,
    then: (resolve: (v: unknown) => void) => Promise.resolve([]).then(resolve),
  };
  return { db: { insert: () => b }, client: { end: () => Promise.resolve() } };
});

import { contactMessages, newsletterSubscribers } from '../src/db/schema';

let request: ReturnType<typeof import('supertest')['default']>;

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
  request = supertest(createApp());
});

describe('POST /api/contact', () => {
  const valid = {
    name: 'علی رضایی',
    email: 'ali@example.com',
    subject: 'پشتیبانی سفارش',
    message: 'سفارش من هنوز نرسیده است، لطفاً بررسی کنید.',
  };

  it('stores a valid message (201)', async () => {
    const res = await request.post('/api/contact').send(valid);
    expect(res.status).toBe(201);
    const insert = state.inserts.at(-1);
    expect(insert?.data).toMatchObject({
      name: 'علی رضایی',
      email: 'ali@example.com',
      subject: 'پشتیبانی سفارش',
    });
  });

  it('rejects a missing name (400)', async () => {
    const res = await request.post('/api/contact').send({ ...valid, name: ' ' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid email (400)', async () => {
    const res = await request.post('/api/contact').send({ ...valid, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('rejects a too-short message (400)', async () => {
    const res = await request.post('/api/contact').send({ ...valid, message: 'کوتاه' });
    expect(res.status).toBe(400);
  });

  it('defaults the subject when empty', async () => {
    const res = await request.post('/api/contact').send({ ...valid, subject: '' });
    expect(res.status).toBe(201);
    expect(state.inserts.at(-1)?.data).toMatchObject({ subject: 'سؤال عمومی' });
  });
});

describe('POST /api/newsletter/subscribe', () => {
  it('stores a normalized email (201)', async () => {
    const res = await request
      .post('/api/newsletter/subscribe')
      .send({ email: '  Ali@Example.COM ' });
    expect(res.status).toBe(201);
    expect(state.inserts.at(-1)?.data).toMatchObject({ email: 'ali@example.com' });
  });

  it('rejects an invalid email (400)', async () => {
    const res = await request.post('/api/newsletter/subscribe').send({ email: 'nope' });
    expect(res.status).toBe(400);
  });
});

// Reference the imported tables so lint stays happy if unused vars trip it.
void contactMessages;
void newsletterSubscribers;
