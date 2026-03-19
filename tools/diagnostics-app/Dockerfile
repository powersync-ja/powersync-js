FROM node:22.5 AS builder
WORKDIR /app

RUN npm i -g pnpm@9

COPY . /app

RUN pnpm i --frozen-lockfile --filter ./packages/react --filter ./packages/common --filter ./packages/web --filter ./tools/diagnostics-app
RUN pnpm run --filter ./packages/react --filter ./packages/common --filter ./packages/web build
ARG BASE_PATH=/
RUN BASE_PATH=${BASE_PATH} pnpm run --filter ./tools/diagnostics-app build

# === PROD ===

FROM nginx
ARG BASE_PATH=/
COPY ./tools/diagnostics-app/nginx.conf /tmp/nginx.conf.template
RUN export BASE_PATH=${BASE_PATH} && \
    if [ "${BASE_PATH}" != "/" ]; then \
      NO_SLASH=$(echo "${BASE_PATH}" | sed 's:/$::'); \
      export REDIRECT_BLOCK="location = ${NO_SLASH} { return 301 \$scheme://\$http_host${BASE_PATH}; }"; \
    else \
      export REDIRECT_BLOCK=""; \
    fi && \
    envsubst '${BASE_PATH} ${REDIRECT_BLOCK}' < /tmp/nginx.conf.template > /etc/nginx/conf.d/default.conf && \
    rm /tmp/nginx.conf.template
COPY --from=builder /app/tools/diagnostics-app/dist /usr/share/nginx/html
