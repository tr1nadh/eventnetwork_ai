import { createSupabaseAdminClient } from '$lib/supabase/admin';
import { error, redirect } from '@sveltejs/kit';

export const load = async ({ locals, url, fetch }) => {
  if (!locals.user) {
    throw redirect(303, '/');
  }

  const filter = url.searchParams.get('filter') || 'all';
  const q = url.searchParams.get('q') || '';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = 12;

  const res = await fetch(`/api/events?filter=${filter}&q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`);

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw error(res.status, data?.error || 'Failed to fetch events');
  }

  const { events, pagination } = await res.json();

  return {
    user: locals.user,
    events: events ?? [],
    filter,
    q,
    pagination: pagination ?? { page: 1, limit, total: events?.length ?? 0, totalPages: 1, hasMore: false }
  };
};
