create table if not exists public.workspace_queue_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_mode text not null default 'ai_type' check (
    source_mode in ('ai_type', 'ai_random', 'draft_random')
  ),
  ai_draft_type text check (
    ai_draft_type in ('informational', 'engagement', 'product')
  ),
  timezone text not null default 'Asia/Seoul',
  randomize_posting_time boolean not null default false,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.workspace_queue_settings
  add column if not exists randomize_posting_time boolean not null default false;

create unique index if not exists workspace_queue_settings_workspace_id_idx
  on public.workspace_queue_settings (workspace_id);

create index if not exists workspace_queue_settings_is_active_idx
  on public.workspace_queue_settings (is_active, updated_at desc);

create table if not exists public.workspace_queue_time_slots (
  id uuid primary key default gen_random_uuid(),
  workspace_queue_settings_id uuid not null references public.workspace_queue_settings(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  slot_time time not null,
  source_mode text not null default 'ai_type' check (
    source_mode in ('ai_type', 'ai_random', 'draft_random')
  ),
  ai_draft_type text check (
    ai_draft_type in ('informational', 'engagement', 'product')
  ),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.workspace_queue_time_slots
  add column if not exists source_mode text not null default 'ai_type';

alter table if exists public.workspace_queue_time_slots
  add column if not exists ai_draft_type text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workspace_queue_time_slots'
      and column_name = 'source_mode'
  ) then
    alter table public.workspace_queue_time_slots
      drop constraint if exists workspace_queue_time_slots_source_mode_check;
    alter table public.workspace_queue_time_slots
      add constraint workspace_queue_time_slots_source_mode_check
      check (source_mode in ('ai_type', 'ai_random', 'draft_random'));
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workspace_queue_time_slots'
      and column_name = 'ai_draft_type'
  ) then
    alter table public.workspace_queue_time_slots
      drop constraint if exists workspace_queue_time_slots_ai_draft_type_check;
    alter table public.workspace_queue_time_slots
      add constraint workspace_queue_time_slots_ai_draft_type_check
      check (ai_draft_type in ('informational', 'engagement', 'product') or ai_draft_type is null);
  end if;
end $$;

update public.workspace_queue_time_slots as slot
set
  source_mode = coalesce(setting.source_mode, 'ai_type'),
  ai_draft_type = case
    when coalesce(setting.source_mode, 'ai_type') = 'ai_type' then setting.ai_draft_type
    else null
  end
from public.workspace_queue_settings as setting
where setting.id = slot.workspace_queue_settings_id
  and (slot.source_mode is null or slot.ai_draft_type is null);

create unique index if not exists workspace_queue_time_slots_unique_idx
  on public.workspace_queue_time_slots (workspace_queue_settings_id, weekday, slot_time);

create index if not exists workspace_queue_time_slots_settings_weekday_idx
  on public.workspace_queue_time_slots (workspace_queue_settings_id, weekday);

create index if not exists workspace_queue_time_slots_is_active_idx
  on public.workspace_queue_time_slots (is_active);

create table if not exists public.workspace_queue_dispatch_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  workspace_queue_settings_id uuid not null references public.workspace_queue_settings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_mode text not null check (
    source_mode in ('ai_type', 'ai_random', 'draft_random')
  ),
  ai_draft_type text check (
    ai_draft_type in ('informational', 'engagement', 'product')
  ),
  timezone text not null default 'UTC',
  local_date date not null,
  weekday smallint not null check (weekday between 0 and 6),
  slot_time time not null,
  status text not null default 'running' check (
    status in ('running', 'success', 'skipped', 'failed')
  ),
  summary jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);

create unique index if not exists workspace_queue_dispatch_runs_unique_slot_idx
  on public.workspace_queue_dispatch_runs (workspace_id, local_date, slot_time);

create index if not exists workspace_queue_dispatch_runs_workspace_created_idx
  on public.workspace_queue_dispatch_runs (workspace_id, created_at desc);

create index if not exists workspace_queue_dispatch_runs_status_idx
  on public.workspace_queue_dispatch_runs (status);
