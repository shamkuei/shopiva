import { desc, eq, inArray, sql } from 'drizzle-orm';
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

  async markPaid(orderId: string, refId?: string): Promise<void> {
    const [order] = await db
      .update(orders)
      .set({ status: 'paid', refId: refId ?? null, paidAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    // Count the coupon redemption only once payment actually succeeded.
    if (order?.discountCode) {
      await couponService.recordRedemption(order.discountCode);
    }
  },

  async markFailed(orderId: string): Promise<void> {
    await db.update(orders).set({ status: 'failed' }).where(eq(orders.id, orderId));
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

  async updateStatus(orderId: string, status: OrderStatus): Promise<Order | null> {
    // Stamp the real event time so the tracking timeline never fabricates dates.
    const patch: Partial<typeof orders.$inferInsert> = { status };
    if (status === 'paid') patch.paidAt = new Date();
    if (status === 'shipped') patch.shippedAt = new Date();

    const [row] = await db
      .update(orders)
      .set(patch)
      .where(eq(orders.id, orderId))
      .returning();
    return row ?? null;
  },
};
