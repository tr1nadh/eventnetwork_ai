import { syncUserRecord } from '$lib/supabase/sync-user';

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

  // Return `next` so the page component can use SvelteKit's goto().
  // By the time onMount fires, the cookies from this response are committed
  // to the browser, so the session is available for the next navigation.
  return { next };
}
