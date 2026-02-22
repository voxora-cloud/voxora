#!/usr/bin/env bash
# Usage:
#   ./scripts/use-host.sh localhost          # back to local dev
#   ./scripts/use-host.sh 192.168.1.100      # expose on local network
#
# Updates all .env files so every URL points at the given host.
# Remembers the previous host in .current-host so the next switch
# correctly replaces only that host — not unrelated strings.

set -euo pipefail

NEW_HOST="${1:-localhost}"
HOST_FILE=".current-host"

# Read the previous host (default localhost on first run)
OLD_HOST=$(cat "$HOST_FILE" 2>/dev/null || echo "localhost")

if [ "$OLD_HOST" = "$NEW_HOST" ]; then
  echo "Already using host: $NEW_HOST — nothing to do."
  exit 0
fi

echo "Switching host: $OLD_HOST → $NEW_HOST"

FILES=(
  "apps/api/.env.development"
  "apps/web/.env.development"
)

for f in "${FILES[@]}"; do
  if [ -f "$f" ]; then
    # macOS sed requires -i '' ; Linux sed requires -i
    if sed --version >/dev/null 2>&1; then
      sed -i "s|$OLD_HOST|$NEW_HOST|g" "$f"
    else
      sed -i '' "s|$OLD_HOST|$NEW_HOST|g" "$f"
    fi
    echo "  ✓ $f"
  else
    echo "  ⚠ $f not found — skipped"
  fi
done

echo "$NEW_HOST" > "$HOST_FILE"
echo ""
echo "Host is now: $NEW_HOST"
echo ""
echo "Ports:"
echo "  API    → http://$NEW_HOST:3002"
echo "  Web    → http://$NEW_HOST:3000"
echo "  MinIO  → http://$NEW_HOST:9001"
