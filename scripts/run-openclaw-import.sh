#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: bash scripts/run-openclaw-import.sh <topic-cluster> [filtered-dir] [env-path]"
  exit 1
fi

TOPIC_CLUSTER="$1"
FILTERED_DIR="${2:-/root/.openclaw/workspace/threads-worker/data/filtered}"
ENV_PATH="${3:-}"

if [ -n "$ENV_PATH" ]; then
  node scripts/import-latest-viral-posts.mjs "$TOPIC_CLUSTER" --dir "$FILTERED_DIR" --env "$ENV_PATH"
else
  node scripts/import-latest-viral-posts.mjs "$TOPIC_CLUSTER" --dir "$FILTERED_DIR"
fi
