import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { error, redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(303, '/');
  }

  const admin = createSupabaseAdminClient();
  const { data: events, error: loadError } = await admin
    .from('events')
    .select('id, name, description, slug, created_by, created_at, updated_at')
    .eq('created_by', locals.user.id)
    .order('created_at', { ascending: false });

  if (loadError) {
    throw error(500, loadError.message);
  }

  return {
    user: locals.user,
    events: events ?? []
  };
};
