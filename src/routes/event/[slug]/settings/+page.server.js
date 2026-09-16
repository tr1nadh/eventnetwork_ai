import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { error, redirect } from '@sveltejs/kit';

export const load = async ({ params, locals }) => {
  if (!locals.user) {
    throw redirect(303, `/event/${params.slug}`);
  }

  const admin = createSupabaseAdminClient();
  const { data, error: loadError } = await admin
    .from('events')
    .select('id, name, description, slug, created_by, start_time, end_time, location, google_map_url, event_format, is_approval_required, is_venue_enabled')
    .eq('slug', params.slug)
    .maybeSingle();

  if (loadError) throw error(500, loadError.message);
  if (!data) throw error(404, 'Event not found.');
  if (data.created_by !== locals.user.id) throw redirect(303, `/event/${params.slug}`);

  return {
    event: data,
    user: locals.user
  };
};
