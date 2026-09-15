import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { json, error } from '@sveltejs/kit';

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const SELECT_FIELDS = 'id, name, description, slug, created_by, created_at, updated_at, venue_map, start_time, end_time, location, google_map_url, event_format, attendees_count, is_approval_required';

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

  const now = new Date();
  const startTime = body?.start_time ? new Date(body.start_time).toISOString() : now.toISOString();
  const endTime = body?.end_time ? new Date(body.end_time).toISOString() : new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const location = body?.location?.trim() || null;
  const google_map_url = body?.google_map_url?.trim() || null;
  const event_format = ['online', 'offline', 'hybrid'].includes(body?.event_format) ? body.event_format : 'offline';
  const is_approval_required = Boolean(body?.is_approval_required);

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
      event_format,
      is_approval_required
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
      let query = admin.from('events')
        .select(SELECT_FIELDS);
      if (q) {
        query = query.or(`name.ilike.%${safeQ}%,description.ilike.%${safeQ}%,location.ilike.%${safeQ}%`);
      }
      const { data, error: err } = await query.order('start_time', { ascending: false });
      if (err) throw err;
      
      const { data: joined, error: jErr } = await admin.from('event_participants')
        .select('event_id')
        .eq('user_id', locals.user.id)
        .eq('status', 'joined');
      const joinedIds = !jErr && joined ? joined.map(j => j.event_id) : [];
      
      events = (data || []).map(e => ({
        ...e,
        joined: joinedIds.includes(e.id)
      }));
    }

    events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return json({ events });
  } catch (fetchError) {
    throw error(500, fetchError.message || 'Error fetching events');
  }
}
