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

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT ?? '4000', 10),
  databaseUrl: required('DATABASE_URL'),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  storeDefaultSubdomain: process.env.STORE_DEFAULT_SUBDOMAIN ?? 'default',
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
  cookieSecure: process.env.COOKIE_SECURE === 'true',

  // Payments (Zarinpal). All optional so the app still boots without them.
  // Set ZARINPAL_MERCHANT_ID to your gateway merchant ID (required to actually
  // charge). Sandbox is on by default for local/dev.
  zarinpalMerchantId: process.env.ZARINPAL_MERCHANT_ID ?? '',
  zarinpalSandbox: (process.env.ZARINPAL_SANDBOX ?? 'true') !== 'false',
  // Backend callback URL the gateway redirects the browser back to.
  zarinpalCallbackUrl:
    process.env.ZARINPAL_CALLBACK_URL ?? 'http://localhost:4000/api/payments/callback',
  // Public frontend URL (used to redirect to the result page after verifying).
  webUrl: process.env.WEB_URL ?? 'http://localhost:3000',

  // Deployment / multi-tenant
  // Apex domain — used for CORS (allow *.ROOT_DOMAIN) and to parse store
  // subdomains in the Caddy on-demand-TLS "ask" endpoint. Empty in dev.
  rootDomain: process.env.ROOT_DOMAIN ?? '',
} as const;
