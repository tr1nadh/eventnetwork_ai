import { json, error } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server';

export async function GET({ url, cookies }) {
  const eventId = url.searchParams.get('event_id');
  const filter = url.searchParams.get('filter');
  if (!eventId) throw error(400, 'Missing event_id');
  if (!filter) throw error(400, 'Missing filter');

  const supabase = createSupabaseServerClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw error(401, 'Unauthenticated');

  // Base query for connections of the event
  let query = supabase
    .from('connections')
    .select('id, status, met_at, match_id, sender_user_id, receiver_user_id, matches(match_details)')
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

  const { data: dbConns, error: connError } = await query;
  if (connError) throw error(500, connError.message);

  // Enrich each connection with match details and other participant's profile
  const enriched = await Promise.all(
    (dbConns || []).map(async (c) => {
      const matchPercentage = c.matches?.match_details?.score ?? null;
      const explanation = c.matches?.match_details?.summary ?? null;

      const otherUserId = c.sender_user_id === user.id ? c.receiver_user_id : c.sender_user_id;

      const { data: profileData, error: profileErr } = await supabase
        .from('network_profiles')
        .select('display_name, what_i_do, about_me, looking_for')
        .eq('user_id', otherUserId)
        .single();
      const profile = profileErr ? {} : profileData;

      return {
        id: c.id,
        status: c.status,
        met_at: c.met_at,
        match_id: c.match_id,
        sender_user_id: c.sender_user_id,
        receiver_user_id: c.receiver_user_id,
        matchPercentage,
        explanation,
        profile
      };
    })
  );

  // Sort by match percentage descending
  enriched.sort((a, b) => (b.matchPercentage ?? 0) - (a.matchPercentage ?? 0));

  return json({ connections: enriched });
}
