import { syncUserRecord } from '$lib/supabase/sync-user';

function sanitizeNext(value) {
  if (!value || !value.startsWith('/')) {
    return '/events';
  }
  return value;
}

export async function load(event) {
  const { url, locals: { supabase } } = event;
  const code   = url.searchParams.get('code');
  const next   = sanitizeNext(url.searchParams.get('next'));

  let exchangeOk = false;

  if (code) {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      // Log the full error server-side so it appears in Vercel function logs
      console.error('[auth/callback] exchangeCodeForSession failed:', exchangeError.message, exchangeError);
    } else {
      exchangeOk = true;
      console.log('[auth/callback] Session exchange OK. user:', data.user?.id, '→ next:', next);

      if (data.user) {
        try {
          await syncUserRecord(data.user);
        } catch (syncError) {
          // Non-fatal — log it but don't block the redirect
          console.error('[auth/callback] syncUserRecord failed:', syncError);
        }
      }
    }
  } else {
    console.warn('[auth/callback] No ?code param — direct navigation to /auth/callback');
  }

  // Return a 200 OK so that:
  //   a) Vercel/CDN does NOT strip the Set-Cookie headers (which can happen on 30x responses)
  //   b) The +page.svelte loading screen can display before navigating client-side
  return { next, exchangeOk };
}
