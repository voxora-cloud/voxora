#!/bin/sh
# Replaces build-time placeholder strings with real env var values at startup.
# This makes one generic Docker image work with any deployment.
#
# Required environment variables:
#   - API_URL_PRODUCTION: Backend API URL (e.g., https://api.voxora.cloud)
#   - CDN_URL_PRODUCTION: CDN base URL (e.g., https://cdn.voxora.cloud)

set -e

replace() {
  PLACEHOLDER="$1"
  VALUE="$2"
  TARGET_DIR="$3"
  
  if [ -n "$VALUE" ] && [ "$VALUE" != "$PLACEHOLDER" ]; then
    # Replace in JS files
    find "$TARGET_DIR" -type f -name "*.js" \
      -exec sed -i "s|$PLACEHOLDER|$VALUE|g" {} + 2>/dev/null || true
    # Replace in HTML files
    find "$TARGET_DIR" -type f -name "*.html" \
      -exec sed -i "s|$PLACEHOLDER|$VALUE|g" {} + 2>/dev/null || true
    echo "  ✓ $PLACEHOLDER → $VALUE"
  else
    echo "  ⚠ $PLACEHOLDER not set — keeping placeholder (widget may not work correctly)"
  fi
}

echo "Configuring widget runtime environment..."
replace "__API_URL_PRODUCTION__" "$API_URL_PRODUCTION" "/app/dist"
replace "__API_URL_PRODUCTION__" "$API_URL_PRODUCTION" "/app/public"
replace "__CDN_URL_PRODUCTION__" "$CDN_URL_PRODUCTION" "/app/dist"
replace "__CDN_URL_PRODUCTION__" "$CDN_URL_PRODUCTION" "/app/public"
echo "Done. Deploying widget to MinIO..."

exec node deploy-to-minio.js
