-- Serialize registration and host approval against the same remaining seats.
create or replace function public.register_event_participant(
  p_event_id uuid, p_user_id uuid, p_approver_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  event_row public.events%rowtype;
  existing_status text;
  joined_count integer;
begin
  select * into event_row from public.events where id = p_event_id for update;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'event_not_found');
  end if;
  if p_approver_id is not null and p_approver_id is distinct from event_row.created_by then
    return jsonb_build_object('success', false, 'reason', 'forbidden');
  end if;

  select status into existing_status from public.event_participants
    where event_id = p_event_id and user_id = p_user_id for update;
  select count(*) into joined_count from public.event_participants
    where event_id = p_event_id and status = 'joined';

  if existing_status = 'joined' or
     (existing_status in ('waitlisted', 'requested') and p_approver_id is null) then
    return jsonb_build_object('success', true, 'status', existing_status, 'attendees_count', joined_count);
  end if;
  if p_approver_id is not null and coalesce(existing_status, '') not in ('waitlisted', 'requested') then
    return jsonb_build_object('success', false, 'reason', 'request_not_found');
  end if;
  if event_row.end_time <= now() or
     (p_approver_id is null and event_row.allow_join_after_start is false and event_row.start_time <= now()) then
    return jsonb_build_object('success', false, 'reason', 'registration_closed');
  end if;
  if event_row.is_attendees_register_limited and joined_count >= event_row.max_attendees then
    return jsonb_build_object('success', false, 'reason', 'capacity_reached');
  end if;

  if event_row.is_approval_required and p_approver_id is null then
    insert into public.event_participants (event_id, user_id, status, joined_at)
      values (p_event_id, p_user_id, 'waitlisted', now())
      on conflict (event_id, user_id) do update set status = 'waitlisted';
    return jsonb_build_object('success', true, 'status', 'waitlisted', 'attendees_count', joined_count);
  end if;

  insert into public.event_participants (event_id, user_id, status, joined_at)
    values (p_event_id, p_user_id, 'joined', now())
    on conflict (event_id, user_id) do update set status = 'joined', joined_at = excluded.joined_at;
  update public.events set attendees_count = joined_count + 1 where id = p_event_id;
  return jsonb_build_object('success', true, 'status', 'joined', 'attendees_count', joined_count + 1);
end;
$$;
revoke all on function public.register_event_participant(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.register_event_participant(uuid, uuid, uuid) to service_role;

create or replace function public.join_event_with_attendee_limit(p_event_id uuid, p_user_id uuid)
returns jsonb language sql security definer set search_path = public
as $$ select public.register_event_participant(p_event_id, p_user_id); $$;
revoke all on function public.join_event_with_attendee_limit(uuid, uuid) from public, anon, authenticated;
grant execute on function public.join_event_with_attendee_limit(uuid, uuid) to service_role;

-- Make the new RPC signatures available to the API after this script commits.
notify pgrst, 'reload schema';
