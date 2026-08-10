import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { storeService } from '../services/store.service';

// Store-level admin actions. Product management lives in adminProduct.controller.
// All handlers here are reached only after `requireAuth` (/api/admin mount).

/** Returns the store owned by the authenticated user. */
export const getMyStore = asyncHandler(async (req: Request, res: Response) => {
  const store = await storeService.getById(req.user!.storeId);
  if (!store) throw ApiError.notFound('Store not found');
  res.json({ data: store });
});
