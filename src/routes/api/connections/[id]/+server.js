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

  const updates = { status, updated_at: new Date().toISOString() };
  if (status === 'met') updates.met_at = new Date().toISOString();

  const { data, error: updError } = await supabase
    .from('connections')
    .update(updates)
    .eq('id', id)
    .or(`receiver_user_id.eq.${user.id},sender_user_id.eq.${user.id}`)
    .select('id, status, met_at')
    .single();

  if (updError) throw error(500, updError.message);
  return json({ connection: data });
}
