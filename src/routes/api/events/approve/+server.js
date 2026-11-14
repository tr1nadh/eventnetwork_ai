import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { json, error } from '@sveltejs/kit';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * POST /api/events/approve
 * Body: { event_id: string, user_id: string, action: 'approve' | 'reject' }
 * Only the event organizer can call this endpoint.
 */
export async function POST({ request, locals }) {
  const currentUser = locals.user;

  if (!currentUser) {
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

  // Find event by UUID or slug safely
  const isUuid = UUID_REGEX.test(event_id);
  let eventRow = null;

  if (isUuid) {
    const { data, error: fetchErr } = await admin
      .from('events')
      .select('id, created_by, attendees_count')
      .eq('id', event_id)
      .maybeSingle();
    if (fetchErr) {
      console.error('[approve] Event lookup error:', fetchErr);
      throw error(500, fetchErr.message);
    }
    eventRow = data;
  } else {
    const { data, error: fetchErr } = await admin
      .from('events')
      .select('id, created_by, attendees_count')
      .eq('slug', event_id)
      .maybeSingle();
    if (fetchErr) {
      console.error('[approve] Event slug lookup error:', fetchErr);
      throw error(500, fetchErr.message);
    }
    eventRow = data;
  }

  if (!eventRow) {
    throw error(404, 'Event not found.');
  }

  if (eventRow.created_by !== currentUser.id) {
    throw error(403, 'Only the event organizer can approve or reject requests.');
  }

  const realEventId = eventRow.id;

  if (action === 'approve') {
    const { data: result, error: approvalError } = await admin.rpc('register_event_participant', {
      p_event_id: realEventId,
      p_user_id: user_id,
      p_approver_id: currentUser.id,
    });
    if (approvalError?.code === 'PGRST202') {
      console.error('[approve] Registration function unavailable:', approvalError.message);
      throw error(503, 'Attendance approvals are temporarily unavailable. Please try again later.');
    }
    if (approvalError) throw error(500, approvalError.message);
    if (!result?.success) {
      if (result?.reason === 'capacity_reached') throw error(409, 'Registration is full.');
      if (result?.reason === 'request_not_found') throw error(404, 'Request not found.');
      if (result?.reason === 'forbidden') throw error(403, 'Only the organizer can approve requests.');
      throw error(409, 'Registration is closed.');
    }
    return json({ success: true, action: 'approved' });
  } else {
    // reject: remove the participant row
    const { error: deleteError } = await admin
      .from('event_participants')
      .delete()
      .eq('event_id', realEventId)
      .eq('user_id', user_id)
      .in('status', ['waitlisted', 'requested']);

    if (deleteError) {
      console.error('[approve] delete error:', deleteError);
      throw error(500, deleteError.message);
    }

    return json({ success: true, action: 'rejected' });
  }
}
