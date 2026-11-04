import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { json, error } from '@sveltejs/kit';

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const SELECT_FIELDS = 'id, name, description, slug, created_by, created_at, updated_at, venue_map, start_time, end_time, location, google_map_url, event_meeting_url, event_format, attendees_count, max_attendees, is_attendees_register_limited, event_logo_url, event_banner_url, is_public, allow_join_after_start, is_approval_required, is_venue_enabled, is_network_enabled, is_announcements_enabled';
const MAX_ATTENDEES_REGEX = /^[1-9]\d*$/;

function parseMaxAttendees(value) {
  const text = String(value ?? '').trim();
  if (!MAX_ATTENDEES_REGEX.test(text)) return null;

  const parsed = Number(text);
  return Number.isSafeInteger(parsed) && parsed >= 4 ? parsed : null;
}

export async function POST({ request, locals }) {
  if (!locals.user) {
    throw error(401, 'Unauthorized.');
  }

  const body = await request.json().catch(() => null);

  const name = body?.name?.trim();
  const description = body?.description?.trim() || null;
  const slug = (body?.id?.trim() || (name ? slugify(name) : '')).toLowerCase();

  if (!name || !slug) {
    throw error(400, 'Name and ID are required.');
  }

  const event_logo_url = body?.event_logo_url?.trim() || null;
  const event_banner_url = body?.event_banner_url?.trim() || null;
  if (!event_logo_url) throw error(400, 'An event logo is required.');

  const now = new Date();
  const startTimeDate = body?.start_time ? new Date(body.start_time) : now;
  const endTimeDate = body?.end_time ? new Date(body.end_time) : new Date(now.getTime() + 2 * 60 * 60 * 1000);

  if (isNaN(startTimeDate.getTime()) || isNaN(endTimeDate.getTime())) {
    throw error(400, 'Invalid date format.');
  }

  if (startTimeDate < new Date(now.getTime() - 5 * 60 * 1000)) {
    throw error(400, 'Start time cannot be in the past.');
  }

  if (endTimeDate <= startTimeDate) {
    throw error(400, 'End time must be greater than start time.');
  }

  const startTime = startTimeDate.toISOString();
  const endTime = endTimeDate.toISOString();
  const location = body?.location?.trim() || null;
  const google_map_url = body?.google_map_url?.trim() || null;
  const event_meeting_url = body?.event_meeting_url?.trim() || null;
  const event_format = ['online', 'offline', 'hybrid'].includes(body?.event_format) ? body.event_format : 'offline';
  const is_public = body?.is_public !== undefined ? Boolean(body.is_public) : true;
  const allow_join_after_start = body?.allow_join_after_start !== undefined ? Boolean(body.allow_join_after_start) : true;
  const is_approval_required = Boolean(body?.is_approval_required);
  const is_venue_enabled = body?.is_venue_enabled !== undefined ? Boolean(body.is_venue_enabled) : true;
  const is_network_enabled = Boolean(body?.is_network_enabled);
  const is_announcements_enabled = body?.is_announcements_enabled !== undefined ? Boolean(body.is_announcements_enabled) : true;
  const max_attendees = parseMaxAttendees(body?.max_attendees ?? 20);
  if (max_attendees === null) {
    throw error(400, 'Max attendees must be a whole number of at least 4.');
  }
  if (body?.is_attendees_register_limited !== undefined && typeof body.is_attendees_register_limited !== 'boolean') {
    throw error(400, 'Attendees register limited must be true or false.');
  }
  const is_attendees_register_limited = body?.is_attendees_register_limited ?? true;

  const admin = createSupabaseAdminClient();

  const { data: existingEvent, error: lookupError } = await admin
    .from('events')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (lookupError) {
    throw error(500, lookupError.message);
  }

  if (existingEvent) {
    throw error(409, 'That ID is already in use. Please choose another one.');
  }

  const { data, error: insertError } = await admin
    .from('events')
    .insert({
      name,
      description,
      slug,
      created_by: locals.user.id,
      start_time: startTime,
      end_time: endTime,
      location,
      google_map_url,
      event_meeting_url,
      event_format,
      max_attendees,
      is_attendees_register_limited,
      event_logo_url,
      event_banner_url,
      is_public,
      allow_join_after_start,
      is_approval_required,
      is_venue_enabled,
      is_network_enabled,
      is_announcements_enabled
    })
    .select(SELECT_FIELDS)
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      throw error(409, 'That ID is already in use. Please choose another one.');
    }

    throw error(400, insertError.message);
  }

  return json({ event: data }, { status: 201 });
}

