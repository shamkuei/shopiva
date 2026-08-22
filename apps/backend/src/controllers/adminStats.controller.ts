import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { db } from '../db';
import { orders, products } from '../db/schema';
import { asc, lte, sql } from 'drizzle-orm';

/**
 * Dashboard metrics for the admin panel. Staff-gated.
 *
 * Revenue = sum of PAYABLE amounts (total − discount) across paid+shipped
 * orders — money actually received, not gross cart value.
 */

// Products at or below this stock are "low" for the alert list.
const LOW_STOCK_THRESHOLD = 5;

export const stats = asyncHandler(async (_req: Request, res: Response) => {
  const [byStatus] = await db
    .select({
      status: orders.status,
      count: sql<number>`count(*)::int`,
      payable: sql<string>`coalesce(sum(${orders.totalAmount} - ${orders.discountAmount}), 0)::text`,
    })
    .from(orders)
    .groupBy(orders.status);

  const lowStock = await db
    .select({
      id: products.id,
      title: products.title,
      stock: products.stock,
    })
    .from(products)
    .where(lte(products.stock, LOW_STOCK_THRESHOLD))
    .orderBy(asc(products.stock))
    .limit(10);

  const [productCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products);

  // `byStatus` collapses one row per status (the mock/test layer may return a
  // single aggregated row); normalize both shapes into a map.
  const rows = Array.isArray(byStatus) ? byStatus : [byStatus];
  const statusMap = new Map(rows.filter(Boolean).map((r) => [r.status, r]));

  const paidRevenue =
    (Number(statusMap.get('paid')?.payable ?? 0) || 0) +
    (Number(statusMap.get('shipped')?.payable ?? 0) || 0);

  res.json({
    data: {
      revenue: paidRevenue.toFixed(2),
      ordersByStatus: {
        pending: statusMap.get('pending')?.count ?? 0,
        paid: statusMap.get('paid')?.count ?? 0,
        failed: statusMap.get('failed')?.count ?? 0,
        shipped: statusMap.get('shipped')?.count ?? 0,
        cancelled: statusMap.get('cancelled')?.count ?? 0,
      },
      productCount: productCount?.count ?? 0,
      lowStock,
    },
  });
});
