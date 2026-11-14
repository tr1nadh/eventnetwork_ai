import { loadNetworkCards } from '$lib/server/load-network-cards';
import { redirect } from '@sveltejs/kit';

export async function load({ locals, url }) {
  if (!locals.user) throw redirect(303, '/?next=' + encodeURIComponent(url.pathname + url.search));
  try { return { user: locals.user, cards: await loadNetworkCards(locals.user.id) }; }
  catch { return { user: locals.user, cardsError: true }; }
}
