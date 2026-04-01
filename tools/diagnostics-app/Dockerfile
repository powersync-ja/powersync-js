FROM node:24 AS builder
WORKDIR /app

COPY . /app
RUN corepack enable

RUN pnpm i --frozen-lockfile --filter ./packages/react --filter ./packages/common --filter ./packages/web --filter ./tools/diagnostics-app
RUN pnpm run --filter ./packages/react --filter ./packages/common --filter ./packages/web build

# Build with a placeholder base path that the entrypoint replaces at container start.
ENV BASE_PATH_PLACEHOLDER=true
RUN pnpm run --filter ./tools/diagnostics-app build

# === PROD ===

FROM nginx
COPY --from=builder /app/tools/diagnostics-app/dist /usr/share/nginx/html
COPY ./tools/diagnostics-app/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
