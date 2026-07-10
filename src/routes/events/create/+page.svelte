<script>
  import { ArrowLeft, FolderPlus, LoaderCircle, Plus } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import Navbar from '$lib/components/navbar.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent
  } from '$lib/components/ui/card/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { toast } from '$lib/components/ui/sonner/index.js';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';

  export let data;

  const supabase = createSupabaseBrowserClient();

  let signingOut = false;
  let creatingEvent = false;
  let form = {
    name: '',
    id: '',
    description: ''
  };

  async function signOut() {
    signingOut = true;
    await supabase.auth.signOut();
    signingOut = false;
    await goto('/');
  }

  async function createEvent() {
    creatingEvent = true;

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          id: form.id,
          description: form.description
        })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = payload.error ?? 'Could not create event.';
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
</svelte:head>

<main class="min-h-screen bg-[#050816] text-white">
  <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.16),_transparent_36%),radial-gradient(circle_at_85%_20%,_rgba(45,212,191,0.16),_transparent_32%),linear-gradient(180deg,_rgba(2,6,23,0.96),_rgba(2,6,23,1))]"></div>
  <section class="relative mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
    <Navbar user={data.user} {signingOut} onSignOut={signOut} />

    <div class="mb-6 flex items-center justify-between">
      <div>
        <p class="text-sm font-semibold tracking-[0.18em] text-amber-200 uppercase">Create event</p>
        <h1 class="mt-1 text-3xl font-black">New networking event</h1>
      </div>
      <Button variant="secondary" onclick={() => goto('/events')}>
        <ArrowLeft size={16} />
        Back to events
      </Button>
    </div>

    <Card className="border-amber-300/20 bg-white/5 p-6">
      <CardHeader>
        <Badge variant="accent" className="w-fit gap-2">
          <FolderPlus size={18} />
          Event details
        </Badge>
        <CardTitle className="text-2xl">New networking event</CardTitle>
        <CardDescription>Capture the name, public ID, and a concise description for attendees.</CardDescription>
      </CardHeader>

      <CardContent className="mt-5 grid gap-4 md:grid-cols-2">
        <div class="md:col-span-2">
          <Label for="name">Event name</Label>
          <Input id="name" bind:value={form.name} placeholder="HackNight Delhi 2026" />
        </div>
        <div class="md:col-span-2">
          <Label for="id">Event ID</Label>
          <Input id="id" bind:value={form.id} placeholder="hacknight-delhi-2026" />
        </div>
        <div class="md:col-span-2">
          <Label for="description">Description</Label>
          <Input id="description" bind:value={form.description} placeholder="Short description for attendees" />
        </div>
      </CardContent>

      <div class="mt-5 flex flex-wrap items-center gap-3">
        <Button onclick={createEvent} disabled={creatingEvent || !form.name}>
          {#if creatingEvent}
            <LoaderCircle size={16} class="animate-spin" />
            Creating
          {:else}
            <Plus size={16} />
            Create event
          {/if}
        </Button>
        <p class="text-sm text-slate-400">ID is optional. If blank, we generate it from the event name.</p>
      </div>
    </Card>
  </section>
</main>
