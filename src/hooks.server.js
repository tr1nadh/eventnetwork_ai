import { createSupabaseServerClient } from '$lib/supabase/server';

export const handle = async ({ event, resolve }) => {
  event.locals.supabase = createSupabaseServerClient(event.cookies);

  // The image reader validates the storage path and serves the same redirect
  // to anonymous and signed-in visitors. Uploads and deletes still need auth.
  if (event.request.method === 'GET' && event.route.id === '/api/events/images') {
    event.locals.user = null;
    return resolve(event);
  }

  // Use getUser() to validate the JWT with the Supabase API server-side.
  // This is the recommended pattern from @supabase/ssr: it avoids the
  // "Using the user object as returned from getSession()" security warning
  // and ensures the token is authentic (not just cookie-present).
  //
  // For performance, we first check getSession() (fast, no API call) to see
  // if a session cookie even exists before making the API call.
  const { data: { session } } = await event.locals.supabase.auth.getSession();

  if (session) {
    const { data: { user }, error } = await event.locals.supabase.auth.getUser();
    event.locals.user = error ? null : (user ?? null);
  } else {
    event.locals.user = null;
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });
};
