import { dev } from '$app/environment';
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
          // On localhost (HTTP), browsers reject secure cookies.
          // In production (HTTPS), secure:true must be kept so that
          // SameSite=None cookies aren't silently dropped by the browser.
          if (dev) {
            cookieOptions.secure = false;
          }
          cookies.set(name, value, cookieOptions);
        });
      }
    }
  });
}
