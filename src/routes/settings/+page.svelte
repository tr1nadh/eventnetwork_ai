<script>
  import { goto, invalidateAll } from '$app/navigation';
  import { LoaderCircle, Save } from '@lucide/svelte';
  import PageShell from '$lib/components/page-shell.svelte';
  import Sidebar from '$lib/components/sidebar.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { toast } from '$lib/components/ui/sonner/index.js';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';

  export let data;
  let name = data.name;
  let saving = false;
  let signingOut = false;

  async function save() {
    saving = true;
    try {
      const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not update settings.');
      // Refresh the browser session metadata so the sidebar and profile views
      // immediately use the same canonical name.
      await createSupabaseBrowserClient().auth.updateUser({ data: { full_name: body.name, name: body.name, display_name: body.name } });
      toast.success('Name updated everywhere.');
      await invalidateAll();
    } catch (error) { toast.error(error.message || 'Could not update settings.'); }
    finally { saving = false; }
  }

  async function signOut() { signingOut = true; await createSupabaseBrowserClient().auth.signOut(); await goto('/'); }
</script>

<svelte:head><title>Settings | Evenai</title></svelte:head>
<PageShell>
  <Sidebar user={data.user} {signingOut} onSignOut={signOut} />
  <main class="workspace-page workspace-form">
    <header class="mb-6">
      <h1 class="workspace-title">Settings</h1>
    </header>
    <form class="workspace-panel max-w-2xl p-5 sm:p-8" onsubmit={(event) => { event.preventDefault(); if (name.trim() && !saving) save(); }}>
      <h2 class="text-lg font-semibold">Profile</h2>
      <p class="mt-1 text-sm text-ink-400">Your name appears on your Network Card, event profiles, and connections.</p>
      <label class="mt-8 block text-sm font-medium text-ink-200" for="name">Your name<Input id="name" bind:value={name} class="mt-2 border-white/10 bg-white/5 text-white" maxlength="80" /></label>
      <p class="mt-2 text-xs leading-5 text-ink-500">Changing this name updates your existing Network Card and networking profiles.</p>
      <Button class="mt-7 gap-2" disabled={saving || !name.trim()} type="submit">{#if saving}<LoaderCircle size={16} class="animate-spin" /> Saving…{:else}<Save size={16} /> Save name{/if}</Button>
    </form>
  </main>
</PageShell>
