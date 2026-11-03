<script>
  import { onMount } from 'svelte';
  import { CheckCircle2, LoaderCircle, LogIn, Users } from '@lucide/svelte';
  import PageShell from '$lib/components/page-shell.svelte';
  import Sidebar from '$lib/components/sidebar.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { goto } from '$app/navigation';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';

  export let data;
  let state = data.user && data.token ? 'connecting' : (data.token ? 'sign-in' : 'error');
  let message = '';
  let signingIn = false;

  onMount(async () => {
    if (!data.user || !data.token) {
      if (!data.token) message = 'This Network Card QR code is invalid.';
      return;
    }
    try {
      const res = await fetch('/api/network-cards/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: data.token })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not connect Network Cards.');
      state = 'connected';
      message = body.already_connected
        ? `You are already connected with ${body.name}.`
        : `You and ${body.name} are now connected and marked as met.`;
    } catch (error) {
      state = 'error';
      message = error.message || 'Could not connect Network Cards.';
    }
  });

  async function signIn() {
    signingIn = true;
    const next = `/network-card/scan?token=${encodeURIComponent(data.token)}`;
    const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` }
    });
    if (error) {
      signingIn = false;
      message = error.message;
    }
  }
</script>

<svelte:head><title>Network Card Scan | Evenai</title></svelte:head>

<PageShell user={data.user}>
  {#if data.user}<Sidebar user={data.user} />{/if}
  <main class="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
    <section class="w-full max-w-md rounded-3xl border border-white/10 bg-[#12131a] p-8 text-center shadow-2xl">
      {#if state === 'connecting'}
        <LoaderCircle size={30} class="mx-auto animate-spin text-cyan-300" />
        <h1 class="mt-5 text-xl font-bold text-white">Connecting Network Cards…</h1>
      {:else if state === 'sign-in'}
        <LogIn size={34} class="mx-auto text-cyan-300" />
        <h1 class="mt-5 text-xl font-bold text-white">Sign in to connect</h1>
        <p class="mt-3 text-sm leading-6 text-ink-300">Sign in to connect with this Network Card and mark the in-person meeting.</p>
        <Button class="mt-6 gap-2" disabled={signingIn} onclick={signIn}>{#if signingIn}<LoaderCircle size={16} class="animate-spin" /> Signing in…{:else}<LogIn size={16} /> Continue with Google{/if}</Button>
      {:else if state === 'connected'}
        <CheckCircle2 size={34} class="mx-auto text-emerald-300" />
        <h1 class="mt-5 text-xl font-bold text-white">Connected</h1>
        <p class="mt-3 text-sm leading-6 text-ink-300">{message}</p>
        <Button class="mt-6 gap-2" onclick={() => goto('/connections')}><Users size={16} /> View connections</Button>
      {:else}
        <h1 class="text-xl font-bold text-white">Couldn’t connect</h1>
        <p class="mt-3 text-sm leading-6 text-ink-300">{message}</p>
        <Button variant="outline" class="mt-6 border-white/10" onclick={() => goto('/network-card')}>Back to Network Card</Button>
      {/if}
    </section>
  </main>
</PageShell>
