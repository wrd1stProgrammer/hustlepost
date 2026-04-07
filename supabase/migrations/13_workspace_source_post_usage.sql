create table if not exists public.workspace_source_post_usage (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_post_id uuid not null references public.viral_posts(id) on delete cascade,
  first_used_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  primary key (workspace_id, source_post_id)
);

create index if not exists workspace_source_post_usage_workspace_id_last_used_at_idx
  on public.workspace_source_post_usage (workspace_id, last_used_at desc);

insert into public.workspace_source_post_usage (
  workspace_id,
  source_post_id,
  first_used_at,
  last_used_at
)
select
  usage.workspace_id,
  usage.source_post_id,
  usage.first_used_at,
  usage.last_used_at
from (
  select
    (generated.prompt_snapshot ->> 'workspace_id')::uuid as workspace_id,
    source_posts.source_post_id,
    min(generated.created_at) as first_used_at,
    max(generated.created_at) as last_used_at
  from public.generated_hooks as generated
  join public.workspaces as workspace
    on workspace.id = (generated.prompt_snapshot ->> 'workspace_id')::uuid
  cross join lateral unnest(generated.source_post_ids) as source_posts(source_post_id)
  join public.viral_posts as viral_post
    on viral_post.id = source_posts.source_post_id
  where generated.prompt_snapshot is not null
    and generated.prompt_snapshot ? 'workspace_id'
    and (generated.prompt_snapshot ->> 'workspace_id') ~* '^[0-9a-f-]{36}$'
  group by 1, 2
) as usage
on conflict (workspace_id, source_post_id) do update
  set first_used_at = least(public.workspace_source_post_usage.first_used_at, excluded.first_used_at),
      last_used_at = greatest(public.workspace_source_post_usage.last_used_at, excluded.last_used_at);
