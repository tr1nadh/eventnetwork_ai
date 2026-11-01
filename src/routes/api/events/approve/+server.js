import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { json, error } from '@sveltejs/kit';

/**
 * POST /api/events/approve
 * Body: { event_id: string, user_id: string, action: 'approve' | 'reject' }
 * Only the event organizer can call this endpoint.
 */
export async function POST({ request, locals }) {
  if (!locals.user) {
    throw error(401, 'Unauthorized.');
  }

  const body = await request.json().catch(() => null);
  const { event_id, user_id, action } = body ?? {};

  if (!event_id || !user_id || !action) {
    throw error(400, 'event_id, user_id, and action are required.');
  }

  if (action !== 'approve' && action !== 'reject') {
    throw error(400, 'action must be "approve" or "reject".');
  }

  const admin = createSupabaseAdminClient();

  // Verify the caller is the event organizer
  const { data: eventRow } = await admin
    .from('events')
    .select('created_by')
    .eq('id', event_id)
    .maybeSingle();

  if (!eventRow || eventRow.created_by !== locals.user.id) {
    throw error(403, 'Only the event organizer can approve or reject requests.');
  }

  if (action === 'approve') {
    const { error: updateError } = await admin
      .from('event_participants')
      .update({ status: 'joined' })
      .eq('event_id', event_id)
      .eq('user_id', user_id)
      .eq('status', 'waitlisted');

    if (updateError) {
      console.error('[approve] update error:', updateError);
      throw error(500, updateError.message);
    }

    return json({ success: true, action: 'approved' });
  } else {
    // reject: remove the participant row
    const { error: deleteError } = await admin
      .from('event_participants')
      .delete()
      .eq('event_id', event_id)
      .eq('user_id', user_id)
      .eq('status', 'waitlisted');

    if (deleteError) {
      console.error('[approve] delete error:', deleteError);
      throw error(500, deleteError.message);
    }

    return json({ success: true, action: 'rejected' });
  }
}
