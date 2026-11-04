alter table public.events
  add column if not exists max_attendees integer not null default 20,
  add column if not exists is_attendees_register_limited boolean not null default true;

update public.events
set max_attendees = 20
where max_attendees is null or max_attendees < 4;

update public.events
set is_attendees_register_limited = true
where is_attendees_register_limited is null;

update public.events as event_row
set attendees_count = (
  select count(*)::integer
  from public.event_participants as participant
  where participant.event_id = event_row.id
    and participant.status = 'joined'
);

alter table public.events
  alter column max_attendees set default 20,
  alter column max_attendees set not null,
  alter column is_attendees_register_limited set default true,
  alter column is_attendees_register_limited set not null;

alter table public.events
  drop constraint if exists events_max_attendees_minimum;

alter table public.events
  add constraint events_max_attendees_minimum check (max_attendees >= 4);

create or replace function public.join_event_with_attendee_limit(
  p_event_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_existing_status text;
  v_attendees_count integer;
begin
  select * into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'event_not_found');
  end if;

  select status into v_existing_status
  from public.event_participants
  where event_id = p_event_id and user_id = p_user_id
  for update;

  if v_existing_status = 'joined' then
    select count(*)::integer into v_attendees_count
    from public.event_participants
    where event_id = p_event_id and status = 'joined';
    return jsonb_build_object('success', true, 'attendees_count', v_attendees_count);
  end if;

  select count(*)::integer into v_attendees_count
  from public.event_participants
  where event_id = p_event_id and status = 'joined';

  if v_event.is_attendees_register_limited and v_attendees_count >= v_event.max_attendees then
    return jsonb_build_object('success', false, 'reason', 'capacity_reached');
  end if;

  insert into public.event_participants (event_id, user_id, status, joined_at)
  values (p_event_id, p_user_id, 'joined', now())
  on conflict (event_id, user_id)
  do update set status = 'joined', joined_at = excluded.joined_at;

  v_attendees_count := v_attendees_count + 1;
  update public.events
  set attendees_count = v_attendees_count
  where id = p_event_id;

  return jsonb_build_object('success', true, 'attendees_count', v_attendees_count);
end;
$$;

revoke execute on function public.join_event_with_attendee_limit(uuid, uuid) from public;
grant execute on function public.join_event_with_attendee_limit(uuid, uuid) to service_role;
