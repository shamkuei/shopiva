# Security checklist

What's in place and what to harden before going live. Items marked ✅ are
implemented in this repo; ⚠️ are operational steps for you.

## Auth & sessions
- ✅ Passwords hashed with **bcryptjs** (bcrypt-compatible), never stored or
  returned in plaintext.
- ✅ Auth tokens (**JWT access** 15m + **refresh** 7d) live only in **httpOnly
  cookies** — never in `localStorage` or response bodies.
- ✅ `access_token` scoped to `path=/`; `refresh_token` scoped to `path=/api/auth`.
- ✅ **Rate limiting** on `/api/auth/login`, `/register`, `/refresh`
  (`express-rate-limit`, 20 / 15 min / IP) — brute-force protection.
- ⚠️ Set strong, random `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
  (`openssl rand -hex 32`) and rotate if leaked.

## Transport & cookies
- ✅ `COOKIE_SECURE=true` is forced in the production compose (HTTPS-only cookies).
- ✅ Caddy terminates TLS (automatic Let's Encrypt for the store domain).

## API hardening
- ✅ **Helmet** middleware sets secure headers (XSS, clickjacking, etc.).
- ✅ **CORS** is an allowlist function — only the configured origins and
  `*.ROOT_DOMAIN` are accepted; `credentials: true` (no wildcard origin).
- ✅ `trust proxy` enabled so rate-limiting sees the real client IP behind Caddy.
- ✅ JSON body size capped (`1mb`); file uploads capped (`5mb`, images only).

## Data access
- ✅ Admin endpoints (`/api/admin/*`) are protected by `requireAuth` + `requireOwner`.
- ✅ Storefront reads/products are public; checkout is guest (no account).

## Secrets & configuration
- ✅ Secrets come from environment variables (`.env`), which are gitignored.
- ✅ `.env.example` ships only placeholder values.
- ⚠️ Use a strong `POSTGRES_PASSWORD`; never commit `.env`.
- ⚠️ Consider a secrets manager for production.

## Containers & network
- ✅ Production images run as a **non-root** user (`node`).
- ✅ Multi-stage builds; production stage installs only runtime dependencies.
- ✅ In `docker-compose.prod.yml` only Caddy is published (80/443); Postgres and
  Redis are internal to the compose network.
- ⚠️ Keep base images updated; scan images for CVEs (`docker scout`, Trivy).

## Data
- ✅ `scripts/backup-db.sh` — gzipped, timestamped `pg_dump` with retention.
- ⚠️ Schedule backups (cron) and **test a restore**.

## Recommended further hardening
- Add a WAF / fail2ban in front for abusive clients.
- Restrict `/admin` by IP or an allow-list at the proxy if practical.
- Add structured logging + alerting (and monitor auth-rate-limit hits).
- Run `npm audit` / Dependabot and keep dependencies patched.
- Consider Content-Security-Policy headers for the frontend (Next.js).
