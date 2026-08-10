# Dev-oriented image: installs deps and runs the watch server.
# Source code is bind-mounted at runtime (see docker-compose.yml), so this
# image mainly provides Node + the installed dependencies + the entrypoint.

FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json ./
RUN npm install --no-audit --no-fund

# Entrypoint lives outside the bind-mounted /app so it survives the volume mount.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]
