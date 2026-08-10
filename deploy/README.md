# Edge proxy configs

Put a wildcard reverse proxy in front of the Next.js app so that each store gets
its own subdomain (`acme.yourdomain.com`, `beta.yourdomain.com`, …). The Next.js
[middleware](../apps/frontend/middleware.ts) reads the subdomain from the **Host**
header, so the proxy must forward it unchanged.

Two interchangeable configs are provided:

| File             | Use when…                                                            |
| ---------------- | ------------------------------------------------------------------- |
| `Caddyfile`      | You want automatic HTTPS with minimal config (recommended).         |
| `nginx.conf`     | You already run Nginx / want full control.                         |

Both:

- Route `yourdomain.com`, `www.yourdomain.com` (apex — marketing/login/admin) and
  `*.yourdomain.com` (storefront subdomains) to the Next.js service.
- Preserve the `Host` header (Caddy by default; Nginx via `proxy_set_header Host $host;`).

Set `ROOT_DOMAIN` (frontend env) to your apex domain in production, e.g.
`ROOT_DOMAIN=yourdomain.com`.

## TLS for the wildcard

- **Caddy**: apex/www get automatic certs via HTTP-01. A wildcard cert requires a
  [DNS-01 challenge](https://caddyserver.com/docs/automatic-https#dns-challenge)
  (DNS-provider plugin + token) or a pre-issued wildcard cert via the `tls` directive.
- **Nginx**: terminate TLS with certbot, or put Nginx behind an existing TLS LB.

## Local testing (no proxy)

Subdomain routing works locally without a proxy:

- `*.localhost` resolves to 127.0.0.1, so `acme.localhost:3000` → store `acme`.
- Or append `?store=acme` to any URL to override (dev convenience).
- `localhost:3000` (apex) shows the marketing landing page.

A store must exist for its subdomain (the seed creates `default`, or register a
new store at the apex). Unknown subdomains render the 404 page.
