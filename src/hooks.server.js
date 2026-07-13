import { createSupabaseServerClient } from '$lib/supabase/server';
import { syncUserRecord } from '$lib/supabase/sync-user';

export const handle = async ({ event, resolve }) => {
  event.locals.supabase = createSupabaseServerClient(event.cookies);

  const { data } = await event.locals.supabase.auth.getUser();
  event.locals.user = data.user ?? null;

  // Only sync user record on page navigations, not API requests.
  // API calls are frequent and don't need a DB write every time.
  const isApiRoute = event.url.pathname.startsWith('/api/');
  if (event.locals.user && !isApiRoute) {
    try {
      await syncUserRecord(event.locals.user);
    } catch (syncError) {
      console.error('Failed to sync auth user into public.users', syncError);
    }
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });
};
