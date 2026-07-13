// This route is primarily handled by +server.js (GET handler).
// This page load only runs if the user lands on /auth/callback without a code
// (e.g. direct navigation), in which case we redirect them to /events.
import { redirect } from '@sveltejs/kit';

export async function load() {
  throw redirect(303, '/events');
}
