#!/bin/bash
# Generate production .env for Vibe 42 deployment.
# Usage: bash scripts/gen-env-vibe42.sh
# Run inside the project directory on the server.

set -euo pipefail

DOMAIN="${WEB_DOMAIN:-vibe42.kz}"
ACME_EMAIL="${ACME_EMAIL:-owner@vibe42.kz}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-FNXMD12345}"

gen() { openssl rand -base64 32 | tr -d '\n=/+' | head -c 40; }
ADMIN_TOKEN=$(gen)
SESSION_SECRET=$(gen)
POSTGRES_PASSWORD=$(gen)

if [ -f .env ]; then
  cp .env ".env.backup.$(date +%Y%m%d-%H%M%S)"
  echo "Backed up existing .env"
fi

cat > .env <<ENVEOF
WEB_DOMAIN=${DOMAIN}
ACME_EMAIL=${ACME_EMAIL}

POSTGRES_DB=vibe42
POSTGRES_USER=vibe42
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_PORT=5432

API_PORT=4000
WEB_PORT=5173
ADMIN_PORT=5174

ADMIN_TOKEN=${ADMIN_TOKEN}
ADMIN_USERNAME=${ADMIN_USERNAME}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
SESSION_SECRET=${SESSION_SECRET}

PUBLIC_BASE_URL=https://${DOMAIN}
VITE_API_URL=https://${DOMAIN}
CORS_ORIGINS=https://${DOMAIN}

STORAGE_DRIVER=local
ENVEOF

chmod 600 .env

echo "OK: .env created for ${DOMAIN}"
echo "ADMIN login: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}"
echo "ADMIN_TOKEN len: ${#ADMIN_TOKEN}"
echo "SESSION_SECRET len: ${#SESSION_SECRET}"
echo "POSTGRES_PASSWORD len: ${#POSTGRES_PASSWORD}"
