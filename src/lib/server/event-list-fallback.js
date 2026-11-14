import { error } from '@sveltejs/kit';

const cardFields = 'id,name,description,slug,created_by,created_at,updated_at,start_time,end_time,location,google_map_url,event_format,attendees_count,max_attendees,is_attendees_register_limited,event_logo_url,event_banner_url,is_public,allow_join_after_start,is_approval_required,is_venue_enabled,is_network_enabled,is_announcements_enabled';

// PostgREST can cap a response below the requested range. Use its total and
// actual row count so pagination and Discover counts cover the whole result.
async function readRows(query) {
  const rows = [];
  for (;;) {
    const { data, count, error: failure } = await query().range(rows.length, rows.length + 499);
    if (failure) throw error(500, failure.message);
    rows.push(...data);
    if (!data.length || rows.length >= count) return rows;
  }
}

function discoveryPage(events, args) {
  const now = Date.now();
  const groups = { live: [], upcoming: [], completed: [] };
  const formatCounts = { online: 0, offline: 0 };
  const dates = new Set();
  for (const event of events) {
    const start = Date.parse(event.start_time || event.created_at);
    const end = event.end_time ? Date.parse(event.end_time) : start + 7200000;
    event.status = start > now ? 'upcoming' : end >= now ? 'live' : 'completed';
    groups[event.status].push(event);
    if (event.start_time) dates.add(new Date(event.start_time).toISOString().slice(0, 10));
    if (['online', 'hybrid'].includes(event.event_format)) formatCounts.online++;
    if (!event.event_format || ['offline', 'hybrid'].includes(event.event_format)) formatCounts.offline++;
  }
  for (const group of [groups.live, groups.upcoming]) {
    group.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  }
  groups.completed.sort((a, b) =>
    new Date(b.end_time || b.start_time) - new Date(a.end_time || a.start_time));
  const selected = Object.hasOwn(groups, args.status_filter)
    ? groups[args.status_filter] : [...groups.live, ...groups.upcoming, ...groups.completed];
  return {
    events: selected, total: selected.length, eventDates: [...dates].sort(), formatCounts,
    counts: { all: events.length, live: groups.live.length, upcoming: groups.upcoming.length, completed: groups.completed.length },
  };
}

export async function listEventsFromTables(admin, args) {
  const filter = args.list_filter;
  const discover = filter === 'discover';
  const fields = [cardFields];
  if (!discover) fields.push('event_meeting_url');
  if (args.include_venue_map) fields.push('venue_map');
  function eventQuery(joinedOnly = false) {
    const projection = joinedOnly ? [...fields, 'event_participants!inner(user_id,status)'] : fields;
    let query = admin.from('events').select(projection.join(','), { count: 'exact' }).order('id');
    if (args.search_text) {
      const pattern = JSON.stringify('%' + args.search_text + '%');
      query = query.or(['name', 'description', 'location'].map(key => key + '.ilike.' + pattern).join(','));
    }
    if (joinedOnly) return query.eq('event_participants.user_id', args.viewer).eq('event_participants.status', 'joined');
    if (!discover) return query.eq('created_by', args.viewer);
    query = query.eq('is_public', true);
    if (args.period_start) query = query.gte('end_time', args.period_start);
    if (args.period_end) query = query.lte('start_time', args.period_end);
    if (['online', 'offline'].includes(args.format_filter)) query = query.in('event_format', [args.format_filter, 'hybrid']);
    return query;
  }

  let result;
  if (discover) {
    const [events, memberships] = await Promise.all([
      readRows(() => eventQuery()),
      readRows(() => admin.from('event_participants').select('event_id', { count: 'exact' })
        .eq('user_id', args.viewer).eq('status', 'joined').order('event_id')),
    ]);
    const joined = new Set(memberships.map(row => row.event_id));
    result = discoveryPage(events.map(row => ({ ...row, joined: joined.has(row.id) })), args);
  } else {
    const [hosted, joined] = await Promise.all([
      ['hosting', 'all'].includes(filter) ? readRows(() => eventQuery()) : [],
      ['joined', 'all'].includes(filter) ? readRows(() => eventQuery(true)) : [],
    ]);
    const byId = new Map(hosted.map(row => [row.id, { ...row, joined: false }]));
    for (const { event_participants, ...row } of joined) byId.set(row.id, { ...row, joined: true });
    const events = [...byId.values()].sort((a, b) =>
      Date.parse(b.created_at) - Date.parse(a.created_at) || a.id.localeCompare(b.id));
    result = { events, total: events.length };
  }
  const offset = (args.page_number - 1) * args.page_size;
  return { ...result, events: result.events.slice(offset, offset + args.page_size) };
}
