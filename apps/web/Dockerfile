# Image site (Astro) — konteks ROOT: docker build -f apps/web/Dockerfile .
# shortcut: service `site` dihapus saat target deploy statis (W4-02/W0-08); Dockerfile ini ikut dibuang.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/erp/package.json apps/erp/
COPY apps/web/package.json apps/web/
COPY packages/api-types/package.json packages/api-types/
RUN npm ci -w @acme/web --include-workspace-root
COPY apps/web apps/web
RUN npm run build -w @acme/web \
    && npm prune --omit=dev -w @acme/web --include-workspace-root

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/web/package.json apps/web/package.json
COPY --from=build /app/apps/web/node_modules apps/web/node_modules
COPY --from=build /app/apps/web/dist apps/web/dist
WORKDIR /app/apps/web
EXPOSE 4321
USER node
HEALTHCHECK --interval=10s --timeout=5s --retries=10 --start-period=15s \
    CMD wget -qO- http://127.0.0.1:4321/ || exit 1
CMD ["node", "dist/server/entry.mjs"]
