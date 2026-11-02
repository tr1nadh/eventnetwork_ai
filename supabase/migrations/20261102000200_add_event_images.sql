alter table public.events
  add column if not exists event_logo_url text,
  add column if not exists event_banner_url text;
