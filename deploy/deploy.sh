#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/app}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
ECOSYSTEM_FILE="${ECOSYSTEM_FILE:-$APP_DIR/deploy/ecosystem.config.cjs}"

export NODE_OPTIONS="--max-old-space-size=512"

echo "Starting deploy at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
cd "$APP_DIR"

echo "Updating code from origin/${DEPLOY_BRANCH}..."
git fetch origin "$DEPLOY_BRANCH"
git checkout "$DEPLOY_BRANCH"
git pull --ff-only origin "$DEPLOY_BRANCH"

echo "Stopping PM2 processes to free memory for build..."
pm2 stop all 2>/dev/null || true

echo "Cleaning stale node_modules..."
rm -rf node_modules

echo "Installing dependencies..."
npm ci

echo "Applying Prisma migrations..."
npx prisma migrate deploy

echo "Building Next.js app..."
npm run build

echo "Ensuring RSSHub container is running..."
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  docker compose -f "$APP_DIR/deploy/docker-compose.yml" up -d
else
  docker-compose -f "$APP_DIR/deploy/docker-compose.yml" up -d
fi

echo "Restarting PM2 processes..."
pm2 startOrRestart "$ECOSYSTEM_FILE" --update-env
pm2 save

echo "Deploy completed successfully at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
