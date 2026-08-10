# Dev-oriented image: installs deps and runs `next dev`.
# Source is bind-mounted at runtime (see docker-compose.yml).

FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json ./
RUN npm install --no-audit --no-fund

EXPOSE 3000

# Bind to 0.0.0.0 so the dev server is reachable through the published port.
CMD ["npm", "run", "dev"]
