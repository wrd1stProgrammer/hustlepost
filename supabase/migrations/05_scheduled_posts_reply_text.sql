alter table if exists public.scheduled_posts
  add column if not exists reply_text text;
