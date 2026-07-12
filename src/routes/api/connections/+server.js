import { json, error } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server';
import { createSupabaseAdminClient } from '$lib/supabase/admin';

export async function GET({ url, cookies }) {
  const eventId = url.searchParams.get('event_id');
  const filter = url.searchParams.get('filter');
  if (!eventId) throw error(400, 'Missing event_id');
  if (!filter) throw error(400, 'Missing filter');

  const supabase = createSupabaseServerClient(cookies);
  const admin = createSupabaseAdminClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw error(401, 'Unauthenticated');

  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  // Base query for connections of the event
  let query = supabase
    .from('connections')
    .select('id, status, met_at, match_id, sender_user_id, receiver_user_id, matches(match_details)', { count: 'exact' })
    .eq('event_id', eventId);

  // Apply filter
  if (filter === 'all') {
    query = query.or(`sender_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`);
  } else if (filter === 'received') {
    query = query.eq('receiver_user_id', user.id).eq('status', 'pending');
  } else if (filter === 'sent') {
    query = query.eq('sender_user_id', user.id).eq('status', 'pending');
  } else if (filter === 'connected') {
    query = query.eq('status', 'accepted').or(`sender_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`);
  } else if (filter === 'met') {
    query = query.eq('status', 'accepted').not('met_at', 'is', null).or(`sender_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`);
  } else {
    throw error(400, 'Invalid filter');
  }

  // Apply pagination and sort by most recently updated
  query = query.order('updated_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data: dbConns, error: connError, count } = await query;
  if (connError) throw error(500, connError.message);

  // Enrich each connection with match details and other participant's profile
  const otherUserIds = [...new Set((dbConns || []).map(c => c.sender_user_id === user.id ? c.receiver_user_id : c.sender_user_id))];

  let profilesMap = {};
  let usersMap = {};

  if (otherUserIds.length > 0) {
    const [profilesRes, usersRes] = await Promise.all([
      supabase.from('network_profiles').select('user_id, display_name, what_i_do, about_me, looking_for').eq('event_id', eventId).in('user_id', otherUserIds),
      admin.from('users').select('id, name, avatar_url').in('id', otherUserIds)
    ]);

    if (profilesRes.data) {
      for (const p of profilesRes.data) profilesMap[p.user_id] = p;
    }
    if (usersRes.data) {
      for (const u of usersRes.data) usersMap[u.id] = u;
    }
  }

  const enriched = (dbConns || []).map((c) => {
    const matchPercentage = c.matches?.match_details?.score ?? null;
    const explanation = c.matches?.match_details?.summary ?? null;
    const matchDetails = c.matches?.match_details ?? null;

    const otherUserId = c.sender_user_id === user.id ? c.receiver_user_id : c.sender_user_id;
    const profile = profilesMap[otherUserId] || {};
    const otherUser = usersMap[otherUserId];

    return {
      id: c.id,
      status: c.status,
      met_at: c.met_at,
      match_id: c.match_id,
      sender_user_id: c.sender_user_id,
      receiver_user_id: c.receiver_user_id,
      matchPercentage,
      explanation,
      matchDetails,
      profile: {
        ...profile,
        display_name: profile.display_name ?? otherUser?.name ?? 'Unknown',
        avatar_url: otherUser?.avatar_url ?? null
      }
    };
  });

  const hasMore = count !== null ? (offset + limit < count) : false;

  return json({ connections: enriched, hasMore, count });
}
