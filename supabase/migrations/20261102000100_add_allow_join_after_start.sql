-- Registration remains open after an event starts unless the organizer opts out.
alter table public.events
  add column if not exists allow_join_after_start boolean not null default true;
