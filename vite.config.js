import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  ssr: {
    noExternal: ['svelte-sonner']
  },
  test: {
    alias: {
      '$env/static/private': new URL('./tests/env-mock.js', import.meta.url).pathname
    }
  }
});
