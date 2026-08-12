import { env } from '../config/env';
import { toZarinpalAmount } from '../utils/money';

/**
 * Thin Zarinpal gateway client (REST v4). Uses Node's global `fetch`.
 *
 * The app is TOMAN throughout. The Toman→Rial conversion happens in ONE place —
 * `toZarinpalAmount` — right before each gateway call. We send `currency:"IRR"`
 * on the request so Zarinpal reads the amount as Rial (its default unit when
 * `currency` is omitted is also Rial, but we set it explicitly to be safe).
 *
 * The gateway enforces a 1000-Toman minimum (checked by the caller, in Toman,
 * before this service is called).
 *
 * Docs: https://www.zarinpal.com/docs/paymentGateway/moreFeatures/currency
 */

const API_BASE = env.zarinpalSandbox
  ? 'https://sandbox.zarinpal.com'
  : 'https://payment.zarinpal.com';

const START_PAY_BASE = env.zarinpalSandbox
  ? 'https://sandbox.zarinpal.com'
  : 'https://www.zarinpal.com';

interface ZarinpalEnvelope<TData> {
  data?: TData;
  errors?: Array<{ code: number; message: string }>;
}

async function post<TData>(path: string, body: Record<string, unknown>): Promise<ZarinpalEnvelope<TData>> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

  // Always try to parse JSON; Zarinpal returns errors as JSON with a non-2xx.
  let json: ZarinpalEnvelope<TData> | null = null;
  try {
    json = (await res.json()) as ZarinpalEnvelope<TData>;
  } catch {
    json = null;
  }
  if (!json) {
    throw new Error(`Zarinpal returned an unexpected response (HTTP ${res.status})`);
  }
  return json;
}

function firstError(errors: Array<{ code: number; message: string }> | undefined, fallback: string): string {
  return errors?.[0]?.message ?? fallback;
}

export interface PaymentRequestInput {
  /** Integer Toman amount (the app's unit). Converted to Rial for the gateway. */
  tomanAmount: number;
  callbackUrl: string;
  description: string;
  email?: string;
  mobile?: string;
}

export interface PaymentRequestResult {
  authority: string;
  gatewayUrl: string;
}

/** Request a payment authority + the gateway URL the user should be sent to. */
export async function requestPayment(input: PaymentRequestInput): Promise<PaymentRequestResult> {
  if (!env.zarinpalMerchantId) {
    throw new Error('ZARINPAL_MERCHANT_ID is not configured');
  }

  const metadata: Record<string, string> = {};
  if (input.email) metadata.email = input.email;
  if (input.mobile) metadata.mobile = input.mobile;

  const json = await post<{ code: number; authority: string }>('/pg/v4/payment/request.json', {
    merchant_id: env.zarinpalMerchantId,
    amount: toZarinpalAmount(input.tomanAmount), // Toman -> Rial (×10), the only conversion
    currency: 'IRR',
    callback_url: input.callbackUrl,
    description: input.description,
    ...(Object.keys(metadata).length ? { metadata } : {}),
  });

  // code 100 => authority issued.
  if (!json.data || json.data.code !== 100 || !json.data.authority) {
    throw new Error(
      firstError(json.errors, `Zarinpal did not issue an authority (code ${json.data?.code ?? 'unknown'})`),
    );
  }

  return {
    authority: json.data.authority,
    gatewayUrl: `${START_PAY_BASE}/pg/StartPay/${json.data.authority}`,
  };
}

export interface VerifyInput {
  /** Integer Toman amount — MUST equal the amount used at request time. */
  tomanAmount: number;
  authority: string;
}

export interface VerifyResult {
  verified: boolean;
  refId?: string;
  cardPan?: string;
  alreadyVerified?: boolean;
  message: string;
}

/**
 * Verify a completed payment. The amount sent is converted with the SAME
 * `toZarinpalAmount` used at request time, so request + verify always agree.
 * `code` 100 = paid now, 101 = already verified (idempotent); both are success.
 */
export async function verifyPayment(input: VerifyInput): Promise<VerifyResult> {
  const json = await post<{ code: number; ref_id?: number | string; card_pan?: string }>(
    '/pg/v4/payment/verify.json',
    {
      merchant_id: env.zarinpalMerchantId,
      amount: toZarinpalAmount(input.tomanAmount), // same conversion as request
      authority: input.authority,
    },
  );

  const code = json.data?.code;
  if (code === 100 || code === 101) {
    return {
      verified: true,
      alreadyVerified: code === 101,
      refId: json.data?.ref_id != null ? String(json.data.ref_id) : undefined,
      cardPan: json.data?.card_pan,
      message: code === 101 ? 'Payment already verified' : 'Payment verified',
    };
  }

  return {
    verified: false,
    message: firstError(json.errors, `Verification failed (code ${code ?? 'unknown'})`),
  };
}
