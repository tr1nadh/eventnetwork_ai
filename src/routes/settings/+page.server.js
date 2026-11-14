import { redirect } from '@sveltejs/kit';

export function load({ locals, url }) {
  if (!locals.user) throw redirect(303, '/?next=' + encodeURIComponent(url.pathname + url.search));
  const metadata = locals.user.user_metadata ?? {};
  return { user: locals.user, name: metadata.full_name ?? metadata.name ?? metadata.display_name ?? locals.user.email?.split('@')[0] ?? '' };
}
