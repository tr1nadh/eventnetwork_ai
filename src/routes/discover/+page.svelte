<script>
  import {
    ArrowRight,
    Sparkles,
    Plus,
    Link as LinkIcon,
    Copy,
    CheckCheck,
    CalendarClock,
    Search,
    Compass,
  } from "@lucide/svelte";
  import Sidebar from "$lib/components/sidebar.svelte";
  import PageShell from "$lib/components/page-shell.svelte";
  import { createSupabaseBrowserClient } from "$lib/supabase/client";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { goto } from "$app/navigation";
  import { navigating } from "$app/stores";
  import { toast } from "$lib/components/ui/sonner/index.js";
  import { clearAllEventStores } from "$lib/stores/eventStore";
  import { clearAllChatStores } from "$lib/stores/chatStore";

  export let data;

  const supabase = createSupabaseBrowserClient();
  let signingOut = false;
  let copiedSlug = null;

  $: searchQuery = data.q || "";

  async function signOut() {
    signingOut = true;
    await supabase.auth.signOut();
    signingOut = false;
    clearAllEventStores();
    clearAllChatStores();
    await goto("/");
  }

  async function copySlug(slug) {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/event/${slug}`,
      );
      copiedSlug = slug;
      toast.success("Link copied!");
      setTimeout(() => {
        copiedSlug = null;
      }, 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  let searchTimeout;

  function handleInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (searchQuery) {
        params.set("q", searchQuery);
      } else {
        params.delete("q");
      }
      goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
    }, 300);
  }

  function applySearch(e) {
    e.preventDefault();
    clearTimeout(searchTimeout);
    const params = new URLSearchParams(window.location.search);
    if (searchQuery) {
      params.set("q", searchQuery);
    } else {
      params.delete("q");
    }
    goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
  }
</script>

<svelte:head>
  <title>Discover Events | Evenai</title>
  <meta
    name="description"
    content="Discover and browse all public networking events on Evenai."
  />
</svelte:head>

<PageShell>
  <Sidebar user={data.user} {signingOut} onSignOut={signOut} />

  <main class="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
    <!-- Page header -->
    <div
      class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-slide-up"
    >
      <div>
        <h1 class="text-3xl font-black text-white flex items-center gap-2">
          <Compass class="text-amber-400" size={28} />
          Discover Events
        </h1>
        <p class="mt-1 text-sm text-ink-400">Explore public networking events hosted on the platform</p>
      </div>
    </div>

    <!-- Search -->
    <div
      class="mb-6 flex flex-col sm:flex-row gap-4 animate-slide-up sm:items-center justify-between"
    >
      <div class="text-sm font-semibold text-ink-300">
        Showing {data.events.length} {data.events.length === 1 ? 'event' : 'events'}
      </div>

      <form onsubmit={applySearch} class="relative w-full sm:w-64">
        <Search
          class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500"
        />
        <Input
          type="search"
          placeholder="Search events..."
          bind:value={searchQuery}
          oninput={handleInput}
          class="pl-9 bg-white/5 border-white/10 text-white h-10 w-full"
        />
      </form>
    </div>

    <!-- Events list -->
    <div class="space-y-4 animate-slide-up-delay-1">
      {#if $navigating}
        <!-- Skeleton Loaders -->
        {#each Array(3) as _}
          <div
            class="glass rounded-2xl p-6 border border-white/8 animate-pulse"
          >
            <div
              class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"
            >
              <div class="space-y-4 w-full max-w-md">
                <div class="space-y-2.5">
                  <div class="h-7 w-2/3 rounded-lg bg-white/10"></div>
                  <div class="h-4 w-full rounded-lg bg-white/5"></div>
                  <div class="h-4 w-4/5 rounded-lg bg-white/5"></div>
                </div>
                <div class="flex items-center gap-3 pt-1">
                  <div class="h-8 w-32 rounded-lg bg-white/10"></div>
                  <div class="h-4 w-24 rounded-lg bg-white/5"></div>
                </div>
              </div>
              <div class="shrink-0 mt-2 sm:mt-0">
                <div class="h-10 w-32 rounded-lg bg-white/10"></div>
              </div>
            </div>
          </div>
        {/each}
      {:else if data.events.length}
        {#each data.events as event}
          <div
            class="glass card-hover rounded-2xl p-6 border border-white/8"
          >
            <div
              class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"
            >
              <div class="space-y-3 min-w-0">
                <div>
                  <h2
                    class="text-xl font-bold text-white flex items-center gap-2"
                  >
                    {event.name}
                    {#if event.joined}
                      <CheckCheck size={14} class="text-amber-400" />
                      <span class="text-xs font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">Joined</span>
                    {/if}
                  </h2>
                  <p class="mt-1.5 text-sm leading-6 text-ink-400 line-clamp-2">
                    {event.description ?? "No description added yet."}
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
                    {new Date(event.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              <div class="shrink-0">
                <Button
                  id="open-event-{event.slug}"
                  onclick={() => goto(`/event/${event.slug}`)}
                  class="gap-2 whitespace-nowrap"
                >
                  View
                  <ArrowRight size={15} />
                </Button>
              </div>
            </div>
          </div>
        {/each}
      {:else}
        <!-- Empty state -->
        <div
          class="glass rounded-2xl p-12 text-center border border-white/8 border-dashed"
        >
          <div
            class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 border border-amber-400/20"
          >
            <Compass class="text-amber-300" size={22} />
          </div>
          <h2 class="text-xl font-bold text-white mb-2">No events found</h2>
          <p class="text-sm text-ink-400 max-w-xs mx-auto mb-6">
            There are no public events matching your search or active on the platform at the moment.
          </p>
        </div>
      {/if}
    </div>
  </main>
</PageShell>
