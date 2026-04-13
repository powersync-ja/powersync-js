FROM node:24 AS builder
WORKDIR /app

COPY . /app
RUN corepack enable

RUN pnpm i --frozen-lockfile --filter ./packages/react --filter ./packages/common --filter ./packages/web --filter ./tools/diagnostics-app
RUN pnpm run --filter ./packages/react --filter ./packages/common --filter ./packages/web build
RUN pnpm run --filter ./tools/diagnostics-app build

# === PROD ===

FROM nginx
COPY ./tools/diagnostics-app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/tools/diagnostics-app/dist /usr/share/nginx/html
