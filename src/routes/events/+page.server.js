import { listEvents } from '$lib/server/event-list';
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals, url }) => {
  if (!locals.user) {
    throw redirect(303, '/');
  }

  const filter = url.searchParams.get('filter') || 'all';
  const q = url.searchParams.get('q') || '';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = 12;

  const params = new URLSearchParams({ filter, q, page: String(page), limit: String(limit) });
  const { events, pagination } = await listEvents(locals.user, params);

  return {
    user: locals.user,
    events: events ?? [],
    filter,
    q,
    pagination: pagination ?? { page: 1, limit, total: events?.length ?? 0, totalPages: 1, hasMore: false }
  };
};
