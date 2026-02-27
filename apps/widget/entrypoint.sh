#!/bin/sh
# Replaces build-time placeholder strings with real env var values at startup.
# This makes one generic Docker image work with any deployment.
#
# Set API_URL_PRODUCTION in docker-compose environment or .env.docker

set -e

replace() {
  PLACEHOLDER="$1"
  VALUE="$2"
  if [ -n "$VALUE" ] && [ "$VALUE" != "$PLACEHOLDER" ]; then
    find /app/dist -type f -name "*.js" \
      -exec sed -i "s|$PLACEHOLDER|$VALUE|g" {} + 2>/dev/null || true
    echo "  ✓ $PLACEHOLDER → $VALUE"
  else
    echo "  ⚠ $PLACEHOLDER not set — keeping placeholder (widget may not work correctly)"
  fi
}

echo "Configuring widget runtime environment..."
replace "__API_URL_PRODUCTION__" "$API_URL_PRODUCTION"
echo "Done. Deploying widget to MinIO..."

exec node deploy-to-minio.js
