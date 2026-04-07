# OpenClaw Worker Setup

## Purpose

Run a small internal HTTP wrapper on the VPS so the app can trigger:

- `POST /internal/ingest/search` -> `ingest-cluster.mjs`
- `POST /internal/ingest/home` -> `ingest-home-feed.mjs`

## Files

- Worker server: [scripts/openclaw-worker-server.mjs](/Users/sikgates/Desktop/hustle/scripts/openclaw-worker-server.mjs)

## Required env on the VPS

These can live in the worker `.env` file:

```env
WORKER_BEARER_TOKEN=
OPENCLAW_WORKER_PORT=4000
OPENCLAW_WORKER_BIND_HOST=0.0.0.0
OPENCLAW_WORKER_CWD=/root/.openclaw/workspace/threads-worker
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

If `SUPABASE_URL` is not present, the ingestion scripts can also read `NEXT_PUBLIC_SUPABASE_URL`.

## Start command

Run this from the worker directory:

```bash
node /root/.openclaw/workspace/threads-worker/openclaw-worker-server.mjs
```

## Example requests

Search:

```bash
curl -X POST http://127.0.0.1:4000/internal/ingest/search \
  -H "Authorization: Bearer $WORKER_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"keywords":["AI","자동화"],"topic_cluster":"vibe_coding","locale":"ko","target_post_count":10,"scraper_account":"threads_scraper_02"}'
```

Home:

```bash
curl -X POST http://127.0.0.1:4000/internal/ingest/home \
  -H "Authorization: Bearer $WORKER_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"topic_cluster":"health_fitness","locale":"ko","target_post_count":10,"scraper_account":"threads_scraper_01"}'
```
