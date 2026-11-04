import { redirect } from '@sveltejs/kit';

export function load({ locals }) {
  if (!locals.user) throw redirect(303, '/auth/login');
  const metadata = locals.user.user_metadata ?? {};
  return { user: locals.user, name: metadata.full_name ?? metadata.name ?? metadata.display_name ?? locals.user.email?.split('@')[0] ?? '' };
}
