import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      // Force Node.js runtime on all routes.
      // The Edge runtime has a different Response API that can silently
      // drop Set-Cookie headers from SvelteKit's cookies utility,
      // which breaks Supabase session persistence after OAuth.
      runtime: 'nodejs22'
    })
  }
};

export default config;
