import { json, error } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server';

/**
 * POST /api/connections/create
 * Creates a new connection request (status: pending) between the authenticated user (sender) and another user (receiver) for a specific event.
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

  // Check for existing connection to enforce unique constraint (event_id, sender_user_id, receiver_user_id)
  const { data: existing, error: existErr } = await supabase
    .from('connections')
    .select('id')
    .eq('event_id', event_id)
    .eq('sender_user_id', user.id)
    .eq('receiver_user_id', receiver_user_id)
    .single();

  if (existErr && existErr.code !== 'PGRST116') {
    // Any error other than "row not found" should be reported
    throw error(500, existErr.message);
  }

  if (existing) {
    throw error(409, 'Connection already exists');
  }

  const { data, error: insertErr } = await supabase
    .from('connections')
    .insert({
      event_id,
      sender_user_id: user.id,
      receiver_user_id,
      status: 'pending',
      updated_at: new Date().toISOString()
    })
    .select('*')
    .single();

  if (insertErr) throw error(500, insertErr.message);

  return json({ connection: data });
}
