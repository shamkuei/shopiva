import { eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { coupons, type Coupon } from '../db/schema';
import { ApiError } from '../utils/ApiError';

/**
 * Coupon (discount-code) domain logic.
 *
 * Discounts are whole-percent only. Validation is authoritative on the
 * server: the client may preview a code, but `createOrder` re-validates
 * inside its transaction — a code that expired or ran out between preview
 * and checkout still fails the order with a clear error.
 */

export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export type CouponView = {
  code: string;
  percentOff: number;
};

/** Reusable validity check; throws ApiError with a Persian, user-facing message. */
function assertUsable(coupon: Coupon): void {
  if (!coupon.active) {
    throw ApiError.badRequest('این کد تخفیف غیرفعال است.');
  }
  if (coupon.expiresAt && coupon.expiresAt.getTime() <= Date.now()) {
    throw ApiError.badRequest('این کد تخفیف منقضی شده است.');
  }
  if (coupon.maxRedemptions !== null && coupon.timesRedeemed >= coupon.maxRedemptions) {
    throw ApiError.badRequest('ظرفیت استفاده از این کد تخفیف تکمیل شده است.');
  }
}

export const couponService = {
  /** Public preview: does this code currently work? Returns the percent. */
  async validate(code: string): Promise<CouponView> {
    const normalized = normalizeCouponCode(code);
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, normalized))
      .limit(1);

    if (!coupon) throw ApiError.notFound('چنین کد تخفیفی وجود ندارد.');
    assertUsable(coupon);
    return { code: coupon.code, percentOff: coupon.percentOff };
  },

  /**
   * Apply a coupon inside the caller's transaction and compute the discount.
   * Locks the coupon row (FOR UPDATE) so concurrent checkouts can't exceed
   * maxRedemptions. Does NOT increment usage — that happens on payment
   * (markPaid); abandoned orders must not consume redemptions.
   */
  async applyWithinTransaction(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    code: string,
    subtotalToman: number,
  ): Promise<{ code: string; discountAmount: number }> {
    const normalized = normalizeCouponCode(code);
    const [coupon] = await tx
      .select()
      .from(coupons)
      .where(eq(coupons.code, normalized))
      .for('update');

    if (!coupon) throw ApiError.badRequest('چنین کد تخفیفی وجود ندارد.');
    assertUsable(coupon);

    // Integer Toman math: floor so the payable amount rounds predictably.
    const discountAmount = Math.floor((subtotalToman * coupon.percentOff) / 100);
    if (discountAmount > subtotalToman) throw ApiError.badRequest('کد تخفیف نامعتبر است.');

    return { code: coupon.code, discountAmount };
  },

  /**
   * Count one redemption. Called when an order is actually PAID (not when
   * it's merely created — pending/abandoned orders keep their capacity).
   */
  async recordRedemption(code: string): Promise<void> {
    await db
      .update(coupons)
      .set({ timesRedeemed: sql`${coupons.timesRedeemed} + 1` })
      .where(eq(coupons.code, code));
  },
};
