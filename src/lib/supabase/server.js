import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createServerClient } from '@supabase/ssr';

export function createSupabaseServerClient(cookies) {
  return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const cookieOptions = { ...options, path: '/' };
          if (cookieOptions.domain === '' || !cookieOptions.domain) {
            delete cookieOptions.domain;
          }
          delete cookieOptions.secure; // Let SvelteKit handle it
          cookies.set(name, value, cookieOptions);
        });
      }
    }
  });
}
