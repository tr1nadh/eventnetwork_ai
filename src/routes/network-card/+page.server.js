import { loadNetworkCards } from '$lib/server/load-network-cards';
import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
  if (!locals.user) throw redirect(303, '/auth/login');
  try { return { user: locals.user, cards: await loadNetworkCards(locals.user.id) }; }
  catch { return { user: locals.user, cardsError: true }; }
}
