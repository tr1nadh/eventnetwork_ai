-- Public by default: organizers can opt events out of discovery.
alter table public.events
  add column if not exists is_public boolean not null default true;

-- Keeps the discovery filter efficient as the events table grows.
create index if not exists events_public_discovery_idx
  on public.events (start_time)
  where is_public = true;
