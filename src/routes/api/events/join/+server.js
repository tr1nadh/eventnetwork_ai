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

  const { data: event, error: eventError } = await admin
    .from('events')
    .select('id, start_time, allow_join_after_start')
    .eq('id', event_id)
    .maybeSingle();

  if (eventError) {
    throw error(500, eventError.message);
  }
  if (!event) {
    throw error(404, 'Event not found.');
  }

  const hasStarted = event.start_time && new Date(event.start_time) <= new Date();
  if (hasStarted && event.allow_join_after_start === false) {
    throw error(403, 'Registration is closed because this event has already started.');
  }

  const { data: joinResult, error: joinError } = await admin.rpc(
    'join_event_with_attendee_limit',
    { p_event_id: event_id, p_user_id: locals.user.id }
  );

  if (joinError) {
    console.error('[join] Supabase registration error:', joinError);
    throw error(500, joinError.message);
  }

  if (joinResult?.success !== true) {
    if (joinResult?.reason === 'capacity_reached') {
      throw error(409, 'Registration is closed because the maximum attendee limit has been reached.');
    }
    throw error(400, 'Could not register for this event.');
  }

  return json({ success: true, status: 'joined', attendees_count: joinResult.attendees_count });
}
