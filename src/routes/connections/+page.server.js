import { loadConnections } from '$lib/server/load-connections';
import { redirect } from '@sveltejs/kit';

export async function load({ locals, url }) {
  if (!locals.user) {
    throw redirect(303, '/');
  }

  return {
    user: locals.user,
    ...await loadConnections({ locals, url: new URL("/api/connections?filter=all&page=1&limit=50", url) })
  };
}
