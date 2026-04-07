create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  target_audience text not null default '',
  product_link text not null default '',
  common_instruction text not null default '',
  informational_focus text not null default '',
  engagement_focus text not null default '',
  product_focus text not null default '',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workspaces_user_id_name_idx
  on public.workspaces (user_id, lower(name));

create unique index if not exists workspaces_single_active_idx
  on public.workspaces (user_id)
  where is_active = true;

create index if not exists workspaces_user_id_created_at_idx
  on public.workspaces (user_id, created_at desc);

create table if not exists public.workspace_keywords (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  keyword text not null,
  position integer not null check (position between 1 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workspace_keywords_workspace_position_idx
  on public.workspace_keywords (workspace_id, position);

create unique index if not exists workspace_keywords_workspace_keyword_idx
  on public.workspace_keywords (workspace_id, lower(keyword));

create index if not exists workspace_keywords_workspace_id_idx
  on public.workspace_keywords (workspace_id);
