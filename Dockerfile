# syntax=docker/dockerfile:1.7

# ---------- builder ----------
# Installs all deps (incl. prisma CLI in devDependencies, which we need for
# `prisma generate` here and `prisma migrate deploy` at API container startup).
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# OpenSSL is needed by Prisma's query engine on debian-slim.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --no-fund --no-audit

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

# ---------- runtime ----------
FROM node:20-bookworm-slim AS runtime

WORKDIR /app

# tini for proper PID-1 signal handling so SIGTERM gracefully shuts down
# both the Express server and the BullMQ worker.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates tini wget \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# Copy node_modules (includes prisma CLI for runtime migrations) + generated
# Prisma client + application source from the builder stage.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY package.json ./

# Logs directory (the Winston logger writes here at runtime).
RUN mkdir -p /app/logs

EXPOSE 4000

ENTRYPOINT ["/usr/bin/tini", "--"]

# Default command runs the API server. The worker container in
# docker-compose.yml overrides this with `node src/workers/index.js`.
CMD ["node", "src/server.js"]