export async function GET({ url, locals }) {
  if (!locals.user) {
    throw error(401, 'Unauthorized.');
  }

  const filter = url.searchParams.get('filter') || 'all';
  const q = url.searchParams.get('q') || '';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '12', 10)));
  const safeQ = q.replace(/"/g, '""');

  const admin = createSupabaseAdminClient();

  const getHostingQuery = () => {
    let query = admin.from('events').select(SELECT_FIELDS)
      .eq('created_by', locals.user.id);
    if (q) {
      query = query.or(`name.ilike.%${safeQ}%,description.ilike.%${safeQ}%,location.ilike.%${safeQ}%`);
    }
    return query.then(({ data, error }) => {
      if (error) throw error;
      const withFlag = (data || []).map(e => ({ ...e, joined: false }));
      return { data: withFlag };
    });
  };

  const getJoinedQuery = async () => {
    const { data: joined, error: jErr } = await admin.from('event_participants')
      .select('event_id')
      .eq('user_id', locals.user.id)
      .eq('status', 'joined');
    const joinedIds = !jErr && joined ? joined.map(j => j.event_id) : [];
    
    if (joinedIds.length === 0) return Promise.resolve({ data: [] });
    
    let query = admin.from('events').select(SELECT_FIELDS)
      .in('id', joinedIds);
    if (q) {
      query = query.or(`name.ilike.%${safeQ}%,description.ilike.%${safeQ}%,location.ilike.%${safeQ}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    const withFlag = (data || []).map(e => ({ ...e, joined: true }));
    return { data: withFlag };
  };

  try {
    let events = [];

    if (filter === 'hosting') {
      const { data } = await getHostingQuery();
      events = data || [];
    } else if (filter === 'joined') {
      const { data } = await getJoinedQuery();
      events = data || [];
    } else if (filter === 'all') {
      const { data: hosted } = await getHostingQuery();
      const { data: joined } = await getJoinedQuery();
      
      const combinedMap = new Map();
      for (const item of [...(hosted || []), ...(joined || [])]) {
        const existing = combinedMap.get(item.id);
        if (!existing || item.joined) {
          combinedMap.set(item.id, item);
        }
      }
      events = Array.from(combinedMap.values());
    } else if (filter === 'discover') {
      // Format filter: 'online' | 'offline' | 'hybrid' | '' (all)
      const format = url.searchParams.get('format') || '';
      // Date filter params
      const date = url.searchParams.get('date') || '';         // single date: YYYY-MM-DD
      const dateStart = url.searchParams.get('date_start') || ''; // range start: YYYY-MM-DD
      const dateEnd = url.searchParams.get('date_end') || '';   // range end: YYYY-MM-DD
      // 4 Status Pill filter: 'all' | 'live' | 'upcoming' | 'completed'
      const status = url.searchParams.get('status') || 'all';
      // Server pagination params
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
      const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '9', 10));

      let query = admin.from('events')
        .select(SELECT_FIELDS)
        .eq('is_public', true);

      // Text search
      if (q) {
        query = query.or(`name.ilike.%${safeQ}%,description.ilike.%${safeQ}%,location.ilike.%${safeQ}%`);
      }

      // Format filter
      if (format === 'online') {
        query = query.in('event_format', ['online', 'hybrid']);
      } else if (format === 'offline') {
        query = query.in('event_format', ['offline', 'hybrid']);
      }

      // Date filter: single date — event must span the selected date
      // (event.start_time <= date+EOD  AND  event.end_time >= date+SOD)
      if (date) {
        const dayStart = `${date}T00:00:00.000Z`;
        const dayEnd   = `${date}T23:59:59.999Z`;
        // events that overlap the day: start_time <= dayEnd AND end_time >= dayStart
        query = query.lte('start_time', dayEnd).gte('end_time', dayStart);
      } else if (dateStart || dateEnd) {
        // Range: events overlapping [dateStart, dateEnd]
        if (dateStart) {
          // event must end on or after range start
          const rs = `${dateStart}T00:00:00.000Z`;
          query = query.gte('end_time', rs);
        }
        if (dateEnd) {
          // event must start on or before range end
          const re = `${dateEnd}T23:59:59.999Z`;
          query = query.lte('start_time', re);
        }
      }

      const { data, error: err } = await query;
      if (err) throw err;
      
      const { data: joined, error: jErr } = await admin.from('event_participants')
        .select('event_id')
        .eq('user_id', locals.user.id)
        .eq('status', 'joined');
      const joinedIds = !jErr && joined ? joined.map(j => j.event_id) : [];
      
      const rawEvents = (data || []).map(e => ({
        ...e,
        joined: joinedIds.includes(e.id)
      }));

      // Server-side status classification using current server UTC time
      const now = new Date();
      function classifyEvent(e) {
        const start = new Date(e.start_time || e.created_at);
        const end = e.end_time ? new Date(e.end_time) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
        if (now >= start && now <= end) return 'live';
        if (now < start) return 'upcoming';
        return 'completed';
      }

      const liveEvents = [];
      const upcomingEvents = [];
      const completedEvents = [];
      const eventDatesSet = new Set();

      for (const e of rawEvents) {
        const s = classifyEvent(e);
        e.status = s; // Attach server-evaluated status

        if (e.start_time) {
          const d = new Date(e.start_time);
          if (!isNaN(d.getTime())) {
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            eventDatesSet.add(dateStr);
          }
        }

        if (s === 'live') {
          liveEvents.push(e);
        } else if (s === 'upcoming') {
          upcomingEvents.push(e);
        } else {
          completedEvents.push(e);
        }
      }

      // Sort upcoming events chronologically (soonest start first)
      upcomingEvents.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      // Sort completed events reverse-chronologically (most recently ended first)
      completedEvents.sort((a, b) => new Date(b.end_time || b.start_time) - new Date(a.end_time || a.start_time));
      // Sort live events (soonest ending first)
      liveEvents.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

      const counts = {
        all: rawEvents.length,
        live: liveEvents.length,
        upcoming: upcomingEvents.length,
        completed: completedEvents.length
      };

      const onlineCount = rawEvents.filter(e => e.event_format === 'online' || e.event_format === 'hybrid').length;
      const offlineCount = rawEvents.filter(e => !e.event_format || e.event_format === 'offline' || e.event_format === 'hybrid').length;

      // Select target events for chosen status
      let targetEvents = [];
      if (status === 'live') {
        targetEvents = liveEvents;
      } else if (status === 'upcoming') {
        targetEvents = upcomingEvents;
      } else if (status === 'completed') {
        targetEvents = completedEvents;
      } else {
        // 'all': Priority ordering: Live -> Upcoming -> Completed
        targetEvents = [...liveEvents, ...upcomingEvents, ...completedEvents];
      }

      // Server-side pagination slice
      const offset = (page - 1) * limit;
      const paginatedEvents = targetEvents.slice(offset, offset + limit);
      const total = targetEvents.length;
      const hasMore = offset + limit < total;

      return json({
        events: paginatedEvents,
        pagination: {
          page,
          limit,
          total,
          hasMore
        },
        counts,
        formatCounts: {
          online: onlineCount,
          offline: offlineCount
        },
        eventDates: Array.from(eventDatesSet)
      });
    }

    events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const total = events.length;
    const offset = (page - 1) * limit;
    const paginatedEvents = events.slice(offset, offset + limit);

    return json({
      events: paginatedEvents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasMore: offset + limit < total
      }
    });
  } catch (fetchError) {
    throw error(500, fetchError.message || 'Error fetching events');
  }
}
