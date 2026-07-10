import { createSupabaseServerClient } from '$lib/supabase/server';
import { syncUserRecord } from '$lib/supabase/sync-user';
import { error, redirect } from '@sveltejs/kit';

function sanitizeNext(value) {
  if (!value || !value.startsWith('/')) {
    return '/';
  }

  return value;
}

export async function GET({ url, cookies }) {
  const code = url.searchParams.get('code');
  const next = sanitizeNext(url.searchParams.get('next'));

  if (!code) {
    throw error(400, 'Missing OAuth code.');
  }

  const supabase = createSupabaseServerClient(cookies);
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

  throw redirect(303, next);
}
