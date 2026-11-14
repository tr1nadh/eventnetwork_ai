-- The server supplies the verified viewer. Other roles cannot invoke this RPC.
create function public.list_event_page(
  viewer uuid, list_filter text, search_text text, format_filter text,
  period_start timestamptz, period_end timestamptz, status_filter text,
  page_number integer, page_size integer, include_venue_map boolean
) returns jsonb
language sql stable security invoker set search_path = ''
as $$
with candidates as (
  select e.id, e.created_at, e.start_time, e.end_time, e.event_format,
    membership.event_id is not null as joined,
    case when coalesce(e.start_time, e.created_at) > now() then 'upcoming'
      when coalesce(e.end_time, coalesce(e.start_time, e.created_at) + interval '2 hours') >= now() then 'live'
      else 'completed' end as status,
    e.created_by
  from public.events e
  left join public.event_participants membership on membership.event_id = e.id
    and membership.user_id = viewer and membership.status = 'joined'
  where (list_filter <> 'discover' or (e.is_public
    and (period_start is null or e.end_time >= period_start)
    and (period_end is null or e.start_time <= period_end)
    and (format_filter not in ('online','offline') or e.event_format in (format_filter,'hybrid'))))
    and (search_text = '' or e.name ilike '%' || search_text || '%'
      or e.description ilike '%' || search_text || '%' or e.location ilike '%' || search_text || '%')
), eligible as (
  select * from candidates where list_filter = 'discover'
    or (list_filter in ('hosting','all') and created_by = viewer)
    or (list_filter in ('joined','all') and joined)
), filtered as (
  select * from eligible where list_filter <> 'discover'
    or status_filter not in ('live','upcoming','completed') or status = status_filter
), page_rows as (
  select f.*, row_number() over (order by
    case when list_filter = 'discover' then case f.status when 'live' then 1 when 'upcoming' then 2 else 3 end end,
    case when list_filter = 'discover' and f.status <> 'completed' then f.start_time end asc nulls first,
    case when list_filter = 'discover' and f.status = 'completed' then coalesce(f.end_time,f.start_time) end desc,
    case when list_filter <> 'discover' then f.created_at end desc, f.id) as position
  from filtered f order by position limit page_size offset ((page_number::bigint - 1) * page_size)
)
select jsonb_build_object('events', coalesce((
  select jsonb_agg(to_jsonb(card) || case when include_venue_map then jsonb_build_object('venue_map', e.venue_map) else '{}'::jsonb end || jsonb_build_object('joined', p.joined and list_filter <> 'hosting')
    || case when list_filter = 'discover' then jsonb_build_object('status', p.status)
       else jsonb_build_object('event_meeting_url', e.event_meeting_url) end order by p.position)
  from page_rows p join public.events e on e.id = p.id
  cross join lateral (select e.id, e.name, e.description, e.slug, e.created_by, e.created_at, e.updated_at,
    e.start_time, e.end_time, e.location, e.google_map_url, e.event_format, e.attendees_count,
    e.max_attendees, e.is_attendees_register_limited, e.event_logo_url, e.event_banner_url, e.is_public,
    e.allow_join_after_start, e.is_approval_required, e.is_venue_enabled, e.is_network_enabled,
    e.is_announcements_enabled) card
), '[]'::jsonb), 'total', (select count(*) from filtered))
|| case when list_filter = 'discover' then (
  select jsonb_build_object(
    'counts', jsonb_build_object('all', count(*), 'live', count(*) filter(where status='live'),
      'upcoming', count(*) filter(where status='upcoming'), 'completed', count(*) filter(where status='completed')),
    'formatCounts', jsonb_build_object('online', count(*) filter(where event_format in ('online','hybrid')),
      'offline', count(*) filter(where coalesce(nullif(event_format,''),'offline') in ('offline','hybrid'))),
    'eventDates', coalesce(jsonb_agg(distinct to_char(start_time at time zone 'UTC','YYYY-MM-DD'))
      filter(where start_time is not null),'[]'::jsonb)) from eligible
) else '{}'::jsonb end;
$$;
revoke all on function public.list_event_page(uuid,text,text,text,timestamptz,timestamptz,text,integer,integer,boolean)
  from public, anon, authenticated;
grant execute on function public.list_event_page(uuid,text,text,text,timestamptz,timestamptz,text,integer,integer,boolean)
  to service_role;
