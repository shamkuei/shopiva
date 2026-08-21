import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { db } from '../db';
import { contactMessages, newsletterSubscribers } from '../db/schema';

/**
 * Public inbox endpoints: contact-form messages and newsletter signups.
 * Writes only — reading/managing them is admin territory.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROL_CHARS = new RegExp(`[${String.fromCharCode(0)}-${String.fromCharCode(31)}]`, 'g');

/** Strip control characters + collapse whitespace; trim to a max length. */
function clean(raw: unknown, maxLength: number): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(CONTROL_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;

  const name = clean(body.name, 120);
  const email = clean(body.email, 255).toLowerCase();
  const subject = clean(body.subject, 120) || 'سؤال عمومی';
  const message = clean(body.message, 5000);

  if (!name) throw ApiError.badRequest('نام الزامی است.');
  if (!EMAIL_RE.test(email)) throw ApiError.badRequest('ایمیل معتبر وارد کنید.');
  if (!message) throw ApiError.badRequest('متن پیام الزامی است.');
  if (message.length < 10) throw ApiError.badRequest('متن پیام کوتاه است — کمی بیشتر توضیح دهید.');

  await db.insert(contactMessages).values({ name, email, subject, message });
  res.status(201).json({ data: { ok: true } });
});

export const subscribe = asyncHandler(async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const email = clean(body.email, 255).toLowerCase();

  if (!EMAIL_RE.test(email)) throw ApiError.badRequest('ایمیل معتبر وارد کنید.');

  // Idempotent: a known address is a success, not an error.
  await db
    .insert(newsletterSubscribers)
    .values({ email })
    .onConflictDoNothing({ target: newsletterSubscribers.email });

  res.status(201).json({ data: { ok: true } });
});
