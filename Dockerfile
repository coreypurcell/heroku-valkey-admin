FROM node:22-bookworm-slim AS builder

ARG VALKEY_ADMIN_VERSION=1.1.1

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl patch \
  && rm -rf /var/lib/apt/lists/* \
  && curl --location --fail --silent --show-error "https://github.com/valkey-io/valkey-admin/archive/refs/tags/v${VALKEY_ADMIN_VERSION}.tar.gz" \
  | tar --extract --gzip --strip-components=1

COPY patches/valkey-admin-bootstrap.patch /tmp/

RUN patch --strip=1 < /tmp/valkey-admin-bootstrap.patch \
  && npm ci \
  && npm run build:all

FROM node:22-bookworm-slim

WORKDIR /app

ENV DEPLOYMENT_MODE=Web
ENV NODE_ENV=production

COPY --from=builder /build/package.json /build/package-lock.json ./
COPY --from=builder /build/apps/server/package.json ./apps/server/
COPY --from=builder /build/common/package.json ./common/
COPY --from=builder /build/apps/metrics/config.yml ./apps/metrics/

RUN npm ci --omit=dev \
  && chown -R node:node /app

COPY --from=builder --chown=node:node /build/common/dist ./common/dist
COPY --from=builder --chown=node:node /build/apps/frontend/dist ./apps/frontend/dist
COPY --from=builder --chown=node:node /build/apps/metrics/dist ./apps/metrics/dist
COPY --from=builder --chown=node:node /build/apps/server/dist ./apps/server/dist
COPY --chown=node:node server.mjs ./

USER node

CMD ["node", "/app/server.mjs"]
