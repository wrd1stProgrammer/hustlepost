alter table if exists public.generated_hooks
  add column if not exists output_reply_text text;
