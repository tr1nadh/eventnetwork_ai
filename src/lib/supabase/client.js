import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createBrowserClient } from '@supabase/ssr';
import { sanitizeNext } from '$lib/safe-next';

const returnPathKey = 'evenai:oauth-return-path';

export function createSupabaseBrowserClient() {
  return createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function startGoogleSignIn(next) {
  // Supabase allowlists the exact callback URL. Keep deep links in this tab.
  try {
    sessionStorage.setItem(returnPathKey, sanitizeNext(next));
  } catch {
    // Sign-in can still proceed to /events if browser storage is unavailable.
  }
  return createSupabaseBrowserClient().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: new URL('/auth/callback', window.location.origin).href }
  });
}

export function takeOAuthReturnPath(legacyNext) {
  let saved;
  try {
    saved = sessionStorage.getItem(returnPathKey);
    sessionStorage.removeItem(returnPathKey);
  } catch {
    // Use the callback's default destination.
  }
  return sanitizeNext(legacyNext ?? saved);
}
