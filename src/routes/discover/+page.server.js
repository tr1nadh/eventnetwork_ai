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

  const params = new URLSearchParams({ filter: 'discover' });
  if (q) params.set('q', q);
  if (format) params.set('format', format);
  if (date) params.set('date', date);
  if (dateStart) params.set('date_start', dateStart);
  if (dateEnd) params.set('date_end', dateEnd);

  const res = await fetch(`/api/events?${params.toString()}`);

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw error(res.status, data?.error || 'Failed to fetch discover events');
  }

  const { events } = await res.json();

  return {
    user: locals.user,
    events: events ?? [],
    q,
    format,
    date,
    dateStart,
    dateEnd
  };
};
