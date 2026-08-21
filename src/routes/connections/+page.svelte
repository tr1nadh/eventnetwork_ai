<script>
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import {
    Users,
    CheckCircle2,
    MessageCircle,
    MapPin,
    ArrowRight
  } from "@lucide/svelte";
  import PageShell from "$lib/components/page-shell.svelte";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { toast } from "$lib/components/ui/sonner/index.js";
  import { Button } from "$lib/components/ui/button/index.js";

  export let data;

  let connections = [];
  let connectionFilter = "connected"; // connected | met | received | sent
  let loadingConnections = true;
  let connectionsPage = 1;
  let connectionsHasMore = false;
  let loadingMoreConnections = false;

  $: filteredConnections = connections.filter((conn) => {
    const isSender = conn.sender_user_id === data.user?.id;
    const isReceiver = conn.receiver_user_id === data.user?.id;

    if (connectionFilter === "received") {
      return isReceiver && conn.status === "pending";
    }
    if (connectionFilter === "sent") {
      return isSender && conn.status === "pending";
    }
    if (connectionFilter === "connected") {
      return (isSender || isReceiver) && conn.status === "accepted";
    }
    if (connectionFilter === "met") {
      return (isSender || isReceiver) && conn.status === "accepted" && !!conn.met_at;
    }
    return false;
  });

  async function fetchAllConnections() {
    loadingConnections = true;
    connectionsPage = 1;
    try {
      const res = await fetch(`/api/connections?filter=all&page=1&limit=50`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch connections");
      const { connections: conns, hasMore } = await res.json();
      connections = conns || [];
      connectionsHasMore = hasMore;
    } catch (e) {
      toast.error("Could not load connections");
    } finally {
      loadingConnections = false;
    }
  }

  async function loadMoreConnections() {
    if (loadingMoreConnections || !connectionsHasMore) return;
    loadingMoreConnections = true;
    try {
      const nextPage = connectionsPage + 1;
      const res = await fetch(
        `/api/connections?filter=all&page=${nextPage}&limit=50`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to fetch more connections");
      const { connections: newConns, hasMore } = await res.json();
      
      const existingIds = new Set(connections.map((c) => c.id));
      const uniqueNewConns = newConns.filter((c) => !existingIds.has(c.id));
      connections = [...connections, ...uniqueNewConns];
      
      connectionsHasMore = hasMore;
      connectionsPage = nextPage;
    } catch (e) {
      toast.error("Could not load more connections");
    } finally {
      loadingMoreConnections = false;
    }
  }

  onMount(() => {
    fetchAllConnections();
  });
</script>

<svelte:head>
  <title>My Connections | Evenai</title>
</svelte:head>

<PageShell user={data.user}>
  <div class="max-w-4xl mx-auto space-y-8">
    <div class="flex items-center justify-between mt-8">
      <div>
        <h1 class="text-2xl font-bold text-white tracking-tight">Global Connections</h1>
        <p class="text-sm text-slate-400 mt-1">
          Manage all connections you've made across different events.
        </p>
      </div>
    </div>

    <!-- Tabs and Filters -->
    <Tabs.Root bind:value={connectionFilter} class="w-full">
      <Tabs.List class="grid w-full max-w-md grid-cols-4 bg-[#111] p-1 border border-white/10 rounded-xl mb-6">
        <Tabs.Trigger value="connected" class="rounded-lg text-xs font-medium data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-400 data-[state=active]:shadow-sm">
          Connected
        </Tabs.Trigger>
        <Tabs.Trigger value="met" class="rounded-lg text-xs font-medium data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm">
          Met
        </Tabs.Trigger>
        <Tabs.Trigger value="received" class="rounded-lg text-xs font-medium data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400 data-[state=active]:shadow-sm">
          Received
        </Tabs.Trigger>
        <Tabs.Trigger value="sent" class="rounded-lg text-xs font-medium data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-sm">
          Sent
        </Tabs.Trigger>
      </Tabs.List>
    </Tabs.Root>

    {#if loadingConnections}
      <div class="flex flex-col items-center justify-center py-24 border border-white/5 bg-[#111]/50 rounded-2xl">
        <div class="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin mb-4"></div>
        <p class="text-slate-400 text-sm">Loading connections...</p>
      </div>
    {:else if filteredConnections.length === 0}
      <div class="flex flex-col items-center justify-center py-24 border border-white/5 bg-[#111]/50 rounded-2xl text-center px-6" in:fade>
        <div class="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-slate-500">
          <Users size={24} />
        </div>
        <h3 class="text-white font-medium mb-2">No connections found</h3>
        <p class="text-slate-400 text-sm max-w-sm mb-6">
          You don't have any connections in this category across your events.
        </p>
        <Button href="/discover" variant="outline" class="border-white/10 bg-[#111] hover:bg-white/5 hover:text-white">
          Discover Events
        </Button>
      </div>
    {:else}
      <div class="grid sm:grid-cols-2 gap-4" in:fade>
        {#each filteredConnections as conn (conn.id)}
          <div class="group flex flex-col p-5 bg-[#111] border border-white/5 rounded-2xl hover:border-white/10 hover:-translate-y-1 transition-all duration-300">
            <div class="flex justify-between items-start mb-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-sm shrink-0 border border-amber-500/30 shadow-[0_0_15px_rgba(251,191,36,0.15)]">
                  {conn.profile?.display_name?.charAt(0).toUpperCase() || "?"}
                </div>
                <div>
                  <h4 class="text-white font-medium text-sm">
                    {conn.profile?.display_name || "Unknown User"}
                  </h4>
                  <p class="text-xs text-slate-400 mt-0.5 line-clamp-1">
                    {conn.profile?.what_i_do || "Participant"}
                  </p>
                </div>
              </div>
              <a href={`/event/${conn.event_slug}`} class="shrink-0">
                <Badge variant="outline" class="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20 flex items-center gap-1.5 transition-colors">
                  <MapPin size={10} />
                  <span class="truncate max-w-[80px]" title={conn.event_name}>{conn.event_name}</span>
                </Badge>
              </a>
            </div>

            <div class="mt-auto pt-4 flex items-center gap-2 border-t border-white/5">
              <Button
                variant="outline"
                size="sm"
                class="flex-1 border-white/10 bg-transparent hover:bg-white/5 text-xs text-slate-300 gap-1.5 h-8"
                href={`/event/${conn.event_slug}`}
              >
                Go to Event <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        {/each}
      </div>
      
      {#if connectionsHasMore}
        <div class="flex justify-center mt-8">
          <Button
            variant="outline"
            class="border-white/10 bg-[#111] text-slate-300 hover:bg-white/5"
            disabled={loadingMoreConnections}
            on:click={loadMoreConnections}
          >
            {loadingMoreConnections ? "Loading..." : "Load More Connections"}
          </Button>
        </div>
      {/if}
    {/if}
  </div>
</PageShell>
