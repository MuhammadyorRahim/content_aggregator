#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# Content Aggregator — DigitalOcean Server Setup Script
# Run as root on a fresh Ubuntu 24.04 droplet
# Usage: bash server-setup.sh <GITHUB_REPO_URL>
# ──────────────────────────────────────────────────────────
set -euo pipefail

REPO_URL="${1:-}"
APP_DIR="/app"
BACKUP_DIR="/backups"
NODE_VERSION="22"
APP_USER="app"

if [[ -z "$REPO_URL" ]]; then
  echo "Usage: bash server-setup.sh <GITHUB_REPO_URL>"
  echo "Example: bash server-setup.sh https://github.com/MuhammadyorRahim/content_aggregator.git"
  exit 1
fi

echo "============================================"
echo " Content Aggregator — Server Setup"
echo "============================================"
echo ""

# ── 1. System updates ────────────────────────────────────
echo "[1/9] Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. Install essentials ────────────────────────────────
echo "[2/9] Installing essential packages..."
apt-get install -y -qq curl git nginx sqlite3 ufw software-properties-common ca-certificates gnupg

# ── 3. Install Node.js via NodeSource ────────────────────
echo "[3/9] Installing Node.js ${NODE_VERSION}..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y -qq nodejs
fi
echo "  Node: $(node -v)  npm: $(npm -v)"

# ── 4. Install PM2 globally ─────────────────────────────
echo "[4/9] Installing PM2..."
npm install -g pm2

# ── 5. Install Docker for RSSHub ─────────────────────────
echo "[5/9] Installing Docker..."
if ! command -v docker &>/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi
echo "  Docker: $(docker --version)"

# ── 6. Create app user & directories ────────────────────
echo "[6/9] Setting up app user and directories..."
if ! id "$APP_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$APP_USER"
fi
mkdir -p "$APP_DIR" "$BACKUP_DIR"
chown "$APP_USER":"$APP_USER" "$APP_DIR" "$BACKUP_DIR"
usermod -aG docker "$APP_USER"

# ── 7. Clone repo ───────────────────────────────────────
echo "[7/9] Cloning repository..."
if [[ -d "$APP_DIR/.git" ]]; then
  echo "  Repository already exists, pulling latest..."
  cd "$APP_DIR"
  sudo -u "$APP_USER" git pull --ff-only origin main
else
  rm -rf "${APP_DIR:?}"/*
  sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR"
fi
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

# ── 8. Firewall setup ───────────────────────────────────
echo "[8/9] Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
echo "  Firewall active: SSH + Nginx allowed"

# ── 9. Nginx config (HTTP only — no domain yet) ─────────
echo "[9/9] Configuring Nginx..."
cat > /etc/nginx/sites-available/content-aggregator <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-XSS-Protection "1; mode=block";

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/content-aggregator /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# ── Setup daily backup cron ──────────────────────────────
echo "Setting up daily backup cron..."
CRON_LINE="0 3 * * * /bin/bash $APP_DIR/deploy/backup.sh >> /var/log/backup.log 2>&1"
(crontab -u "$APP_USER" -l 2>/dev/null | grep -v backup.sh; echo "$CRON_LINE") | crontab -u "$APP_USER" -

# ── PM2 startup on boot ─────────────────────────────────
echo "Configuring PM2 startup..."
pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" --service-name pm2-app
env PATH=$PATH:/usr/bin pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" --service-name pm2-app

# ── Add swap (helpful for 1GB RAM during npm build) ──────
echo "Adding 2GB swap space..."
if [[ ! -f /swapfile ]]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
  echo "  Swap enabled (2GB)"
else
  echo "  Swap already exists"
fi

echo ""
echo "============================================"
echo " Server setup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Create the .env.local file:"
echo "     sudo -u $APP_USER nano $APP_DIR/.env.local"
echo ""
echo "  2. Then run the app deploy:"
echo "     sudo -u $APP_USER bash $APP_DIR/deploy/first-deploy.sh"
echo ""
