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

  // We return an HTML page with a meta refresh and JS redirect instead of a 303 Redirect.
  // This bypasses Safari ITP and Chrome strict cookie blocking on cross-site redirect chains in production.
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Redirecting...</title>
        <meta http-equiv="refresh" content="0;url=${next}">
      </head>
      <body>
        <script>window.location.href = "${next}";</script>
        <p>Redirecting you to the app...</p>
      </body>
    </html>
  `;

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html'
    }
  });
}
