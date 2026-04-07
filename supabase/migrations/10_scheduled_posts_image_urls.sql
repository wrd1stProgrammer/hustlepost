alter table public.scheduled_posts
  add column if not exists image_urls text[];

comment on column public.scheduled_posts.image_urls is
  'Public image URLs for root Threads post media, max 3';
