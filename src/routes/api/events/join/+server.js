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

  const { error: insertError } = await admin
    .from('event_participants')
    .upsert(
      {
        event_id,
        user_id: locals.user.id,
        status: 'joined',
        joined_at: new Date().toISOString()
      },
      {
        onConflict: 'event_id,user_id',
        ignoreDuplicates: false
      }
    );

  if (insertError) {
    console.error('[join] Supabase insert error:', insertError);
    throw error(500, insertError.message);
  }

  return json({ success: true, status: 'joined' });
}
