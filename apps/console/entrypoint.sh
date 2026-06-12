#!/bin/sh
# Replaces build-time placeholder strings with real env var values at startup.
# This makes one generic Vite Docker image work with any server IP/domain.
#
# Set these through apps/console/.env.docker or docker/docker-compose.yml:
#   VITE_API_URL=http://YOUR_IP/api/v1
#   VITE_SOCKET_URL=http://YOUR_IP
#   VITE_WIDGET_URL=http://YOUR_IP/interaone-widget/v1/InteraOne.js

set -e

TARGET_DIR="${WEB_ROOT:-/usr/share/nginx/html}"

escape_sed_replacement() {
  printf '%s' "$1" | sed 's/[\/&|\\]/\\&/g'
}

replace() {
  PLACEHOLDER="$1"
  VALUE="$2"

  if [ -n "$VALUE" ] && [ "$VALUE" != "$PLACEHOLDER" ]; then
    ESCAPED_VALUE="$(escape_sed_replacement "$VALUE")"
    find "$TARGET_DIR" -type f \( -name "*.js" -o -name "*.mjs" -o -name "*.html" -o -name "*.css" \) \
      -exec sed -i "s|$PLACEHOLDER|$ESCAPED_VALUE|g" {} + 2>/dev/null || true
    echo "  replaced $PLACEHOLDER"
  else
    echo "  $PLACEHOLDER not set; keeping placeholder"
  fi
}

echo "Configuring runtime environment..."
replace "__VITE_API_URL__" "$VITE_API_URL"
replace "__VITE_WIDGET_URL__" "$VITE_WIDGET_URL"
replace "__VITE_SOCKET_URL__" "$VITE_SOCKET_URL"
replace "__VITE_PUBLIC_ENV__" "$VITE_PUBLIC_ENV"
replace "__VITE_INTERAONE_MODE__" "$VITE_INTERAONE_MODE"
echo "Done. Starting web server..."

exec nginx -g "daemon off;"
