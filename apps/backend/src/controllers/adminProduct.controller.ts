import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { productService, type ProductWrite } from '../services/product.service';

/**
 * Admin product CRUD. EVERY handler scopes by `req.user.storeId` (set by the
 * auth middleware) — a store can only read/mutate its own products. Cross-store
 * ids simply resolve to "not found".
 */

function pickField(value: unknown): unknown {
  return value === undefined ? undefined : value === null ? null : value;
}

/** Validate + coerce product fields. `requireCore` enforces title + price. */
function parseProductFields(body: unknown, requireCore: boolean): ProductWrite {
  const b = (body ?? {}) as Record<string, unknown>;
  const out = {} as ProductWrite;

  const { title, price, description, imageUrl, stock, category } = b;

  if (title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) throw ApiError.badRequest('title must be a non-empty string');
    out.title = title.trim();
  } else if (requireCore) {
    throw ApiError.badRequest('title is required');
  }

  if (price !== undefined) {
    const n = Number(price);
    if (Number.isNaN(n) || n < 0) throw ApiError.badRequest('price must be a non-negative number');
    out.price = String(price);
  } else if (requireCore) {
    throw ApiError.badRequest('price is required');
  }

  if (description !== undefined) out.description = pickField(description) as string | null;
  if (imageUrl !== undefined) out.imageUrl = pickField(imageUrl) as string | null;

  if (stock !== undefined) {
    const n = Number(stock);
    if (!Number.isInteger(n) || n < 0) throw ApiError.badRequest('stock must be a non-negative integer');
    out.stock = n;
  }

  if (category !== undefined) out.category = pickField(category) as string | null;

  return out;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await productService.listByStore(req.user!.storeId) });
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.getById(req.user!.storeId, req.params.id as string);
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ data: product });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = parseProductFields(req.body, true);
  const product = await productService.create(req.user!.storeId, data);
  res.status(201).json({ data: product });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const data = parseProductFields(req.body, false);
  const product = await productService.update(req.user!.storeId, req.params.id as string, data);
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ data: product });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await productService.delete(req.user!.storeId, req.params.id as string);
  if (!deleted) throw ApiError.notFound('Product not found');
  res.status(204).send();
});

export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('No image file provided (multipart field "image")');
  res.status(201).json({ data: { url: `/uploads/${req.file.filename}` } });
});
