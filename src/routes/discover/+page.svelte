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
    Crown,
    Globe,
    MapPin,
    Lock,
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

  function formatEventDateRange(start, end) {
    if (!start) return "";
    const startDate = new Date(start);
    const dateStr = startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const startTimeStr = startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    if (!end) return `${dateStr}, ${startTimeStr}`;
    const endDate = new Date(end);
    const endTimeStr = endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${dateStr} • ${startTimeStr} - ${endTimeStr}`;
  }

  $: searchQuery = data.q || "";

  async function signOut() {
    signingOut = true;
    await supabase.auth.signOut();
    clearAllEventStores();
    clearAllChatStores();
    await goto("/");
    signingOut = false;
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

    <!-- Events grid -->
    <div class="animate-slide-up-delay-1">
      {#if $navigating}
        <!-- Skeleton card grid -->
        <div class="events-grid">
          {#each Array(6) as _}
            <div class="glass rounded-2xl border border-white/8 animate-pulse event-card-skeleton">
              <div class="skeleton-header"></div>
              <div class="p-5 space-y-3">
                <div class="h-5 w-3/4 rounded-lg bg-white/10"></div>
                <div class="h-3.5 w-full rounded-lg bg-white/5"></div>
                <div class="h-3.5 w-4/5 rounded-lg bg-white/5"></div>
              </div>
              <div class="p-5 pt-0 flex items-center justify-between">
                <div class="h-6 w-24 rounded-full bg-white/8"></div>
                <div class="h-8 w-20 rounded-lg bg-white/10"></div>
              </div>
            </div>
          {/each}
        </div>
      {:else if data.events.length}
        <div class="events-grid">
          {#each data.events as event}
            <div class="event-card glass card-hover rounded-2xl border border-amber-400/15">
              <!-- Card top accent bar -->
              <div class="card-accent accent-discover"></div>

              <!-- Card body -->
              <div class="card-body">
                <!-- Badges header -->
                <div class="flex flex-wrap items-center gap-1.5 mb-3">
                  {#if event.event_format}
                    <span class="format-badge">
                      {#if event.event_format === 'online'}
                        <Globe size={10} class="text-cyan-400" /> Online
                      {:else if event.event_format === 'hybrid'}
                        <Globe size={10} class="text-amber-400" /> Hybrid
                      {:else}
                        <MapPin size={10} class="text-amber-400" /> Offline
                      {/if}
                    </span>
                  {/if}

                  {#if event.created_by === data.user?.id}
                    <span class="hosting-badge">
                      <Crown size={10} class="text-amber-300" />
                      Hosting
                    </span>
                  {:else if event.joined}
                    <span class="joined-badge">
                      <CheckCheck size={10} class="text-emerald-400" />
                      Joined
                    </span>
                  {/if}

                  {#if event.is_approval_required}
                    <span class="approval-badge" title="Approval required by host">
                      <Lock size={10} class="text-amber-300" />
                      Approval
                    </span>
                  {/if}
                </div>

                <!-- Title -->
                <h2 class="card-title">{event.name}</h2>

                <!-- Description -->
                <p class="card-desc">
                  {event.description ?? "No description added yet."}
                </p>

                {#if event.location}
                  <p class="mt-2 text-[11px] text-ink-400 flex items-center gap-1 truncate">
                    <MapPin size={11} class="text-amber-400 shrink-0" />
                    <span class="truncate">{event.location}</span>
                  </p>
                {/if}
              </div>

              <!-- Card footer -->
              <div class="card-footer">
                <div class="card-meta">
                  <span class="meta-date">
                    <CalendarClock size={11} />
                    {event.start_time ? formatEventDateRange(event.start_time, event.end_time) : new Date(event.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <button
                    id="copy-link-{event.slug}"
                    onclick={() => copySlug(event.slug)}
                    class="copy-btn"
                    title="Copy event link"
                  >
                    {#if copiedSlug === event.slug}
                      <CheckCheck size={11} class="text-emerald-400" />
                      Copied!
                    {:else}
                      <Copy size={11} />
                      /{event.slug}
                    {/if}
                  </button>
                </div>
                <Button
                  id="open-event-{event.slug}"
                  onclick={() => goto(`/event/${event.slug}`)}
                  class="card-view-btn gap-1.5 text-xs px-3 py-1.5 h-auto"
                >
                  View
                  <ArrowRight size={13} />
                </Button>
              </div>
            </div>
          {/each}
        </div>
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

<style>
  .events-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }
  .event-card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .event-card:hover {
    transform: translateY(-2px);
    border-color: rgba(251, 191, 36, 0.35);
    box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.4), 0 0 15px -3px rgba(251, 191, 36, 0.12);
  }
  .card-accent {
    height: 3px;
    flex-shrink: 0;
  }
  .accent-discover {
    background: linear-gradient(90deg, rgba(251, 191, 36, 0.8) 0%, rgba(251, 191, 36, 0.1) 100%);
  }
  .card-body {
    flex: 1;
    padding: 1.1rem 1.1rem 0.85rem;
  }
  .card-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: #f1f5f9;
    line-height: 1.35;
    margin-bottom: 0.45rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .card-desc {
    font-size: 0.785rem;
    color: rgba(148, 163, 184, 0.75);
    line-height: 1.6;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.75rem 1.1rem 0.95rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    margin-top: auto;
  }
  .card-meta {
    display: flex;
    flex-direction: column;
    gap: 0.28rem;
    min-width: 0;
    overflow: hidden;
  }
  .meta-date {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.65rem;
    color: rgba(100, 116, 139, 0.85);
    white-space: nowrap;
  }
  .copy-btn {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.625rem;
    font-family: monospace;
    color: rgba(148, 163, 184, 0.55);
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
    transition: color 150ms;
  }
  .copy-btn:hover {
    color: rgba(251, 191, 36, 0.9);
  }
  .hosting-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.625rem;
    font-weight: 700;
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.12);
    border: 1px solid rgba(251, 191, 36, 0.3);
    padding: 0.18rem 0.48rem;
    border-radius: 9999px;
  }
  .joined-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.625rem;
    font-weight: 700;
    color: #34d399;
    background: rgba(52, 211, 153, 0.12);
    border: 1px solid rgba(52, 211, 153, 0.3);
    padding: 0.18rem 0.48rem;
    border-radius: 9999px;
  }
  .format-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.625rem;
    font-weight: 600;
    color: #cbd5e1;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 0.18rem 0.48rem;
    border-radius: 9999px;
    text-transform: capitalize;
  }
  .approval-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.625rem;
    font-weight: 600;
    color: #fde68a;
    background: rgba(251, 191, 36, 0.08);
    border: 1px solid rgba(251, 191, 36, 0.2);
    padding: 0.18rem 0.48rem;
    border-radius: 9999px;
  }
  .event-card-skeleton {
    height: 220px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .skeleton-header {
    height: 3px;
    background: rgba(255, 255, 255, 0.08);
  }
</style>

