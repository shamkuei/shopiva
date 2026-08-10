import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { orderService } from '../services/order.service';

/** Public checkout: create an Order + OrderItems (status `pending`). */
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const { items, customer } = (req.body ?? {}) as { items?: unknown; customer?: unknown };

  if (!Array.isArray(items) || items.length === 0) {
    throw ApiError.badRequest('items must be a non-empty array');
  }

  const cleanItems = (items as unknown[]).map((raw, idx) => {
    const it = raw as { productId?: unknown; quantity?: unknown };
    if (typeof it.productId !== 'string' || !it.productId) {
      throw ApiError.badRequest(`items[${idx}].productId is required`);
    }
    const quantity = Number(it.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw ApiError.badRequest(`items[${idx}].quantity must be a positive integer`);
    }
    return { productId: it.productId, quantity };
  });

  const c = (customer ?? {}) as { name?: unknown; phone?: unknown; address?: unknown };
  if (typeof c.name !== 'string' || !c.name.trim()) {
    throw ApiError.badRequest('customer.name is required');
  }
  const cleanCustomer = {
    name: c.name.trim(),
    phone: typeof c.phone === 'string' && c.phone.trim() ? c.phone.trim() : null,
    address: typeof c.address === 'string' && c.address.trim() ? c.address.trim() : null,
  };

  const order = await orderService.createOrder(req.store!.id, {
    items: cleanItems,
    customer: cleanCustomer,
  });
  res.status(201).json({ data: order });
});
