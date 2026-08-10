import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { orderService, ORDER_STATUSES, type OrderStatus } from '../services/order.service';

/**
 * Admin order management. Every handler is scoped to `req.user.storeId`, so an
 * owner can only see / mutate their own store's orders.
 */

export const list = asyncHandler(async (req: Request, res: Response) => {
  const status =
    typeof req.query.status === 'string' ? (req.query.status as OrderStatus) : undefined;
  if (status && !ORDER_STATUSES.includes(status)) {
    throw ApiError.badRequest(`Invalid status filter: ${status}`);
  }
  res.json({ data: await orderService.listForAdmin(req.user!.storeId, status) });
});

export const pendingCount = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: { count: await orderService.countPending(req.user!.storeId) } });
});

export const detail = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.getDetail(req.user!.storeId, req.params.id as string);
  if (!order) throw ApiError.notFound('Order not found');
  res.json({ data: order });
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = (req.body ?? {}) as { status?: unknown };
  if (typeof status !== 'string' || !ORDER_STATUSES.includes(status as OrderStatus)) {
    throw ApiError.badRequest('status must be one of: ' + ORDER_STATUSES.join(', '));
  }
  const order = await orderService.updateStatus(
    req.user!.storeId,
    req.params.id as string,
    status as OrderStatus,
  );
  if (!order) throw ApiError.notFound('Order not found');
  res.json({ data: order });
});
