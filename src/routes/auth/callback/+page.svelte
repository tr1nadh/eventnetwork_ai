<script>
  import { onMount } from 'svelte';

  export let data;

  onMount(() => {
    // A hard redirect guarantees the browser makes a completely fresh request
    // to the target URL. This prevents SvelteKit's client-side router cache
    // from loading stale data where `locals.user` might still be null.
    // It also ensures the browser attaches the newly minted Set-Cookie headers.
    if (typeof window !== 'undefined') {
      window.location.href = data.next;
    }
  });
</script>

<svelte:head>
  <!-- Fallback meta refresh in case JS is disabled or slow -->
  <meta http-equiv="refresh" content="0;url={data.next}">
  <title>Redirecting... | EventNetwork AI</title>
</svelte:head>

<div class="flex items-center justify-center min-h-screen">
  <div class="flex flex-col items-center">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
    <p class="text-gray-500">Completing sign in...</p>
  </div>
</div>
