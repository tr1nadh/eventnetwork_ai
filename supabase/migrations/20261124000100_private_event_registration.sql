-- Keep private-event registration aligned with event access while the event row is locked.
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

  if event_row.is_public is false and p_approver_id is null
    and p_user_id is distinct from event_row.created_by and existing_status is distinct from 'joined' then
    return jsonb_build_object('success', false, 'reason', 'event_not_found');
  end if;

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
