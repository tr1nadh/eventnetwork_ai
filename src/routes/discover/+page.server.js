import { error, redirect } from '@sveltejs/kit';

export const load = async ({ locals, url, fetch }) => {
  if (!locals.user) {
    throw redirect(303, '/');
  }

  const q = url.searchParams.get('q') || '';
  const format = url.searchParams.get('format') || '';
  const date = url.searchParams.get('date') || '';
  const dateStart = url.searchParams.get('date_start') || '';
  const dateEnd = url.searchParams.get('date_end') || '';
  const status = url.searchParams.get('status') || 'all';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '9', 10));

  const params = new URLSearchParams({ filter: 'discover' });
  if (q) params.set('q', q);
  if (format) params.set('format', format);
  if (date) params.set('date', date);
  if (dateStart) params.set('date_start', dateStart);
  if (dateEnd) params.set('date_end', dateEnd);
  if (status) params.set('status', status);
  params.set('page', String(page));
  params.set('limit', String(limit));

  const res = await fetch(`/api/events?${params.toString()}`);

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw error(res.status, data?.error || 'Failed to fetch discover events');
  }

  const result = await res.json();

  return {
    user: locals.user,
    events: result.events ?? [],
    pagination: result.pagination ?? { page: 1, limit: 9, total: result.events?.length ?? 0, hasMore: false },
    counts: result.counts ?? { all: 0, live: 0, upcoming: 0, completed: 0 },
    formatCounts: result.formatCounts ?? { online: 0, offline: 0 },
    eventDates: result.eventDates ?? [],
    status,
    page,
    limit,
    q,
    format,
    date,
    dateStart,
    dateEnd
  };
};
