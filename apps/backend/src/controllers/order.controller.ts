import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import { orderService } from '../services/order.service';
import * as zarinpalService from '../services/zarinpal.service';

/** Public checkout: create an Order + OrderItems (status `pending`). */
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const { items, customer, discountCode } = (req.body ?? {}) as {
    items?: unknown;
    customer?: unknown;
    discountCode?: unknown;
  };

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

  const cleanDiscountCode =
    typeof discountCode === 'string' && discountCode.trim() ? discountCode.trim() : undefined;

  const order = await orderService.createOrder({
    items: cleanItems,
    customer: cleanCustomer,
    discountCode: cleanDiscountCode,
  });
  res.status(201).json({ data: order });
});

/**
 * Start payment for an order: request an authority from Zarinpal and return the
 * gateway URL the client should redirect the user to.
 */
export const pay = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.getOrderById(req.params.id as string);
  if (!order) throw ApiError.notFound('Order not found');
  // Only pending or failed-retry orders can start a payment. This blocks
  // re-paying shipped/cancelled orders outright.
  if (order.status !== 'pending' && order.status !== 'failed') {
    throw ApiError.conflict(`Cannot pay an order that is ${order.status}`);
  }

  // The PAYABLE amount (gross − discount) is in Toman (the app's unit).
  // Zarinpal needs ≥ 1000 Toman.
  const tomanAmount = Math.round(Number(order.totalAmount) - Number(order.discountAmount ?? 0));
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

/**
 * Public order tracking by id. Returns a deliberately minimal subset —
 * status, timestamps, total and line-item titles/quantities — never the
 * customer's name, phone or address (anyone with the id can call this).
 */
export const track = asyncHandler(async (req: Request, res: Response) => {
  const detail = await orderService.getDetail(req.params.id as string);
  if (!detail) throw ApiError.notFound('Order not found');

  res.json({
    data: {
      id: detail.id,
      status: detail.status,
      totalAmount: detail.totalAmount,
      discountAmount: detail.discountAmount,
      discountCode: detail.discountCode,
      createdAt: detail.createdAt,
      paidAt: detail.paidAt,
      shippedAt: detail.shippedAt,
      refId: detail.refId,
      items: detail.items.map((it) => ({
        productId: it.productId,
        title: it.productTitle,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      })),
    },
  });
});
