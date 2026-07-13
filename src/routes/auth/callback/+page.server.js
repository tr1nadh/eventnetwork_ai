import { syncUserRecord } from '$lib/supabase/sync-user';
import { redirect } from '@sveltejs/kit';

function sanitizeNext(value) {
  if (!value || !value.startsWith('/')) {
    return '/events';
  }
  return value;
}

export async function load(event) {
  const { url, locals: { supabase } } = event;
  const code = url.searchParams.get('code');
  const next = sanitizeNext(url.searchParams.get('next'));

  if (code) {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError && data.user) {
      try {
        await syncUserRecord(data.user);
      } catch (syncError) {
        console.error('Failed to sync auth user into public.users', syncError);
      }
    }
  }

  // Session cookies are set by exchangeCodeForSession above (via cookies.set).
  // SvelteKit includes those Set-Cookie headers in this redirect response.
  // The browser stores them before following the redirect to `next`.
  throw redirect(303, next);
}
