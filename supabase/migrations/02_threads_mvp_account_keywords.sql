-- Threads-first MVP additions
-- 1) Per-account onboarding keywords (max 3 enforced by position slot)
-- 2) Align viral_posts.category with the current dynamic ingestion flow
-- 3) Add JSONB lookup indexes used by ingestion/retrieval

create table if not exists public.account_keywords (
  id uuid primary key default gen_random_uuid(),
  connected_account_id uuid not null references public.connected_accounts(id) on delete cascade,
  keyword text not null,
  position smallint not null check (position between 1 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connected_account_id, position),
  unique (connected_account_id, keyword)
);

create index if not exists account_keywords_connected_account_id_idx
  on public.account_keywords (connected_account_id, position);

alter table public.viral_posts
  drop constraint if exists viral_posts_category_check;

alter table public.viral_posts
  add constraint viral_posts_category_check check (category in (
    'indie_hacking',
    'ai_productivity',
    'fitness_diet',
    'side_hustle_money',
    'vibe_coding',
    'dynamic_keyword'
  ));

create index if not exists viral_posts_topic_cluster_idx
  on public.viral_posts ((normalized_metrics->>'topic_cluster'));

create index if not exists viral_posts_query_source_idx
  on public.viral_posts ((normalized_metrics->>'query_source'));
