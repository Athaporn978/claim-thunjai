#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/var/www/claim-thunjai
REPO_DIR=/tmp/claim-thunjai
GIT_REPO=https://github.com/your-username/claim-thunjai.git
BRANCH=main

sudo apt-get update
sudo apt-get install -y nodejs npm nginx git curl ufw
sudo npm install -g pm2

sudo mkdir -p "$APP_DIR"
sudo git clone -b "$BRANCH" "$GIT_REPO" "$REPO_DIR"
sudo rsync -a --delete "$REPO_DIR/" "$APP_DIR/"

cd "$APP_DIR"
sudo npm ci --omit=dev
sudo npx prisma generate
sudo npx prisma migrate deploy

sudo cp deploy/vps/ecosystem.config.cjs /etc/ecosystem.config.cjs
sudo cp deploy/vps/claim-thunjai.service /etc/systemd/system/claim-thunjai.service

sudo systemctl daemon-reload
sudo systemctl enable claim-thunjai
sudo systemctl restart claim-thunjai

sudo cp deploy/vps/nginx.conf.example /etc/nginx/sites-available/claim-thunjai
sudo ln -sf /etc/nginx/sites-available/claim-thunjai /etc/nginx/sites-enabled/claim-thunjai
sudo nginx -t && sudo systemctl reload nginx

sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

echo "Deployment completed."
echo "Open your domain or server IP on port 80."
