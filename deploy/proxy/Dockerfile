# Image proxy = Caddy + hasil build ERP statis (SRS §2.4). Konteks ROOT:
#   docker build -f deploy/proxy/Dockerfile .
FROM node:24-bookworm-slim AS erp
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/erp/package.json apps/erp/
COPY apps/web/package.json apps/web/
COPY packages/api-types/package.json packages/api-types/
RUN npm ci -w @acme/erp --include-workspace-root
COPY apps/erp apps/erp
# ERP membaca APP_ENV (pita STAGING, ENV-2) dan APP_VERSION (REL-1) saat BUILD (Vite define).
# shortcut: nilai dibake ke image, jadi image proxy staging != produksi (tak bisa dipromosikan
# lintas lingkungan); upgrade: injeksi runtime (config.json dari env) bila perlu promosi image.
ARG APP_ENV=production
ARG APP_VERSION=dev
ENV APP_ENV=$APP_ENV APP_VERSION=$APP_VERSION
RUN npm run build -w @acme/erp

FROM caddy:2-alpine
COPY --from=erp /app/apps/erp/build /srv/erp
COPY deploy/Caddyfile deploy/Caddyfile.prod deploy/common.caddy /etc/caddy/
