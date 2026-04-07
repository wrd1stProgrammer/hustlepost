alter table if exists public.workspace_queue_time_slots
  add column if not exists connected_account_ids uuid[] not null default '{}'::uuid[];
