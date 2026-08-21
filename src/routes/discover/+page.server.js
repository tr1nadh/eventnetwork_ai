import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { error, redirect } from '@sveltejs/kit';

export const load = async ({ locals, url, fetch }) => {
  if (!locals.user) {
    throw redirect(303, '/');
  }

  const filter = url.searchParams.get('filter') || 'all';
  const q = url.searchParams.get('q') || '';

  const res = await fetch(`/api/events?filter=${filter}&q=${encodeURIComponent(q)}`);
  
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw error(res.status, data?.error || 'Failed to fetch events');
  }

  const { events } = await res.json();

  return {
    user: locals.user,
    events: events ?? [],
    filter,
    q
  };
};
