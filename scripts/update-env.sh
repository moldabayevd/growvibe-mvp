#!/bin/bash
set -e
cd ~/growvibe
# Update only the URL-related lines, keep secrets intact
sed -i 's|^PUBLIC_BASE_URL=.*|PUBLIC_BASE_URL=http://api.213.155.23.46.nip.io|' .env
sed -i 's|^VITE_API_URL=.*|VITE_API_URL=http://api.213.155.23.46.nip.io|' .env
sed -i 's|^CORS_ORIGINS=.*|CORS_ORIGINS=http://213.155.23.46.nip.io,http://admin.213.155.23.46.nip.io|' .env
echo "--- updated URLs ---"
grep -E '^(PUBLIC_BASE_URL|VITE_API_URL|CORS_ORIGINS)' .env
