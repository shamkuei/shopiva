import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { env } from '../config/env';
import { orderService } from '../services/order.service';
import * as zarinpalService from '../services/zarinpal.service';

/** Coerce a (possibly array) query param into a single non-empty string. */
function qp(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length) return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

function resultUrl(orderId: string | undefined, status: 'paid' | 'failed', refId?: string): string {
  const params = new URLSearchParams();
  if (orderId) params.set('orderId', orderId);
  params.set('status', status);
  if (refId) params.set('ref', refId);
  return `${env.webUrl}/payment/result?${params.toString()}`;
}

/**
 * Zarinpal redirects the user's browser here with `Authority` and `Status`. We
 * verify the transaction with Zarinpal (the trusted check) and then redirect to
 * the frontend result page. Cancelled/failed payments are handled gracefully —
 * the order is marked `failed` and the user can retry.
 */
export const callback = asyncHandler(async (req: Request, res: Response) => {
  const orderId = qp(req.query.order);
  const authority = qp(req.query.Authority);
  const status = qp(req.query.Status);

  if (!orderId || !authority) {
    return res.redirect(resultUrl(orderId, 'failed'));
  }

  const order = await orderService.getOrderById(orderId);
  if (!order) {
    return res.redirect(resultUrl(orderId, 'failed'));
  }

  // Status !== 'OK' => the user cancelled or the gateway rejected upfront.
  if (status !== 'OK') {
    await orderService.markFailed(order.id);
    return res.redirect(resultUrl(order.id, 'failed'));
  }

  const amount = Math.round(Number(order.totalAmount));

  // If the gateway call itself blows up, treat it as a failed payment so the
  // user still lands on a result page rather than a JSON 500.
  const result = await zarinpalService
    .verifyPayment({ amount, authority })
    .catch(() => null);

  if (!result) {
    await orderService.markFailed(order.id);
    return res.redirect(resultUrl(order.id, 'failed'));
  }

  if (result.verified) {
    await orderService.markPaid(order.id, result.refId);
    return res.redirect(resultUrl(order.id, 'paid', result.refId));
  }

  await orderService.markFailed(order.id);
  return res.redirect(resultUrl(order.id, 'failed'));
});
