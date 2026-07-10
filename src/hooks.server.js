import { createSupabaseServerClient } from '$lib/supabase/server';
import { syncUserRecord } from '$lib/supabase/sync-user';

export const handle = async ({ event, resolve }) => {
  event.locals.supabase = createSupabaseServerClient(event.cookies);

  const { data } = await event.locals.supabase.auth.getUser();
  event.locals.user = data.user ?? null;

  if (event.locals.user) {
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
