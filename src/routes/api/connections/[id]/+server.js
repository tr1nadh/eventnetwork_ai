import { json, error } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server';

/**
 * PATCH /api/connections/:id
 * Updates a connection's status (accepted, rejected, cancelled, met).
 * For 'met' status, also records met_at timestamp.
 */
export async function PATCH({ params, request, cookies }) {
  const { id } = params;
  if (!id) throw error(400, 'Missing connection id');

  const { status } = await request.json();
  const allowed = ['accepted', 'rejected', 'cancelled', 'met'];
  if (!allowed.includes(status)) throw error(400, 'Invalid status');

  const supabase = createSupabaseServerClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw error(401, 'Unauthenticated');

  // Fetch current connection
  const { data: currentConn, error: connErr } = await supabase
    .from('connections')
    .select('status, sender_user_id, receiver_user_id')
    .eq('id', id)
    .single();

  if (connErr || !currentConn) {
    throw error(404, 'Connection not found');
  }

  // Authorize based on sender or receiver and status
  if (currentConn.sender_user_id !== user.id && currentConn.receiver_user_id !== user.id) {
    throw error(403, 'Unauthorized');
  }

  const currentStatus = currentConn.status;

  // Enforce valid transitions
  // pending -> accepted, rejected, cancelled
  // accepted -> met, cancelled
  // rejected -> cannot transition
  // cancelled -> cannot transition
  // met -> cannot transition
  
  if (['rejected', 'cancelled', 'met'].includes(currentStatus)) {
    throw error(400, `Cannot transition from ${currentStatus}`);
  }
  
  if (currentStatus === 'pending') {
    if (!['accepted', 'rejected', 'cancelled'].includes(status)) {
      throw error(400, `Invalid transition from pending to ${status}`);
    }
  } else if (currentStatus === 'accepted') {
    if (!['met', 'cancelled'].includes(status)) {
      throw error(400, `Invalid transition from accepted to ${status}`);
    }
  }

  const updates = { updated_at: new Date().toISOString() };
  if (status === 'met') {
    updates.met_at = new Date().toISOString();
    updates.status = 'accepted'; // maintain accepted status, just add met_at
  } else {
    updates.status = status;
  }

  const { data, error: updError } = await supabase
    .from('connections')
    .update(updates)
    .eq('id', id)
    .select('id, status, met_at')
    .single();

  if (updError) throw error(500, updError.message);
  return json({ connection: data });
}
