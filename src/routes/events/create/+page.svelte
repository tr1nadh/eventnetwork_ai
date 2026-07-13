<script>
  import { ArrowLeft, FolderPlus, LoaderCircle, Plus, Link as LinkIcon } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import Navbar from '$lib/components/navbar.svelte';
  import PageShell from '$lib/components/page-shell.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { toast } from '$lib/components/ui/sonner/index.js';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { clearAllEventStores } from '$lib/stores/eventStore';
  import { clearAllChatStores } from '$lib/stores/chatStore';

  export let data;

  const supabase = createSupabaseBrowserClient();

  let signingOut = false;
  let creatingEvent = false;
  let form = { name: '', id: '', description: '' };

  // Auto-generate event ID from name
  $: autoId = form.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 48);

  $: resolvedId = form.id.trim() || autoId;

  async function signOut() {
    signingOut = true;
    await supabase.auth.signOut();
    signingOut = false;
    clearAllEventStores();
    clearAllChatStores();
    await goto('/');
  }

  async function createEvent() {
    if (!form.name.trim()) return;
    creatingEvent = true;

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          id: resolvedId,
          description: form.description
        })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = payload?.error ?? 'Could not create event.';
        toast.error(response.status === 409 ? 'ID already exists' : 'Event creation failed', {
          description: message
        });
        return;
      }

      toast.success('Event created', {
        description: 'Your new event is now available in your dashboard.'
      });
      await goto('/events');
    } catch (err) {
      toast.error('Event creation failed', {
        description: err instanceof Error ? err.message : 'Could not create event.'
      });
    } finally {
      creatingEvent = false;
    }
  }
</script>

<svelte:head>
  <title>Create Event | EventNetwork AI</title>
  <meta name="description" content="Create a new networking event on EventNetwork AI." />
</svelte:head>

<PageShell>
  <Navbar user={data.user} {signingOut} onSignOut={signOut} />

  <main class="mx-auto max-w-2xl px-4 pb-20 sm:px-6">

    <!-- Back + header -->
    <div class="mb-8 flex items-center justify-between animate-fade-in">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.2em] text-amber-300 mb-1">New event</p>
        <h1 class="text-3xl font-black text-white">Create a networking event</h1>
      </div>
      <Button
        variant="secondary"
        onclick={() => goto('/events')}
        class="gap-2 shrink-0"
      >
        <ArrowLeft size={15} />
        Back
      </Button>
    </div>

    <!-- Form card -->
    <div class="glass rounded-2xl overflow-hidden border border-amber-400/15 animate-slide-up">
      <!-- Card accent top border -->
      <div class="h-0.5 bg-gradient-to-r from-amber-400 via-amber-300 to-transparent"></div>

      <div class="p-7 space-y-6">
        <div class="flex items-center gap-2.5">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/12 border border-amber-400/20">
            <FolderPlus size={17} class="text-amber-300" />
          </div>
          <div>
            <p class="text-sm font-semibold text-white">Event details</p>
            <p class="text-xs text-ink-500">Capture the name, ID, and description attendees will see.</p>
          </div>
        </div>

        <div class="h-px bg-white/6"></div>

        <!-- Event name -->
        <div class="space-y-1.5">
          <Label for="name" class="text-xs font-semibold uppercase tracking-widest text-ink-400">Event name</Label>
          <Input
            id="name"
            bind:value={form.name}
            placeholder="HackNight Delhi 2026"
            class="bg-white/4 border-white/10 text-white placeholder:text-ink-600 focus:border-amber-400/50 focus:ring-amber-400/20"
          />
        </div>

        <!-- Event ID -->
        <div class="space-y-1.5">
          <Label for="id" class="text-xs font-semibold uppercase tracking-widest text-ink-400">
            Event ID <span class="text-ink-600 normal-case tracking-normal font-normal">(optional — auto-generated)</span>
          </Label>
          <div class="relative">
            <Input
              id="id"
              bind:value={form.id}
              placeholder={autoId || 'hacknight-delhi-2026'}
              class="bg-white/4 border-white/10 text-white placeholder:text-ink-600 focus:border-amber-400/50 focus:ring-amber-400/20 font-mono"
            />
          </div>
          <!-- Live ID preview -->
          {#if resolvedId}
            <div class="flex items-center gap-1.5 text-xs text-ink-500">
              <LinkIcon size={11} />
              <span>Event URL: <span class="text-ink-300 font-mono">/event/{resolvedId}</span></span>
            </div>
          {/if}
        </div>

        <!-- Description -->
        <div class="space-y-1.5">
          <Label for="description" class="text-xs font-semibold uppercase tracking-widest text-ink-400">Description</Label>
          <textarea
            id="description"
            bind:value={form.description}
            placeholder="A high-energy offline event where builders, founders, designers, and operators meet the right people fast."
            rows="3"
            class="w-full rounded-lg border border-white/10 bg-white/4 px-3 py-2.5 text-sm text-white placeholder:text-ink-600 resize-none focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition"
          ></textarea>
        </div>

        <!-- Submit -->
        <div class="flex items-center gap-4 pt-2">
          <Button
            id="create-event-submit"
            onclick={createEvent}
            disabled={creatingEvent || !form.name.trim()}
            class="gap-2"
          >
            {#if creatingEvent}
              <LoaderCircle size={15} class="animate-spin" />
              Creating event…
            {:else}
              <Plus size={15} />
              Create event
            {/if}
          </Button>
          <p class="text-xs text-ink-500">ID is auto-generated from the name if left blank.</p>
        </div>
      </div>
    </div>
  </main>
</PageShell>
