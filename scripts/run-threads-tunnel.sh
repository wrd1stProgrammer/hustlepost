#!/usr/bin/env bash

set -euo pipefail

PORT="${1:-3000}"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is not installed. Install it first with: brew install cloudflared"
  exit 1
fi

echo "Starting HTTPS tunnel for http://127.0.0.1:${PORT}"
echo "Copy the https://*.trycloudflare.com URL and set:"
echo "THREADS_REDIRECT_URI=<URL>/api/oauth/threads/callback"
echo

exec cloudflared tunnel --url "http://127.0.0.1:${PORT}"
