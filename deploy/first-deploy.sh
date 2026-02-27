#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# Content Aggregator — First Deploy (run as 'app' user)
# Installs deps, migrates DB, builds, starts PM2 + RSSHub
# ──────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/app"
ECOSYSTEM_FILE="$APP_DIR/deploy/ecosystem.config.cjs"

cd "$APP_DIR"

# Verify .env.local exists
if [[ ! -f .env.local ]]; then
  echo "ERROR: .env.local not found!"
  echo "Create it first: nano $APP_DIR/.env.local"
  exit 1
fi

echo "[1/5] Installing dependencies..."
npm ci

echo "[2/5] Running Prisma migrations..."
npx prisma migrate deploy

echo "[3/5] Building Next.js app..."
npm run build

echo "[4/5] Starting RSSHub container..."
docker compose -f "$APP_DIR/deploy/docker-compose.yml" up -d || true

echo "[5/5] Starting PM2 processes (web + worker)..."
pm2 start "$ECOSYSTEM_FILE"
pm2 save

echo ""
echo "============================================"
echo " Deployment complete!"
echo "============================================"
echo " Web:    http://$(curl -s ifconfig.me)"
echo " PM2:    pm2 status"
echo " Logs:   pm2 logs"
echo "============================================"
