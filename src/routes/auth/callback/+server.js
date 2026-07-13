import { createSupabaseServerClient } from '$lib/supabase/server';
import { syncUserRecord } from '$lib/supabase/sync-user';
import { error, redirect } from '@sveltejs/kit';

function sanitizeNext(value) {
  if (!value || !value.startsWith('/')) {
    return '/';
  }

  return value;
}

export async function GET(event) {
  const { url, locals: { supabase } } = event;
  const code = url.searchParams.get('code');
  const next = sanitizeNext(url.searchParams.get('next'));

  if (!code) {
    throw error(400, 'Missing OAuth code.');
  }

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    throw error(401, exchangeError.message);
  }

  if (data.user) {
    try {
      await syncUserRecord(data.user);
    } catch (syncError) {
      console.error('Failed to sync auth user into public.users', syncError);
    }
  }

  // Return an HTML page that redirects client-side AFTER the browser has
  // fully committed the Set-Cookie headers from this response.
  // Using window.onload ensures the browser has processed the response
  // (including cookies) before the navigation fires, preventing a race
  // condition where the Supabase browser client reads before cookies are stored.
  const safeNext = next.replace(/"/g, '');
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Redirecting...</title>
  </head>
  <body>
    <script>
      window.onload = function() {
        window.location.replace("${safeNext}");
      };
    </script>
    <noscript>
      <meta http-equiv="refresh" content="0;url=${safeNext}">
    </noscript>
  </body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' }
  });
}
