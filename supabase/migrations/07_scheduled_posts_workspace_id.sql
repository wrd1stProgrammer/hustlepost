alter table public.scheduled_posts
add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;

create index if not exists scheduled_posts_workspace_id_idx
on public.scheduled_posts (workspace_id);

update public.scheduled_posts as scheduled
set workspace_id = (generated.prompt_snapshot ->> 'workspace_id')::uuid
from public.generated_hooks as generated
where scheduled.generated_hook_id = generated.id
  and scheduled.workspace_id is null
  and generated.prompt_snapshot is not null
  and (generated.prompt_snapshot ->> 'workspace_id') ~* '^[0-9a-f-]{36}$';
