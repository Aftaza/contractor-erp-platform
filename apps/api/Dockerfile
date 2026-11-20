# Image api — build dari KONTEKS ROOT (lockfile tunggal workspace):
#   docker build -f apps/api/Dockerfile .
# node:24-bookworm-slim (Debian), bukan alpine: argon2 & Prisma engine butuh glibc/openssl.
# shortcut: COPY package.json per workspace ditulis manual; tambah baris untuk
# tiap workspace baru (mis. packages/api-types) agar `npm ci` lolos validasi lockfile.

FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/erp/package.json apps/erp/
COPY apps/web/package.json apps/web/
COPY packages/api-types/package.json packages/api-types/
RUN npm ci -w @acme/api --include-workspace-root
COPY apps/api apps/api
RUN npx prisma generate --schema apps/api/prisma/schema.prisma \
    && npm run build -w @acme/api

# Stage `prod`: buang devDependencies (stage `build` tetap lengkap untuk seed via ts-node),
# lalu generate ulang client agar cocok dengan node_modules produksi.
FROM build AS prod
RUN npm prune --omit=dev --omit=optional -w @acme/api --include-workspace-root \
    && npx prisma generate --schema apps/api/prisma/schema.prisma

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl curl \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production UPLOADS_DIR=/app/uploads CHECKPOINT_DISABLE=1
RUN mkdir /app/uploads && chown node /app/uploads
COPY --from=prod /app/node_modules ./node_modules
COPY --from=prod /app/apps/api/package.json apps/api/package.json
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/prisma apps/api/prisma
WORKDIR /app/apps/api
EXPOSE 3001
# User "node" (uid 1000) bawaan image. `/health` di luar prefix api/v1.
USER node
HEALTHCHECK --interval=10s --timeout=5s --retries=10 --start-period=15s \
    CMD curl -f http://localhost:3001/health || exit 1
# Migrasi BUKAN saat start (role runtime tanpa DDL, INF-4/REL-4); langkah deploy:
#   docker run --rm <image> npx prisma migrate deploy
CMD ["node", "dist/main"]
