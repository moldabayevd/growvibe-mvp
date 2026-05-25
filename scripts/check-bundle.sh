#!/bin/bash
URL="http://localhost:80"
HOST="213.155.23.46.nip.io"
JS_PATH=$(curl -s -H "Host: $HOST" "$URL" | grep -oE '/assets/index-[^"]+\.js' | head -1)
if [ -z "$JS_PATH" ]; then
  echo "❌ couldn't find JS bundle"
  exit 1
fi
echo "JS bundle: $JS_PATH"
BUNDLE=$(curl -s -H "Host: $HOST" "${URL}${JS_PATH}")
check() {
  if echo "$BUNDLE" | grep -q "$2"; then
    echo "  ✅ $1"
  else
    echo "  ❌ $1 (string not found: $2)"
  fi
}
check "TokenHelper paste hint"      "Сохрани токен прямо здесь"
check "phone field label"           "Номер WhatsApp"
check "save in notes — Telegram"    "Saved Messages"
check "save in notes — iOS Notes"   "iOS Notes"
check "localStorage token key"      "growvibe_github_token_draft"
check "token regex prefix"          "ghp_"
check "phone valid hint"            "Номер заполнен корректно"
check "phone error hint"            "11 цифр"
