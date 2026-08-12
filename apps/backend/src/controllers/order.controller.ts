import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import { orderService } from '../services/order.service';
import * as zarinpalService from '../services/zarinpal.service';

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

  const order = await orderService.createOrder({ items: cleanItems, customer: cleanCustomer });
  res.status(201).json({ data: order });
});

/**
 * Start payment for an order: request an authority from Zarinpal and return the
 * gateway URL the client should redirect the user to.
 */
export const pay = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.getOrderById(req.params.id as string);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.status === 'paid') throw ApiError.badRequest('Order is already paid');

  // The order total is in Toman (the app's unit). Zarinpal needs ≥ 1000 Toman.
  const tomanAmount = Math.round(Number(order.totalAmount));
  if (!Number.isFinite(tomanAmount) || tomanAmount < 1000) {
    throw ApiError.badRequest('Order amount is below the Zarinpal minimum (1000 Toman)');
  }

  const { gatewayUrl, authority } = await zarinpalService
    .requestPayment({
      tomanAmount,
      callbackUrl: `${env.zarinpalCallbackUrl}?order=${order.id}`,
      description: `Order ${order.id}`,
    })
    .catch((err: unknown) => {
      // Upstream gateway failure → 502, surfaced to the client as a clear error.
      throw new ApiError(502, err instanceof Error ? err.message : 'Payment gateway error');
    });

  await orderService.recordAuthority(order.id, authority);

  res.json({ data: { gatewayUrl, authority } });
});
