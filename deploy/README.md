# Edge proxy configs

A single reverse proxy in front of the app routes `/api/*` and `/uploads/*` to
the backend and everything else to the Next.js frontend. Pick one:

| File             | Use when…                                                    |
| ---------------- | ----------------------------------------------------------- |
| `Caddyfile`      | You want automatic HTTPS with minimal config (recommended). |
| `nginx.conf`     | You already run Nginx / want full control.                  |

Both are wired into `docker-compose.prod.yml` (Caddy by default). Set
`APP_DOMAIN` to your domain (and `ACME_EMAIL`) in `.env`.

- **Caddy** issues and renews a Let's Encrypt certificate for `APP_DOMAIN`
  automatically (HTTP-01).
- **Nginx** — add the TLS lines and provision a cert with `certbot --nginx`.

The crucial line for either is preserving the original `Host` header (Caddy by
default; Nginx via `proxy_set_header Host $host;`).
