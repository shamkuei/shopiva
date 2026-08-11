# ─── base ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app

# ─── deps ───────────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json ./
RUN npm install --no-audit --no-fund

# ─── development runtime (hot reload; used by docker-compose.yml) ───────────
FROM deps AS development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ─── build (Next standalone production build) ───────────────────────────────
# NEXT_PUBLIC_* are inlined at build time, so pass them as build args.
FROM deps AS build
ARG NEXT_PUBLIC_API_URL=""
ARG NEXT_PUBLIC_ROOT_DOMAIN="shopiva.app"
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_ROOT_DOMAIN=$NEXT_PUBLIC_ROOT_DOMAIN
COPY . .
RUN npm run build

# ─── production runtime (tiny standalone image) ─────────────────────────────
FROM node:20-alpine AS production
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
EXPOSE 3000
USER node
CMD ["node", "server.js"]
