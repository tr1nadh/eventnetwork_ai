import { error, redirect } from '@sveltejs/kit';

export const load = async ({ locals, url, fetch }) => {
  if (!locals.user) {
    throw redirect(303, '/');
  }

  const q = url.searchParams.get('q') || '';

  const res = await fetch(`/api/events?filter=discover&q=${encodeURIComponent(q)}`);

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw error(res.status, data?.error || 'Failed to fetch discover events');
  }

  const { events } = await res.json();

  return {
    user: locals.user,
    events: events ?? [],
    q
  };
};
