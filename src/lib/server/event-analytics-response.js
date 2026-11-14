import { json, isHttpError } from '@sveltejs/kit';
import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { loadOrganizerAnalytics } from '$lib/server/event-analytics';

export async function getAnalyticsResponse({ params, locals }) {
  if (!locals.user) return json({ message: 'Please sign in to view analytics.' }, { status: 401 });
  try {
    const admin = createSupabaseAdminClient();
    const result = await admin.from('events').select('id').eq('id', params.id)
      .eq('created_by', locals.user.id).maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return json({ message: 'Event not found or analytics access denied.' }, { status: 404 });
    return json(await loadOrganizerAnalytics(admin, params.id));
  } catch (failure) {
    console.error('Failed to load organizer analytics:', failure);
    return json({ message: isHttpError(failure) ? failure.body.message : 'Could not load analytics. Please retry.' },
      { status: isHttpError(failure) ? failure.status : 500 });
  }
}
