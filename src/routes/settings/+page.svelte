<script>
  import { goto, invalidateAll } from '$app/navigation';
  import { LoaderCircle, Save, Settings } from '@lucide/svelte';
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
<PageShell user={data.user}>
  <Sidebar user={data.user} {signingOut} onSignOut={signOut} />
  <main class="mx-auto min-h-screen w-full max-w-2xl px-5 py-12 pb-28 sm:px-8">
    <div class="rounded-3xl border border-white/10 bg-[#12131a] p-6 shadow-2xl sm:p-8">
      <div class="flex items-center gap-3"><span class="grid size-11 place-items-center rounded-2xl bg-cyan-400/10 text-cyan-300"><Settings size={21} /></span><div><h1 class="text-xl font-bold text-white">Settings</h1><p class="mt-1 text-sm text-ink-400">Your name is used on your Network Card, event profiles, and connections.</p></div></div>
      <label class="mt-8 block text-sm font-medium text-ink-200" for="name">Your name<Input id="name" bind:value={name} class="mt-2 border-white/10 bg-white/5 text-white" maxlength="80" /></label>
      <p class="mt-2 text-xs leading-5 text-ink-500">Changing this name updates your existing Network Card and networking profiles.</p>
      <Button class="mt-7 gap-2" disabled={saving || !name.trim()} onclick={save}>{#if saving}<LoaderCircle size={16} class="animate-spin" /> Saving…{:else}<Save size={16} /> Save name{/if}</Button>
    </div>
  </main>
</PageShell>
