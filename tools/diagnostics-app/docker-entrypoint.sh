#!/bin/sh
set -e

HTML_DIR="/usr/share/nginx/html"

# Normalize BASE_PATH: strip trailing slash, ensure leading slash if non-empty
BASE_PATH="${BASE_PATH:-}"
if [ -n "$BASE_PATH" ]; then
  # Ensure leading slash
  case "$BASE_PATH" in
    /*) ;;
    *) BASE_PATH="/$BASE_PATH" ;;
  esac
  # Strip trailing slash
  BASE_PATH="${BASE_PATH%/}"
fi

# Replace the placeholder in all built assets.
# The build uses /__DIAG_BASE__/ as the Vite base path. We replace:
#   /__DIAG_BASE__  → $BASE_PATH  (covers both /path and empty cases)
if [ -n "$BASE_PATH" ]; then
  echo "Configuring BASE_PATH=${BASE_PATH}"
  find "$HTML_DIR" -type f \( -name '*.html' -o -name '*.js' -o -name '*.css' -o -name '*.json' \) \
    -exec sed -i "s|/__DIAG_BASE__|${BASE_PATH}|g" {} +
else
  echo "No BASE_PATH set, serving from root"
  # Replace placeholder base path with root: /__DIAG_BASE__/ → /
  find "$HTML_DIR" -type f \( -name '*.html' -o -name '*.js' -o -name '*.css' -o -name '*.json' \) \
    -exec sed -i "s|/__DIAG_BASE__||g" {} +
fi

# Inject the base path into index.html for the TanStack Router.
# The build includes: window.__DIAG_BASE__=""
# Replace with the actual value.
sed -i "s|window.__DIAG_BASE__=\"\"|window.__DIAG_BASE__=\"${BASE_PATH}\"|g" "$HTML_DIR/index.html"

# Move built files into a subdirectory matching the base path so nginx root works naturally.
if [ -n "$BASE_PATH" ]; then
  SERVE_DIR="/usr/share/nginx/serve"
  mkdir -p "${SERVE_DIR}${BASE_PATH}"
  cp -a "${HTML_DIR}/." "${SERVE_DIR}${BASE_PATH}/"
  cat > /etc/nginx/conf.d/default.conf <<NGINX_EOF
server {
  listen 80;
  server_name _;
  root ${SERVE_DIR};
  absolute_redirect off;

  location ${BASE_PATH}/ {
    try_files \$uri ${BASE_PATH}/index.html;
  }

  # Redirect base path without trailing slash
  location = ${BASE_PATH} {
    return 301 ${BASE_PATH}/;
  }
}
NGINX_EOF
else
  cat > /etc/nginx/conf.d/default.conf <<NGINX_EOF
server {
  listen 80;
  server_name _;

  location / {
    root ${HTML_DIR};
    try_files \$uri /index.html;
  }
}
NGINX_EOF
fi

exec nginx -g "daemon off;"
