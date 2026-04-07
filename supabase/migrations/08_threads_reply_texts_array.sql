alter table public.generated_hooks
  add column if not exists output_reply_texts text[];

update public.generated_hooks
set output_reply_texts = array[output_reply_text]
where output_reply_text is not null
  and coalesce(array_length(output_reply_texts, 1), 0) = 0;

alter table public.scheduled_posts
  add column if not exists reply_texts text[];

update public.scheduled_posts
set reply_texts = array[reply_text]
where reply_text is not null
  and coalesce(array_length(reply_texts, 1), 0) = 0;
