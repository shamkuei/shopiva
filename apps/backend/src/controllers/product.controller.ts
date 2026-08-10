import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { productService } from '../services/product.service';

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await productService.listByStore(req.store!.id) });
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  // Express 5 types params as `string | string[]`; a `/:id` route is always a string.
  const product = await productService.getById(req.store!.id, req.params.id as string);
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ data: product });
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.create(req.store!.id, req.body);
  res.status(201).json({ data: product });
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await productService.delete(req.store!.id, req.params.id as string);
  if (!deleted) throw ApiError.notFound('Product not found');
  res.status(204).send();
});
