import { env } from '../config/env';

/**
 * Thin Zarinpal gateway client (REST v4). Uses Node's global `fetch`.
 *
 * Amounts are integers in Tomans (Zarinpal's unit; 1 Toman = 10 Rials). The
 * gateway enforces a 1000-Toman minimum, so very small totals are rejected.
 *
 * Docs: https://docs.zarinpal.com/payment-gateway/integration
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
  amount: number; // Tomans
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
    amount: input.amount,
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
  amount: number; // Tomans — must equal the amount used at request time
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
 * Verify a completed payment. `code` 100 = paid now, 101 = already verified
 * (idempotent); both are success. Anything else is a failure.
 */
export async function verifyPayment(input: VerifyInput): Promise<VerifyResult> {
  const json = await post<{ code: number; ref_id?: number | string; card_pan?: string }>(
    '/pg/v4/payment/verify.json',
    {
      merchant_id: env.zarinpalMerchantId,
      amount: input.amount,
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
