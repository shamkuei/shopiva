import dotenv from 'dotenv';

// When run outside Docker, load the backend's own .env. Inside Docker the env
// is injected by docker-compose.yml, so this is a no-op there.
dotenv.config();

const required = (name: string, fallback?: string): string => {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

/** Strict boolean: only the exact literals "true"/"false" count. */
const bool = (name: string, fallback: boolean): boolean => {
  const raw = process.env[name];
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === undefined || raw === '') return fallback;
  throw new Error(
    `Invalid boolean for ${name}: "${raw}" — must be exactly "true" or "false"`,
  );
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT ?? '4000', 10),
  databaseUrl: required('DATABASE_URL'),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // Auth (JWT + cookies)
  jwtAccessSecret: required('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET'),
  jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  // Set COOKIE_SECURE=true behind HTTPS in production.
  cookieSecure: bool('COOKIE_SECURE', false),

  // Payments (Zarinpal). All optional so the app still boots without them —
  // production misconfiguration is caught by validatePayments() at boot.
  zarinpalMerchantId: process.env.ZARINPAL_MERCHANT_ID ?? '',
  zarinpalSandbox: bool('ZARINPAL_SANDBOX', true),
  zarinpalCallbackUrl:
    process.env.ZARINPAL_CALLBACK_URL ?? 'http://localhost:4000/api/payments/callback',
  webUrl: process.env.WEB_URL ?? 'http://localhost:3000',
  // Pending orders older than this are cancelled + restocked by the sweep.
  pendingOrderTtlMinutes: parseInt(process.env.PENDING_ORDER_TTL_MIN ?? '60', 10),
} as const;

/**
 * Fail-fast payment-config check for production. Throws on the two silent
 * failure modes a real deployment must never hit:
 *   1. Sandbox left on            — payments "succeed" but nothing is charged.
 *   2. Merchant ID unset/placeholder — every order 502s at pay time instead
 *      of the boot failing loudly.
 * Dev/test intentionally boots without these (sandbox + zero-UUID is fine there).
 */
export function validatePayments(): void {
  if (!env.isProd) return;

  if (env.zarinpalSandbox) {
    throw new Error(
      'ZARINPAL_SANDBOX=true in production — real payments would be silently routed to the sandbox. Set ZARINPAL_SANDBOX=false.',
    );
  }
  const merchant = env.zarinpalMerchantId.trim();
  if (!merchant || merchant === '00000000-0000-0000-0000-000000000000' || !UUID_RE.test(merchant)) {
    throw new Error(
      'ZARINPAL_MERCHANT_ID is missing or not a valid merchant UUID — payments cannot work. Set it in the environment.',
    );
  }
}
