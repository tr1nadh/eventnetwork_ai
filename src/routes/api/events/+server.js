import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { json, error } from '@sveltejs/kit';

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
      created_by: locals.user.id
    })
    .select('id, name, description, slug, created_by, created_at, updated_at')
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
    let query = admin.from('events').select('id, name, description, slug, created_by, created_at, updated_at')
      .eq('created_by', locals.user.id);
    if (q) {
      query = query.or(`name.ilike.%${safeQ}%,description.ilike.%${safeQ}%`);
    }
    return query;
  };

  const getJoinedQuery = async () => {
    const { data: joined, error: jErr } = await admin.from('event_participants')
      .select('event_id')
      .eq('user_id', locals.user.id)
      .eq('status', 'joined');
    const joinedIds = !jErr && joined ? joined.map(j => j.event_id) : [];
    
    if (joinedIds.length === 0) return Promise.resolve({ data: [] });
    
    let query = admin.from('events').select('id, name, description, slug, created_by, created_at, updated_at')
      .in('id', joinedIds);
    if (q) {
      query = query.or(`name.ilike.%${safeQ}%,description.ilike.%${safeQ}%`);
    }
    return query;
  };

  try {
    let events = [];

    if (filter === 'hosting') {
      const { data } = await getHostingQuery();
      events = data || [];
    } else if (filter === 'joined') {
      const { data } = await getJoinedQuery();
      events = data || [];
    } else {
      // 'all'
      const [hostingRes, joinedRes] = await Promise.all([
        getHostingQuery(),
        getJoinedQuery()
      ]);
      
      const combined = [...(hostingRes.data || []), ...(joinedRes.data || [])];
      // Deduplicate by ID
      events = Array.from(new Map(combined.map(e => [e.id, e])).values());
    }

    // Sort descending by created_at
    events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return json({ events });
  } catch (fetchError) {
    throw error(500, fetchError.message || 'Error fetching events');
  }
}
