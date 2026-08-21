import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import { db } from '../db';
import { orders, orderItems, products, type Order } from '../db/schema';
import { ApiError } from '../utils/ApiError';
import { couponService } from './coupon.service';

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'shipped' | 'cancelled';
export const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'paid',
  'failed',
  'shipped',
  'cancelled',
];

/**
 * Order state machine. Every transition must be listed here; anything else is
 * a 409. Terminal states (shipped/cancelled) have no outgoing edges.
 *
 *   pending ──▶ paid ──▶ shipped
 *      │
 *      ├──▶ failed ──▶ pending   (customer retries payment)
 *      └──▶ cancelled
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'failed', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  failed: ['pending', 'cancelled'],
  shipped: [],
  cancelled: [],
};

export interface OrderItemInput {
  productId: string;
  quantity: number;
}

export interface CreateOrderInput {
  items: OrderItemInput[];
  customer: { name: string; phone?: string | null; address?: string | null };
  /** Optional discount code; validated + applied server-side. */
  discountCode?: string;
}

export type OrderDetail = Order & {
  items: Array<{
    id: string;
    orderId: string;
    productId: string;
    quantity: number;
    unitPrice: string;
    productTitle: string;
  }>;
};

export const orderService = {
  /** State-machine check: may `from` move to `to`? */
  canTransition(from: OrderStatus, to: OrderStatus): boolean {
    return ALLOWED_TRANSITIONS[from].includes(to);
  },

  /**
   * Restore the reserved stock of an order's items (SQL-side math). Called
   * when an order leaves the stock-holding states — a cancelled or
   * expired-abandoned order must give its inventory back.
   */
  async restoreStock(orderId: string): Promise<void> {
    const items = await db
      .select({ productId: orderItems.productId, quantity: orderItems.quantity })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    for (const item of items) {
      await db
        .update(products)
        .set({ stock: sql`${products.stock} + ${item.quantity}` })
        .where(eq(products.id, item.productId));
    }
  },
  /**
   * Create an Order + its OrderItems in a single transaction.
   * Products are locked FOR UPDATE (prevent overselling), prices come from the
   * DB (never the client), and stock is validated + decremented atomically.
   */
  async createOrder(input: CreateOrderInput): Promise<Order> {
    const ids = input.items.map((i) => i.productId);

    return db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(products)
        .where(inArray(products.id, ids))
        .for('update');

      const byId = new Map(rows.map((p) => [p.id, p]));

      let total = 0;
      const itemRows: Array<{ productId: string; quantity: number; unitPrice: string }> = [];

      for (const item of input.items) {
        const product = byId.get(item.productId);
        if (!product) {
          throw ApiError.badRequest(`Product ${item.productId} is not available`);
        }
        if (product.stock < item.quantity) {
          throw ApiError.conflict(
            `Insufficient stock for "${product.title}" (requested ${item.quantity}, available ${product.stock})`,
          );
        }
        total += Number(product.price) * item.quantity;
        itemRows.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.price, // from the DB, never the client
        });
      }

      // Optional discount: validated and applied INSIDE the same transaction
      // (row-locked) so the stored amounts are always server-authoritative.
      let discountAmount = 0;
      let discountCode: string | null = null;
      if (input.discountCode?.trim()) {
        const applied = await couponService.applyWithinTransaction(
          tx,
          input.discountCode,
          total,
        );
        discountAmount = applied.discountAmount;
        discountCode = applied.code;
      }

      const [order] = await tx
        .insert(orders)
        .values({
          status: 'pending',
          // Gross subtotal; payable = totalAmount − discountAmount.
          totalAmount: total.toFixed(2),
          discountAmount: discountAmount.toFixed(2),
          discountCode,
          customerName: input.customer.name,
          customerPhone: input.customer.phone ?? null,
          customerAddress: input.customer.address ?? null,
        })
        .returning();

      if (itemRows.length > 0) {
        await tx.insert(orderItems).values(
          itemRows.map((i) => ({
            orderId: order.id,
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        );
      }

      // Decrement stock atomically (SQL-side math, no race with the read above).
      for (const item of input.items) {
        await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }

      return order;
    });
  },

  async getOrderById(id: string): Promise<Order | null> {
    const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async recordAuthority(orderId: string, authority: string): Promise<void> {
    await db.update(orders).set({ authority }).where(eq(orders.id, orderId));
  },

  /**
   * Mark an order paid (payment-verified path). Guards: the order must be
   * `pending` (or a `failed` retry) and the callback's authority must match
   * the one the gateway issued for THIS order — a mismatched or replayed
   * authority is rejected, closing the verification gap.
   */
  async markPaid(orderId: string, refId?: string, expectAuthority?: string): Promise<Order | null> {
    const order = await this.getOrderById(orderId);
    if (!order) return null;

    if (expectAuthority && order.authority && order.authority !== expectAuthority) {
      throw ApiError.badRequest('Payment authority does not match this order');
    }
    if (!this.canTransition(order.status, 'paid')) {
      throw ApiError.conflict(`Cannot mark a ${order.status} order as paid`);
    }

    const [updated] = await db
      .update(orders)
      .set({ status: 'paid', refId: refId ?? null, paidAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    // Count the coupon redemption only once payment actually succeeded.
    if (updated?.discountCode) {
      await couponService.recordRedemption(updated.discountCode);
    }
    return updated ?? null;
  },

  /** Mark an order failed (gateway rejection/cancel). Stock stays reserved —
   *  the customer may retry payment from the failed state. */
  async markFailed(orderId: string): Promise<Order | null> {
    const order = await this.getOrderById(orderId);
    if (!order || !this.canTransition(order.status, 'failed')) return order ?? null;

    const [updated] = await db
      .update(orders)
      .set({ status: 'failed' })
      .where(eq(orders.id, orderId))
      .returning();
    return updated ?? null;
  },

  // ── Admin ──────────────────────────────────────────────────────

  /** List orders, optionally filtered by status (newest first). */
  listForAdmin(status?: OrderStatus): Promise<Order[]> {
    return db
      .select()
      .from(orders)
      .where(status ? eq(orders.status, status) : undefined)
      .orderBy(desc(orders.createdAt));
  },

  /** Order + line items (with product titles) for the detail page. */
  async getDetail(orderId: string): Promise<OrderDetail | null> {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return null;

    const items = await db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        productTitle: products.title,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, orderId));

    return { ...order, items };
  },

  async countPending(): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(eq(orders.status, 'pending'));
    return row?.count ?? 0;
  },

  /**
   * Admin status change, constrained by the state machine. Cancelling an
   * order that still holds stock (pending/paid/failed) restores it.
   */
  async updateStatus(orderId: string, status: OrderStatus): Promise<Order | null> {
    const order = await this.getOrderById(orderId);
    if (!order) return null;

    if (!this.canTransition(order.status, status)) {
      throw ApiError.conflict(`Cannot change order from ${order.status} to ${status}`);
    }

    // Stamp the real event time so the tracking timeline never fabricates dates.
    const patch: Partial<typeof orders.$inferInsert> = { status };
    if (status === 'paid') patch.paidAt = new Date();
    if (status === 'shipped') patch.shippedAt = new Date();

    const [row] = await db
      .update(orders)
      .set(patch)
      .where(eq(orders.id, orderId))
      .returning();

    // Leaving the stock-holding states for `cancelled` gives inventory back.
    if (status === 'cancelled' && row) {
      await this.restoreStock(orderId);
    }
    return row ?? null;
  },

  /**
   * Expire pending orders older than `ttlMinutes`: mark them cancelled and
   * restore their stock. Returns the ids of the expired orders. Safe to run
   * repeatedly — already-expired orders no longer match the filter.
   */
  async expirePendingOrders(ttlMinutes: number): Promise<string[]> {
    const cutoff = new Date(Date.now() - ttlMinutes * 60 * 1000);
    const stale = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.status, 'pending'), lt(orders.createdAt, cutoff)));

    const expired: string[] = [];
    for (const { id } of stale) {
      try {
        await this.updateStatus(id, 'cancelled');
        expired.push(id);
      } catch {
        // Raced with a payment/other transition — fine, it's no longer stale.
      }
    }
    return expired;
  },
};
