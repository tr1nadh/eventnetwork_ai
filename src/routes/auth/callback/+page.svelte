<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  export let data;

  onMount(() => {
    // By the time onMount fires, the server has already set the session cookies
    // in the response for this page. The browser has committed them.
    // goto() uses SvelteKit's client-side router, which properly reads the
    // fresh cookies and loads the target page with a valid session.
    goto('/events');
  });
</script>

<svelte:head>
  <title>Redirecting... | EventNetwork AI</title>
</svelte:head>

<p style="display:none">Redirecting...</p>
