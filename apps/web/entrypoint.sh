#!/bin/sh
# Replaces build-time placeholder strings with real env var values at startup.
# This makes one generic Docker image work with any server IP/domain.
#
# Set these in docker/.env.web (same as you do for api/ai):
#   NEXT_PUBLIC_API_URL=http://YOUR_IP:3002/api/v1
#   NEXT_PUBLIC_SOCKET_URL=http://YOUR_IP:3002
#   NEXT_PUBLIC_CDN_URL=http://YOUR_IP:9001/voxora-widget/v1/voxora.js

set -e

replace() {
  PLACEHOLDER="$1"
  VALUE="$2"
  if [ -n "$VALUE" ] && [ "$VALUE" != "$PLACEHOLDER" ]; then
    find /app/.next /app/public -type f \( -name "*.js" -o -name "*.html" \) \
      -exec sed -i "s|$PLACEHOLDER|$VALUE|g" {} + 2>/dev/null || true
    echo "  ✓ $PLACEHOLDER → $VALUE"
  else
    echo "  ⚠ $PLACEHOLDER not set — keeping placeholder (app may not work correctly)"
  fi
}

echo "Configuring runtime environment..."
replace "__NEXT_PUBLIC_API_URL__"    "$NEXT_PUBLIC_API_URL"
replace "__NEXT_PUBLIC_SOCKET_URL__" "$NEXT_PUBLIC_SOCKET_URL"
replace "__NEXT_PUBLIC_CDN_URL__"    "$NEXT_PUBLIC_CDN_URL"
echo "Done. Starting Next.js..."

exec node server.js
