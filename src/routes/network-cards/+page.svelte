<script>
  import { onMount } from 'svelte';
  import { ChevronLeft, ChevronRight, Plus } from '@lucide/svelte';
  import PageShell from '$lib/components/page-shell.svelte';
  import Sidebar from '$lib/components/sidebar.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { toast } from '$lib/components/ui/sonner/index.js';
  import { goto } from '$app/navigation';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';

  export let data;
  let cards = [];
  let loading = true;
  let signingOut = false;
  let carousel;
  const demos = [
    { title: 'Founder', name: 'Build what matters', role: 'Building a startup and looking for thoughtful collaborators.' },
    { title: 'Builder', name: 'Make things real', role: 'Designing products, systems, and practical experiments.' },
    { title: 'Explorer', name: 'Learn together', role: 'Meeting people with new ideas and interesting perspectives.' }
  ];

  async function loadCards() {
    try { const res = await fetch('/api/network-cards'); const body = await res.json(); if (!res.ok) throw new Error(body.error); cards = body.cards ?? []; }
    catch (error) { toast.error(error.message ?? 'Could not load network cards.'); }
    finally { loading = false; }
  }
  function scrollCards(direction) { carousel?.scrollBy({ left: direction * 310, behavior: 'smooth' }); }
  async function signOut() { signingOut = true; await createSupabaseBrowserClient().auth.signOut(); await goto('/'); }
  onMount(loadCards);
</script>

<svelte:head><title>Network Cards | Evenai</title></svelte:head>
<PageShell user={data.user}>
  <Sidebar user={data.user} {signingOut} onSignOut={signOut} />
  <main class="flex min-h-[calc(100vh-4rem)] flex-col px-4 pb-6 pt-2 sm:px-6">
    <div class="mb-4 flex justify-end">
      <Button class="shrink-0 gap-2" onclick={() => goto('/network-cards/add-card')}><Plus size={16} /> <span class="hidden sm:inline">Add a new card</span><span class="sm:hidden">Add</span></Button>
    </div>

    {#if loading}
      <div class="rounded-3xl border border-white/8 bg-white/[0.03] p-12 text-center text-sm text-ink-400">Loading your cards…</div>
    {:else if cards.length === 0}
      <section class="flex flex-1 items-center overflow-hidden">
        <div class="relative mx-auto w-full max-w-5xl">
          <button class="carousel-arrow left-0 hidden sm:flex" type="button" onclick={() => scrollCards(-1)} aria-label="Previous sample card"><ChevronLeft size={18} /></button>
          <div bind:this={carousel} class="demo-carousel px-1 py-3 sm:px-12">
            {#each demos as card}<article class="demo-card"><div class="flex items-center justify-between"><span class="rounded-full bg-violet-400/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-violet-200">{card.title}</span><span class="flex size-10 items-center justify-center rounded-xl bg-white/8 text-lg font-black text-white">{card.title[0]}</span></div><h3 class="mt-10 text-xl font-bold text-white">{card.name}</h3><p class="mt-3 text-sm leading-6 text-ink-400">{card.role}</p></article>{/each}
          </div>
          <button class="carousel-arrow right-0 hidden sm:flex" type="button" onclick={() => scrollCards(1)} aria-label="Next sample card"><ChevronRight size={18} /></button>
        </div>
      </section>
    {:else}
      <section><div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{#each cards as card (card.id)}<button type="button" onclick={() => goto(`/network-cards/add-card?card=${card.id}`)} class="group rounded-2xl border border-white/8 bg-white/[0.03] p-5 text-left transition hover:-translate-y-0.5 hover:border-violet-400/35 hover:bg-violet-400/[0.06]"><div class="flex items-start justify-between gap-3"><span class="rounded-full bg-violet-400/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-violet-200">{card.title}</span><span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/15 text-base font-black text-violet-100">{card.display_name?.slice(0,1)?.toUpperCase() ?? 'N'}</span></div><h2 class="mt-7 text-lg font-bold text-white">{card.display_name}</h2><p class="mt-2 line-clamp-2 text-sm leading-6 text-ink-400">{card.what_i_do}</p><p class="mt-5 text-xs font-semibold text-violet-200 group-hover:text-violet-100">Edit card →</p></button>{/each}</div></section>
    {/if}
  </main>
</PageShell>

<style>
  .demo-carousel { display: flex; gap: 1rem; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
  .demo-carousel::-webkit-scrollbar { display: none; }
  .demo-card { flex: 0 0 min(78vw, 270px); min-height: 270px; scroll-snap-align: center; border: 1px solid rgba(255,255,255,.1); border-radius: 1.25rem; padding: 1.25rem; background: linear-gradient(145deg, rgba(49,46,129,.45), rgba(15,23,42,.86)); box-shadow: 0 16px 36px rgba(0,0,0,.25); }
  .carousel-arrow { position: absolute; top: 50%; z-index: 2; transform: translateY(-50%); width: 2.25rem; height: 2.25rem; align-items: center; justify-content: center; border-radius: 999px; color: white; background: rgba(15,23,42,.94); border: 1px solid rgba(255,255,255,.14); }
  .carousel-arrow:hover { background: rgba(99,102,241,.45); }
</style>
