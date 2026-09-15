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
    RefreshCw,
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
  import { goto, invalidateAll } from "$app/navigation";
  import { navigating } from "$app/stores";
  import { toast } from "$lib/components/ui/sonner/index.js";
  import { myEventsStore, clearAllEventStores } from "$lib/stores/eventStore";
  import { clearAllChatStores } from "$lib/stores/chatStore";

  export let data;

  let refreshing = false;

  async function refreshEvents() {
    refreshing = true;
    try {
      await invalidateAll();
      toast.success("Events refreshed!");
    } catch {
      toast.error("Failed to refresh events");
    } finally {
      refreshing = false;
    }
  }

  $: {
    if (data.events) {
      myEventsStore.set(data.events);
    }
  }

  const supabase = createSupabaseBrowserClient();
  let signingOut = false;
  let copiedSlug = null;

  let statusFilter = "all";

  // Reset client-side sub-filter only when the URL filter tab changes
  let _lastFilter = data.filter;
  $: if (data.filter !== _lastFilter) {
    _lastFilter = data.filter;
    statusFilter = "all";
  }

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

  function getEventStatus(event) {
    if (event.start_time && event.end_time) {
      const now = new Date();
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      if (now >= start && now <= end) return "live";
      if (now < start) return "upcoming";
      return "archived";
    }
    const text = `${event.name} ${event.description || ""}`.toLowerCase();
    if (text.includes("archive")) return "archived";
    if (text.includes("live")) return "live";
    if (text.includes("upcoming") || text.includes("upcomming")) return "upcoming";

    const ageInDays = (new Date() - new Date(event.created_at)) / (1000 * 60 * 60 * 24);
    if (ageInDays <= 7) return "live";
    if (ageInDays <= 30) return "upcoming";
    return "archived";
  }

  $: filteredEvents = $myEventsStore.filter(event => {
    if (statusFilter === "all") return true;
    return getEventStatus(event) === statusFilter;
  });

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

  function applyFilter(f) {
    const params = new URLSearchParams(window.location.search);
    params.set("filter", f);
    if (searchQuery) params.set("q", searchQuery);
    goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
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
  <title>Events | Evenai</title>
  <meta
    name="description"
    content="Events and join networking events on Evenai."
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
        <h1 class="text-3xl font-black text-white">Events</h1>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <Button
          id="refresh-events-btn"
          variant="outline"
          onclick={refreshEvents}
          class="gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-white"
          disabled={refreshing || $navigating}
          title="Refresh events list"
        >
          <RefreshCw size={15} class={refreshing ? "animate-spin" : ""} />
          <span class="hidden sm:inline">Refresh</span>
        </Button>
        <Button
          id="create-event-btn"
          onclick={() => goto("/events/create")}
          class="gap-2"
          disabled={$navigating}
        >
          <Plus size={16} />
          Create event
        </Button>
      </div>
    </div>

    <!-- Filters and Search -->
    <div
      class="mb-6 flex flex-col sm:flex-row gap-4 animate-slide-up sm:items-center justify-between"
    >
      <div
        class="flex items-center gap-2 p-1 glass rounded-xl border border-white/8 transition-opacity duration-200"
        class:opacity-50={$navigating}
        class:pointer-events-none={$navigating}
      >
        <button
          class="rounded-lg px-4 py-1.5 text-sm font-semibold transition {data.filter ===
          'all'
            ? 'bg-white/10 text-white'
            : 'text-ink-500 hover:text-white'}"
          onclick={() => applyFilter("all")}
        >
          All
        </button>
        <button
          class="rounded-lg px-4 py-1.5 text-sm font-semibold transition {data.filter ===
          'joined'
            ? 'bg-white/10 text-white'
            : 'text-ink-500 hover:text-white'}"
          onclick={() => applyFilter("joined")}
        >
          Joined
        </button>
        <button
          class="rounded-lg px-4 py-1.5 text-sm font-semibold transition {data.filter ===
          'hosting'
            ? 'bg-white/10 text-white'
            : 'text-ink-500 hover:text-white'}"
          onclick={() => applyFilter("hosting")}
        >
          Hosting
        </button>
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

    <!-- Sub-filters (always visible) -->
    <div class="mb-6 flex flex-wrap gap-2 animate-slide-up">
      {#each [
        { value: 'all', label: 'All' },
        { value: 'live', label: '🔴 Live' },
        { value: 'upcoming', label: '📅 Upcoming' },
        { value: 'archived', label: '📁 Archived' }
      ] as statusOpt}
        <button
          class="rounded-lg px-3.5 py-1.5 text-xs font-semibold border transition duration-200 {statusFilter === statusOpt.value
            ? 'bg-amber-400/20 text-amber-300 border-amber-400/35 shadow-sm shadow-amber-400/10'
            : 'border-white/8 text-ink-400 hover:text-white hover:border-white/15 hover:bg-white/4'}"
          onclick={() => statusFilter = statusOpt.value}
        >
          {statusOpt.label}
        </button>
      {/each}
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
      {:else if filteredEvents.length}
        <div class="events-grid">
          {#each filteredEvents as event}
            {@const status = getEventStatus(event)}
            <div class="event-card glass card-hover rounded-2xl border"
              class:border-rose-400-20={status === 'live'}
              class:border-cyan-400-20={status === 'upcoming'}
              class:border-white-8={status === 'archived'}
            >
              <!-- Card top accent bar + status -->
              <div class="card-accent" class:accent-live={status === 'live'} class:accent-upcoming={status === 'upcoming'} class:accent-archived={status === 'archived'}></div>

              <!-- Card body -->
              <div class="card-body">
                <!-- Status + format + role badges -->
                <div class="flex flex-wrap items-center gap-1.5 mb-3">
                  {#if status === 'live'}
                    <span class="status-badge status-live">
                      <span class="status-dot bg-rose-400 animate-pulse"></span>
                      Live
                    </span>
                  {:else if status === 'upcoming'}
                    <span class="status-badge status-upcoming">
                      <span class="status-dot bg-cyan-400"></span>
                      Upcoming
                    </span>
                  {:else}
                    <span class="status-badge status-archived">
                      <span class="status-dot bg-slate-500"></span>
                      Archived
                    </span>
                  {/if}

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
                  {event.description ?? 'No description added yet.'}
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
                    {event.start_time ? formatEventDateRange(event.start_time, event.end_time) : new Date(event.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
        <div class="glass rounded-2xl p-12 text-center border border-white/8 border-dashed">
          <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 border border-amber-400/20">
            <Sparkles class="text-amber-300" size={22} />
          </div>
          <h2 class="text-xl font-bold text-white mb-2">No events found</h2>
          <p class="text-sm text-ink-400 max-w-xs mx-auto mb-6">
            {#if statusFilter !== 'all'}
              There are no {statusFilter} events matching this filter.
            {:else}
              Create your first event and share the link with attendees. The AI takes it from there.
            {/if}
          </p>
          {#if statusFilter === 'all'}
            <Button onclick={() => goto('/events/create')} class="gap-2">
              <Plus size={16} />
              Create your first event
            </Button>
          {/if}
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
  .event-card { display: flex; flex-direction: column; overflow: hidden; border-color: rgba(255,255,255,.08); }
  .card-accent { height: 3px; flex-shrink: 0; }
  .accent-live     { background: linear-gradient(90deg, rgba(251,113,133,.9) 0%, rgba(251,113,133,.15) 100%); }
  .accent-upcoming { background: linear-gradient(90deg, rgba(34,211,238,.8)  0%, rgba(34,211,238,.1)   100%); }
  .accent-archived { background: linear-gradient(90deg, rgba(100,116,139,.4) 0%, transparent           100%); }
  .card-body { flex: 1; padding: 1rem 1.1rem 0.75rem; }
  .card-title { font-size: .9375rem; font-weight: 700; color: #f1f5f9; line-height: 1.35; margin-bottom: .45rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .card-desc  { font-size: .775rem; color: rgba(148,163,184,.72); line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .card-footer { display: flex; align-items: center; justify-content: space-between; gap: .5rem; padding: .7rem 1.1rem .9rem; border-top: 1px solid rgba(255,255,255,.05); margin-top: auto; }
  .card-meta { display: flex; flex-direction: column; gap: .28rem; min-width: 0; overflow: hidden; }
  .meta-date { display: flex; align-items: center; gap: .3rem; font-size: .64rem; color: rgba(100,116,139,.8); white-space: nowrap; }
  .copy-btn { display: flex; align-items: center; gap: .3rem; font-size: .62rem; font-family: monospace; color: rgba(148,163,184,.55); background: transparent; border: none; cursor: pointer; padding: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; transition: color 150ms; }
  .copy-btn:hover { color: #fde68a; }
  .status-badge { display: inline-flex; align-items: center; gap: .3rem; font-size: .64rem; font-weight: 700; padding: .18rem .5rem; border-radius: 9999px; border: 1px solid; }
  .status-dot { display: inline-block; width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
  .status-live     { color: #fca5a5; background: rgba(251,113,133,.1);       border-color: rgba(251,113,133,.25); }
  .status-upcoming { color: #67e8f9; background: rgba(34,211,238,.08);        border-color: rgba(34,211,238,.2); }
  .status-archived { color: rgba(100,116,139,.9); background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.08); }
  .hosting-badge { display: inline-flex; align-items: center; gap: .25rem; font-size: .62rem; font-weight: 700; color: #fbbf24; background: rgba(251,191,36,.12); border: 1px solid rgba(251,191,36,.3); padding: .18rem .48rem; border-radius: 9999px; }
  .joined-badge { display: inline-flex; align-items: center; gap: .25rem; font-size: .62rem; font-weight: 700; color: #34d399; background: rgba(52,211,153,.12); border: 1px solid rgba(52,211,153,.3); padding: .18rem .48rem; border-radius: 9999px; }
  .format-badge { display: inline-flex; align-items: center; gap: .25rem; font-size: .62rem; font-weight: 600; color: #cbd5e1; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); padding: .18rem .48rem; border-radius: 9999px; text-transform: capitalize; }
  .approval-badge { display: inline-flex; align-items: center; gap: .25rem; font-size: .62rem; font-weight: 600; color: #fde68a; background: rgba(251,191,36,.08); border: 1px solid rgba(251,191,36,.2); padding: .18rem .48rem; border-radius: 9999px; }
  .event-card-skeleton { display: flex; flex-direction: column; }
  .skeleton-header { height: 3px; background: rgba(255,255,255,.06); }
</style>
