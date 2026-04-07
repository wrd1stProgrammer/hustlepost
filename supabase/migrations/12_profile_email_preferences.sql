alter table if exists public.profiles
  add column if not exists automation_emails_enabled boolean not null default true,
  add column if not exists post_failure_alert_emails_enabled boolean not null default false;
