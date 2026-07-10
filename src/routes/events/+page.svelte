<script>
  import {
    ArrowRight,
    Sparkles,
    Plus,
    Link as LinkIcon,
    Copy,
    CheckCheck,
    CalendarClock
  } from '@lucide/svelte';
  import Navbar from '$lib/components/navbar.svelte';
  import PageShell from '$lib/components/page-shell.svelte';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { goto } from '$app/navigation';
  import { toast } from '$lib/components/ui/sonner/index.js';

  export let data;

  const supabase = createSupabaseBrowserClient();
  let signingOut = false;
  let copiedSlug = null;

  async function signOut() {
    signingOut = true;
    await supabase.auth.signOut();
    signingOut = false;
    await goto('/');
  }

  async function copySlug(slug) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/event/${slug}`);
      copiedSlug = slug;
      toast.success('Link copied!');
      setTimeout(() => { copiedSlug = null; }, 2000);
    } catch {
      toast.error('Could not copy link');
    }
  }
</script>

<svelte:head>
  <title>Events | EventNetwork AI</title>
  <meta name="description" content="Manage your networking events on EventNetwork AI." />
</svelte:head>

<PageShell>
  <Navbar user={data.user} {signingOut} onSignOut={signOut} />

  <main class="mx-auto max-w-4xl px-4 pb-20 sm:px-6">

    <!-- Page header -->
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-slide-up">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.2em] text-amber-300 mb-1">Dashboard</p>
        <h1 class="text-3xl font-black text-white">Your events</h1>
        <p class="mt-1.5 text-sm text-ink-400 max-w-sm">Create events, share links, and watch your networking ecosystem grow.</p>
      </div>
      <Button
        id="create-event-btn"
        onclick={() => goto('/events/create')}
        class="gap-2 shrink-0"
      >
        <Plus size={16} />
        Create event
      </Button>
    </div>

    <!-- Events list -->
    <div class="space-y-4 animate-slide-up-delay-1">
      {#if data.events.length}
        {#each data.events as event}
          <div class="glass card-hover rounded-2xl p-6 border border-white/8">
            <div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div class="space-y-3 min-w-0">
                <Badge variant="secondary" class="gap-1.5 border-amber-400/20 bg-amber-400/8 text-amber-200 text-[10px] font-bold uppercase tracking-widest">
                  <Sparkles size={12} class="text-amber-400" />
                  Private event
                </Badge>

                <div>
                  <h2 class="text-xl font-bold text-white">{event.name}</h2>
                  <p class="mt-1.5 text-sm leading-6 text-ink-400 line-clamp-2">
                    {event.description ?? 'No description added yet.'}
                  </p>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                  <!-- Slug badge with copy -->
                  <button
                    id="copy-link-{event.slug}"
                    onclick={() => copySlug(event.slug)}
                    class="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-xs font-mono text-ink-300 transition hover:border-amber-400/30 hover:text-amber-200 hover:bg-amber-400/6"
                  >
                    {#if copiedSlug === event.slug}
                      <CheckCheck size={13} class="text-emerald-400" />
                      Copied!
                    {:else}
                      <Copy size={13} />
                      /event/{event.slug}
                    {/if}
                  </button>

                  <span class="flex items-center gap-1.5 text-xs text-ink-500">
                    <CalendarClock size={13} />
                    {new Date(event.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <div class="shrink-0">
                <Button
                  id="open-event-{event.slug}"
                  onclick={() => goto(`/event/${event.slug}`)}
                  class="gap-2 whitespace-nowrap"
                >
                  Open room
                  <ArrowRight size={15} />
                </Button>
              </div>
            </div>
          </div>
        {/each}
      {:else}
        <!-- Empty state -->
        <div class="glass rounded-2xl p-12 text-center border border-white/8 border-dashed">
          <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 border border-amber-400/20">
            <Sparkles class="text-amber-300" size={22} />
          </div>
          <h2 class="text-xl font-bold text-white mb-2">No events yet</h2>
          <p class="text-sm text-ink-400 max-w-xs mx-auto mb-6">
            Create your first event and share the link with attendees. The AI takes it from there.
          </p>
          <Button onclick={() => goto('/events/create')} class="gap-2">
            <Plus size={16} />
            Create your first event
          </Button>
        </div>
      {/if}
    </div>
  </main>
</PageShell>
