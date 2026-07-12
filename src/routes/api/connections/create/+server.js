import { json, error } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server';
import { createSupabaseAdminClient } from '$lib/supabase/admin';

/**
 * POST /api/connections/create
 * Creates a new connection request between the authenticated user (sender) and another user (receiver).
 * If the receiver is a dummy user, the connection is automatically accepted.
 * Body JSON: { event_id: string, receiver_user_id: string }
 */
export async function POST({ request, cookies }) {
  const { event_id, receiver_user_id } = await request.json();
  if (!event_id) throw error(400, 'Missing event_id');
  if (!receiver_user_id) throw error(400, 'Missing receiver_user_id');

  const supabase = createSupabaseServerClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw error(401, 'Unauthenticated');

  // Prevent self‑connection
  if (user.id === receiver_user_id) {
    throw error(400, 'Cannot create a connection with yourself');
  }

  // Check for existing connection (event_id, sender_user_id, receiver_user_id)
  const { data: existing, error: existErr } = await supabase
    .from('connections')
    .select('id, status')
    .eq('event_id', event_id)
    .eq('sender_user_id', user.id)
    .eq('receiver_user_id', receiver_user_id)
    .single();

  if (existErr && existErr.code !== 'PGRST116') {
    throw error(500, existErr.message);
  }

  if (existing) {
    throw error(409, 'Connection already exists');
  }

  // Fetch the match_id from the matches table
  const { data: matchData, error: matchErr } = await supabase
    .from('matches')
    .select('id')
    .eq('event_id', event_id)
    .eq('user_id', user.id)
    .eq('matched_user_id', receiver_user_id)
    .single();

  if (matchErr && matchErr.code !== 'PGRST116') {
    throw error(500, 'Error fetching match information: ' + matchErr.message);
  }

  const match_id = matchData?.id || null;

  // Check if the receiver is a dummy user (identified by email pattern)
  const adminClient = createSupabaseAdminClient();
  const { data: receiverAuthData } = await adminClient.auth.admin.getUserById(receiver_user_id);
  const receiverEmail = receiverAuthData?.user?.email ?? '';
  const isDummy = /^dummy\d+\+.+@eventnetwork\.ai$/.test(receiverEmail);

  // Auto-accept if dummy, else start as pending
  const initialStatus = isDummy ? 'accepted' : 'pending';

  const { data: connection, error: insertErr } = await supabase
    .from('connections')
    .insert({
      event_id,
      sender_user_id: user.id,
      receiver_user_id,
      match_id,
      status: initialStatus,
      updated_at: new Date().toISOString()
    })
    .select('*')
    .single();

  if (insertErr) throw error(500, insertErr.message);

  // Fetch the receiver's profile to return to the client
  const { data: profile } = await supabase
    .from('network_profiles')
    .select('display_name, what_i_do, about_me, looking_for')
    .eq('user_id', receiver_user_id)
    .eq('event_id', event_id)
    .single();

  const { data: otherUser } = await adminClient
    .from('users')
    .select('name, avatar_url')
    .eq('id', receiver_user_id)
    .maybeSingle();

  connection.profile = {
    ...(profile ?? {
      display_name: 'Unknown',
      what_i_do: '',
      about_me: '',
      looking_for: ''
    }),
    display_name: profile?.display_name ?? otherUser?.name ?? 'Unknown',
    avatar_url: otherUser?.avatar_url ?? null
  };

  if (match_id) {
    const { data: matchRow } = await supabase
      .from('matches')
      .select('match_details')
      .eq('id', match_id)
      .single();

    connection.matchDetails = matchRow?.match_details ?? null;
    connection.matchPercentage = matchRow?.match_details?.score ?? null;
    connection.explanation = matchRow?.match_details?.summary ?? null;
  } else {
    connection.matchDetails = null;
    connection.matchPercentage = null;
    connection.explanation = null;
  }

  return json({ connection, auto_accepted: isDummy });
}
