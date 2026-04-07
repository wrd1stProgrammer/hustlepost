-- Hustle-AI MVP initial schema
-- Minimal schema only. RLS is intentionally left off for the first pass.
-- Note: adjust vector dimension if your embedding model differs.

create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'team')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('x', 'threads')),
  platform_user_id text not null,
  username text,
  display_name text,
  account_status text not null default 'active' check (account_status in ('active', 'expired', 'revoked', 'error')),
  last_validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, platform_user_id),
  unique (user_id, platform, username)
);

create index if not exists connected_accounts_user_id_idx
  on public.connected_accounts (user_id);

create table if not exists public.oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  connected_account_id uuid not null references public.connected_accounts(id) on delete cascade,
  platform text not null check (platform in ('x', 'threads')),
  access_token_ciphertext text not null,
  refresh_token_ciphertext text,
  token_type text,
  scopes text[] not null default '{}'::text[],
  expires_at timestamptz,
  refresh_expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connected_account_id, platform)
);

create index if not exists oauth_tokens_connected_account_id_idx
  on public.oauth_tokens (connected_account_id);

create table if not exists public.viral_posts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('x', 'threads')),
  external_post_id text not null,
  author_handle text,
  author_name text,
  source_url text not null,
  category text not null check (category in (
    'indie_hacking',
    'ai_productivity',
    'fitness_diet',
    'side_hustle_money',
    'vibe_coding'
  )),
  content_text text not null,
  view_count bigint,
  like_count bigint,
  published_at timestamptz,
  language_code text not null default 'en',
  normalized_metrics jsonb not null default '{}'::jsonb,
  virality_score numeric(12,4),
  ingested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (platform, external_post_id)
);

create index if not exists viral_posts_category_platform_published_at_idx
  on public.viral_posts (category, platform, published_at desc);

create index if not exists viral_posts_virality_score_idx
  on public.viral_posts (category, virality_score desc);

create table if not exists public.viral_post_embeddings (
  viral_post_id uuid primary key references public.viral_posts(id) on delete cascade,
  embedding vector(1536),
  embedding_model text not null,
  embedded_at timestamptz not null default now()
);

create table if not exists public.generated_hooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  keyword text not null,
  platform_target text[] not null default array['x', 'threads']::text[],
  prompt_snapshot jsonb not null default '{}'::jsonb,
  source_post_ids uuid[] not null,
  output_text text not null,
  output_style text not null default 'broetry',
  generation_model text not null,
  created_at timestamptz not null default now()
);

create index if not exists generated_hooks_user_id_created_at_idx
  on public.generated_hooks (user_id, created_at desc);

create table if not exists public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  connected_account_id uuid not null references public.connected_accounts(id) on delete cascade,
  generated_hook_id uuid references public.generated_hooks(id) on delete set null,
  platform text not null check (platform in ('x', 'threads')),
  post_text text not null,
  scheduled_for timestamptz not null,
  timezone text not null default 'UTC',
  status text not null default 'scheduled' check (status in ('draft', 'scheduled', 'processing', 'published', 'failed', 'cancelled')),
  trigger_run_id text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scheduled_posts_user_id_status_scheduled_for_idx
  on public.scheduled_posts (user_id, status, scheduled_for);

create index if not exists scheduled_posts_connected_account_id_idx
  on public.scheduled_posts (connected_account_id);

create table if not exists public.publish_runs (
  id uuid primary key default gen_random_uuid(),
  scheduled_post_id uuid not null references public.scheduled_posts(id) on delete cascade,
  connected_account_id uuid not null references public.connected_accounts(id) on delete cascade,
  platform text not null check (platform in ('x', 'threads')),
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  external_post_id text,
  external_post_url text,
  status text not null check (status in ('running', 'success', 'failed')),
  error_code text,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists publish_runs_scheduled_post_id_idx
  on public.publish_runs (scheduled_post_id);

create index if not exists publish_runs_connected_account_id_idx
  on public.publish_runs (connected_account_id);
