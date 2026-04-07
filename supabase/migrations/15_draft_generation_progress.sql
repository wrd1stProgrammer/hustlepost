create table if not exists public.draft_generation_progress (
  request_id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  stage text not null check (stage in ('data_preparing', 'draft_generating', 'done', 'error')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists draft_generation_progress_updated_at_idx
  on public.draft_generation_progress (updated_at desc);
