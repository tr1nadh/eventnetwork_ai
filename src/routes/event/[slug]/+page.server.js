import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { demoAttendees, demoEvent } from '$lib/demo';
import { error } from '@sveltejs/kit';

export const load = async ({ params, locals }) => {
  if (params.slug === demoEvent.slug) {
    return {
      event: {
        ...demoEvent,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      suggestedMatches: demoAttendees.slice(0, 3),
      user: locals.user
    };
  }

  const admin = createSupabaseAdminClient();
  const { data, error: loadError } = await admin
    .from('events')
    .select('id, name, description, slug, created_by, created_at, updated_at')
    .eq('slug', params.slug)
    .maybeSingle();

  if (loadError) {
    throw error(500, loadError.message);
  }

  if (!data) {
    throw error(404, 'Event not found.');
  }

  return {
    event: data,
    suggestedMatches: demoAttendees.slice(0, 3),
    user: locals.user
  };
};
