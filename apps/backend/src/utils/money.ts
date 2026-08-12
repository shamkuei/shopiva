/**
 * Monetary helpers. The whole app uses TOMAN (۱ تومان = ۱۰ ریال).
 *
 * Prices/amounts are integer Toman values everywhere — in the database
 * (products.price, orders.total_amount, order_items.unit_price), in the UI
 * ("… تومان"), in the admin price inputs, and on orders. The ONLY place a
 * Toman↔Rial conversion happens is `toZarinpalAmount`, right at the gateway
 * boundary, so the conversion stays in one traceable spot.
 */

/** 1 Toman = 10 Rial. Fixed by definition. */
export const RIALS_PER_TOMAN = 10;

/**
 * Convert a Toman amount into the unit Zarinpal expects.
 *
 * Zarinpal's v4 API reads `amount` as RIAL when `currency` is `"IRR"` — and
 * also when `currency` is omitted (the default). The Zarinpal service therefore
 * sends `currency: "IRR"` together with this converted amount:
 *
 *   gateway amount (Rial) = Toman amount × 10
 *
 * This is the SINGLE place that knows Zarinpal's unit. To charge in Toman
 * directly instead, switch the service to `currency: "IRT"` and make this the
 * identity (`return toman`) — change ONLY this function.
 *
 * @param toman integer Toman amount (there is no fractional Toman)
 * @returns exact integer Rial amount — multiplication by 10 never rounds
 */
export function toZarinpalAmount(toman: number): number {
  if (!Number.isInteger(toman)) {
    throw new Error(`toZarinpalAmount expects an integer Toman amount, got: ${toman}`);
  }
  return toman * RIALS_PER_TOMAN;
}

/**
 * Inverse of `toZarinpalAmount` (Rial → Toman). Mainly for assertions/tests.
 * Throws if the Rial amount isn't a whole number of Toman.
 */
export function fromZarinpalAmount(rial: number): number {
  if (!Number.isInteger(rial) || rial % RIALS_PER_TOMAN !== 0) {
    throw new Error(`fromZarinpalAmount expects a Rial amount divisible by ${RIALS_PER_TOMAN}, got: ${rial}`);
  }
  return rial / RIALS_PER_TOMAN;
}
