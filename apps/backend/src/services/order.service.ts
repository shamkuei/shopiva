import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db';
import { orders, orderItems, products, type Order } from '../db/schema';
import { ApiError } from '../utils/ApiError';

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
   *
   * Correctness/security guarantees:
   *  - Products are read from the DB scoped to `storeId` (no cross-store
   *    ordering) and locked `FOR UPDATE` to prevent overselling under concurrency.
   *  - `unitPrice` and `totalAmount` are computed from DB prices — the client
   *    never supplies them.
   *  - Stock is validated and decremented inside the same transaction; any
   *    shortage rolls the whole order back.
   */
  async createOrder(storeId: string, input: CreateOrderInput): Promise<Order> {
    const ids = input.items.map((i) => i.productId);

    return db.transaction(async (tx) => {
      // Lock the relevant product rows for the duration of the transaction.
      const rows = await tx
        .select()
        .from(products)
        .where(and(eq(products.storeId, storeId), inArray(products.id, ids)))
        .for('update');

      const byId = new Map(rows.map((p) => [p.id, p]));

      let total = 0;
      const itemRows: Array<{ productId: string; quantity: number; unitPrice: string }> = [];

      for (const item of input.items) {
        const product = byId.get(item.productId);
        if (!product) {
          throw ApiError.badRequest(`Product ${item.productId} is not available in this store`);
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

      const [order] = await tx
        .insert(orders)
        .values({
          storeId,
          status: 'pending',
          totalAmount: total.toFixed(2),
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

  /** Lookup scoped to a tenant (used by the pay endpoint). */
  async getOrderForStore(storeId: string, id: string): Promise<Order | null> {
    const rows = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.storeId, storeId)))
      .limit(1);
    return rows[0] ?? null;
  },

  /** Lookup by id only — the gateway callback has no tenant context, but it
   *  carries an unguessable order id and is verified by Zarinpal server-side. */
  async getOrderById(id: string): Promise<Order | null> {
    const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async recordAuthority(orderId: string, authority: string): Promise<void> {
    await db.update(orders).set({ authority }).where(eq(orders.id, orderId));
  },

  async markPaid(orderId: string, refId?: string): Promise<void> {
    await db
      .update(orders)
      .set({ status: 'paid', refId: refId ?? null })
      .where(eq(orders.id, orderId));
  },

  async markFailed(orderId: string): Promise<void> {
    await db.update(orders).set({ status: 'failed' }).where(eq(orders.id, orderId));
  },

  // ── Admin (store-scoped) ──────────────────────────────────────

  /** List a store's orders, optionally filtered by status (newest first). */
  listForAdmin(storeId: string, status?: OrderStatus): Promise<Order[]> {
    return db
      .select()
      .from(orders)
      .where(
        status ? and(eq(orders.storeId, storeId), eq(orders.status, status)) : eq(orders.storeId, storeId),
      )
      .orderBy(desc(orders.createdAt));
  },

  /** Order + line items (with product titles) for the detail page. */
  async getDetail(storeId: string, orderId: string): Promise<OrderDetail | null> {
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.storeId, storeId)))
      .limit(1);
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

  async countPending(storeId: string): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(eq(orders.storeId, storeId), eq(orders.status, 'pending')));
    return row?.count ?? 0;
  },

  /** Change an order's status. Scoped to the store; foreign ids → null. */
  async updateStatus(storeId: string, orderId: string, status: OrderStatus): Promise<Order | null> {
    const [row] = await db
      .update(orders)
      .set({ status })
      .where(and(eq(orders.id, orderId), eq(orders.storeId, storeId)))
      .returning();
    return row ?? null;
  },
};
