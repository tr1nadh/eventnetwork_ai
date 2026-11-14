import { sanitizeNext } from '$lib/safe-next';
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals, url }) => {
  if (locals.user) {
    throw redirect(303, sanitizeNext(url.searchParams.get('next')));
  }

  return {
    user: null,
    next: sanitizeNext(url.searchParams.get("next"))
  };
};
