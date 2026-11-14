import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { json, error } from '@sveltejs/kit';

export async function POST({ request, locals }) {
  if (!locals.user) {
    throw error(401, 'Unauthorized.');
  }

  const body = await request.json().catch(() => null);
  const event_id = body?.event_id;

  if (!event_id) {
    throw error(400, 'Event ID is required.');
  }

  const admin = createSupabaseAdminClient();

  const { data: joinResult, error: joinError } = await admin.rpc(
    'register_event_participant',
    { p_event_id: event_id, p_user_id: locals.user.id }
  );

  if (joinError) {
    console.error('[join] Supabase registration error:', joinError);
    if (joinError.code === 'PGRST202') {
      throw error(503, 'Event registration is temporarily unavailable. Please try again later.');
    }
    throw error(500, joinError.message);
  }

  if (joinResult?.success !== true) {
    if (joinResult?.reason === 'capacity_reached') {
      throw error(409, 'Registration is closed because the maximum attendee limit has been reached.');
    }
    if (joinResult?.reason === 'event_not_found') throw error(404, 'Event not found.');
    if (joinResult?.reason === 'registration_closed') throw error(403, 'Registration is closed.');
    throw error(400, 'Could not register for this event.');
  }

  return json({ success: true, status: joinResult.status, attendees_count: joinResult.attendees_count });
}
