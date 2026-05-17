# syntax=docker/dockerfile:1.7

# ---------- builder ----------
# Builds the Vite production bundle. The default API base URL inside the
# axios client is `/api/v1` — same-origin, which the nginx in the runtime
# stage proxies to the `api` service over the docker network.
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-fund --no-audit

COPY . .

RUN npm run build

# ---------- runtime ----------
# Static files served by nginx, with /api/* proxied to the API container.
FROM nginx:1.27-alpine AS runtime

# Replace the default site with our SPA + reverse-proxy config.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Built assets land at the standard nginx web root.
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
