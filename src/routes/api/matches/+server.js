import { loadSavedNetworkMatches } from '$lib/server/network-matches';
import { json, error } from '@sveltejs/kit';

export async function GET({ url, locals }) {
  const eventId = url.searchParams.get('event_id');
  if (!eventId) {
    throw error(400, 'Missing event_id');
  }

  const supabase = locals.supabase;
  const user = locals.user;
  if (!user) {
    throw error(401, 'Unauthenticated');
  }

  const matches = await loadSavedNetworkMatches(supabase, eventId, user);
  return json({ matches });
}
