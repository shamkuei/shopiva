import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { couponService } from '../services/coupon.service';

/**
 * Public coupon preview: does this code work right now, and for what percent?
 * Checkout re-validates server-side at order creation — this is UX only.
 */
export const validate = asyncHandler(async (req: Request, res: Response) => {
  const view = await couponService.validate(req.params.code as string);
  res.json({ data: view });
});
