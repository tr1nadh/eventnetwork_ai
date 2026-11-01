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

  // Check if the event requires approval
  const { data: eventRow } = await admin
    .from('events')
    .select('is_approval_required')
    .eq('id', event_id)
    .maybeSingle();

  const needsApproval = Boolean(eventRow?.is_approval_required);
  const participantStatus = needsApproval ? 'waitlisted' : 'joined';

  const { error: insertError } = await admin
    .from('event_participants')
    .upsert(
      {
        event_id,
        user_id: locals.user.id,
        status: participantStatus,
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

  return json({ success: true, status: participantStatus });
}
