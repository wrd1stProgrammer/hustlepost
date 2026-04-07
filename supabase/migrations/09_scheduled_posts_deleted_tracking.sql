alter table public.scheduled_posts
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_source text check (deleted_source in ('app', 'external'));

create index if not exists scheduled_posts_deleted_at_idx
  on public.scheduled_posts (deleted_at);
