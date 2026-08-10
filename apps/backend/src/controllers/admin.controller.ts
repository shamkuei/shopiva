import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { storeService } from '../services/store.service';
import { productService } from '../services/product.service';

/** Returns the store owned by the authenticated user. */
export const getMyStore = asyncHandler(async (req: Request, res: Response) => {
  const store = await storeService.getById(req.user!.storeId);
  if (!store) throw ApiError.notFound('Store not found');
  res.json({ data: store });
});

/** Lists products belonging to the authenticated user's store. */
export const listMyProducts = asyncHandler(async (req: Request, res: Response) => {
  const products = await productService.listByStore(req.user!.storeId);
  res.json({ data: products });
});
