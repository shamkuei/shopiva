# ─── base ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app

# ─── deps (all deps; shared by build + dev stages) ──────────────────────────
FROM base AS deps
COPY package.json ./
RUN npm install --no-audit --no-fund

# ─── build (compile TypeScript → dist/) ─────────────────────────────────────
FROM deps AS build
COPY . .
RUN ./node_modules/.bin/tsc -p tsconfig.json

# ─── development runtime (hot reload; used by docker-compose.yml) ───────────
FROM deps AS development
COPY . .
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 4000
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]

# ─── production runtime (used by docker-compose.prod.yml) ───────────────────
FROM base AS production
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
RUN mkdir -p uploads && chown -R node:node uploads
COPY docker-entrypoint.prod.sh /usr/local/bin/docker-entrypoint.prod.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.prod.sh
EXPOSE 4000
# Run as non-root.
USER node
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.prod.sh"]
CMD ["node", "dist/server.js"]
