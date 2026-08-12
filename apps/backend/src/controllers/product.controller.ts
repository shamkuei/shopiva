import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { productService } from '../services/product.service';

/** Public storefront: list + fetch a single product. */
export const listProducts = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await productService.list() });
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  // Express 5 types params as `string | string[]`; a `/:id` route is always a string.
  const product = await productService.getById(req.params.id as string);
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ data: product });
});
