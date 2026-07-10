<script>
  import {
    MapPin,
    ArrowRight,
    Sparkles,
    ChartNoAxesCombined,
    Plus,
    Link as LinkIcon,
  } from '@lucide/svelte';
  import Navbar from '$lib/components/navbar.svelte';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Card } from '$lib/components/ui/card/index.js';
  import { goto } from '$app/navigation';

  export let data;

  const supabase = createSupabaseBrowserClient();
  let signingOut = false;

  async function signOut() {
    signingOut = true;
    await supabase.auth.signOut();
    signingOut = false;
    await goto('/');
  }
</script>

<svelte:head>
  <title>Events | EventNetwork AI</title>
</svelte:head>

<main class="min-h-screen bg-[#050816] text-white">
  <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.16),_transparent_36%),radial-gradient(circle_at_85%_20%,_rgba(45,212,191,0.16),_transparent_32%),linear-gradient(180deg,_rgba(2,6,23,0.96),_rgba(2,6,23,1))]"></div>
  <section class="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <Navbar user={data.user} {signingOut} onSignOut={signOut} />

    <div class="mb-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 px-5 py-5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-sm font-semibold tracking-[0.18em] text-amber-200 uppercase">Your events</p>
        <h1 class="mt-1 text-3xl font-black">Welcome, {data.user?.email}</h1>
        <p class="mt-2 text-sm text-slate-300">Create and manage the event links your attendees will use to join.</p>
      </div>

      <Button onclick={() => goto('/events/create')}>
        <Plus size={16} />
        Create event
      </Button>
    </div>

    <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div class="space-y-4">
        {#if data.events.length}
          {#each data.events as event}
            <Card className="p-6">
              <div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div class="space-y-3">
                  <div class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                    <Sparkles size={14} class="text-amber-300" />
                    Private event
                  </div>
                  <div>
                    <h2 class="text-2xl font-bold">{event.name}</h2>
                    <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                      {event.description ?? 'No description added yet.'}
                    </p>
                  </div>
                  <div class="flex flex-wrap gap-4 text-sm text-slate-300">
                    <span class="flex items-center gap-2"><LinkIcon size={16} />ID: {event.slug}</span>
                    <span class="flex items-center gap-2"><ChartNoAxesCombined size={16} />Created event</span>
                  </div>
                  <p class="text-xs text-slate-500">Created at {new Date(event.created_at).toLocaleString()}</p>
                </div>

                <div class="flex shrink-0 flex-col gap-3 sm:items-end">
                  <Button onclick={() => goto(`/event/${event.slug}`)}>
                    Open event room
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            </Card>
          {/each}
        {:else}
          <Card className="p-8 text-center">
            <Sparkles class="mx-auto text-amber-300" size={24} />
            <h2 class="mt-4 text-xl font-bold">No events yet</h2>
            <p class="mt-2 text-sm text-slate-300">
              Create your first event with the + button above.
            </p>
          </Card>
        {/if}
      </div>

      <Card>
        <div class="flex items-center gap-2 text-cyan-200">
          <ChartNoAxesCombined size={18} />
          <p class="text-sm font-semibold uppercase tracking-[0.2em]">Organizer snapshot</p>
        </div>
        <div class="mt-5 space-y-4">
          <div class="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <p class="text-sm text-slate-400">Logged in as</p>
            <p class="mt-1 text-lg font-semibold">{data.user?.email}</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <p class="text-sm text-slate-400">Event creation</p>
            <p class="mt-1 text-lg font-semibold">Now backed by public.events</p>
            <p class="mt-2 text-sm leading-6 text-slate-300">
              Each event row is created with your user ID in `created_by`, so only your events are shown here.
            </p>
          </div>
        </div>
      </Card>
    </div>
  </section>
</main>
