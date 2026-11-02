<script>
  import { onMount } from "svelte";
  import { CalendarHeart, Check, ChevronRight, Inbox, LoaderCircle, Lock, MessageCircle, X } from "@lucide/svelte";
  import PageShell from "$lib/components/page-shell.svelte";
  import Sidebar from "$lib/components/sidebar.svelte";
  import ConnectionChatWindow from "$lib/components/connection-chat-window.svelte";
  import { createSupabaseBrowserClient } from "$lib/supabase/client";
  import { goto } from "$app/navigation";
  import { clearAllEventStores } from "$lib/stores/eventStore";
  import { clearAllChatStores } from "$lib/stores/chatStore";
  import { Avatar, AvatarFallback, AvatarImage } from "$lib/components/ui/avatar/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { toast } from "$lib/components/ui/sonner/index.js";

  export let data;

  let connections = [];
  let loadingConnections = true;
  let loadingMoreConnections = false;
  let connectionsPage = 1;
  let connectionsHasMore = false;
  let signingOut = false;
  let showReceivedRequests = false;
  let selectedConnection = null;
  let selectedHistory = [];
  let selectedRequest = null;
  let updatingRequest = false;
  const supabase = createSupabaseBrowserClient();
  const dateFormatter = new Intl.DateTimeFormat([], { month: "short", day: "numeric", year: "numeric" });

  function getInitials(name) { return (name ?? "?").split(" ").map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase(); }
  function otherUserId(connection) { return connection.sender_user_id === data.user?.id ? connection.receiver_user_id : connection.sender_user_id; }

  function groupPeople(rows) {
    const people = new Map();
    for (const connection of rows) {
      const userId = otherUserId(connection);
      if (!people.has(userId)) people.set(userId, { userId, profile: connection.profile, connections: [] });
      people.get(userId).connections.push(connection);
    }
    return [...people.values()].map((person) => {
      const history = [...person.connections].sort((a, b) => new Date(b.updated_at ?? b.created_at) - new Date(a.updated_at ?? a.created_at));
      return { ...person, connection: history[0], history, hasMet: history.some((connection) => Boolean(connection.met_at)) };
    }).sort((a, b) => new Date(b.connection?.updated_at ?? b.connection?.created_at ?? 0) - new Date(a.connection?.updated_at ?? a.connection?.created_at ?? 0));
  }

  $: acceptedPeople = groupPeople(connections.filter((connection) => connection.status === "accepted"));
  $: sentRequests = connections.filter((connection) => connection.sender_user_id === data.user?.id && connection.status === "pending");
  $: receivedRequests = connections.filter((connection) => connection.receiver_user_id === data.user?.id && connection.status === "pending");

  async function signOut() {
    signingOut = true;
    await supabase.auth.signOut();
    signingOut = false;
    clearAllEventStores();
    clearAllChatStores();
    await goto("/");
  }

  async function fetchAllConnections() {
    loadingConnections = true;
    connectionsPage = 1;
    try {
      const res = await fetch("/api/connections?filter=all&page=1&limit=50", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch connections");
      const payload = await res.json();
      connections = payload.connections ?? [];
      connectionsHasMore = Boolean(payload.hasMore);
    } catch {
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
      const res = await fetch(`/api/connections?filter=all&page=${nextPage}&limit=50`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch more connections");
      const payload = await res.json();
      const ids = new Set(connections.map((connection) => connection.id));
      connections = [...connections, ...(payload.connections ?? []).filter((connection) => !ids.has(connection.id))];
      connectionsHasMore = Boolean(payload.hasMore);
      connectionsPage = nextPage;
    } catch {
      toast.error("Could not load more connections");
    } finally {
      loadingMoreConnections = false;
    }
  }

  function openPerson(person) {
    selectedRequest = null;
    selectedConnection = person.connection;
    selectedHistory = person.history;
  }

  function openPendingRequest(connection, type) {
    selectedConnection = null;
    selectedHistory = [];
    selectedRequest = { ...connection, type };
  }

  async function updateRequest(status) {
    if (!selectedRequest || updatingRequest) return;
    updatingRequest = true;
    try {
      const res = await fetch(`/api/connections/${selectedRequest.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status }) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "Could not update request");
      toast.success(status === "accepted" ? "Connection accepted" : "Connection request declined");
      selectedRequest = null;
      await fetchAllConnections();
    } catch (error) {
      toast.error("Could not update request", { description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      updatingRequest = false;
    }
  }

  onMount(fetchAllConnections);
</script>

<svelte:head><title>Connections | Evenai</title></svelte:head>

<PageShell user={data.user}>
  <Sidebar user={data.user} {signingOut} onSignOut={signOut} />
  <main class="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
    <div class="mb-6"><h1 class="text-2xl font-bold tracking-tight text-white">Connections</h1><p class="mt-1 text-sm text-ink-400">Your conversations and connections across every event.</p></div>
    <div class="grid min-h-[680px] overflow-hidden rounded-2xl border border-white/10 bg-[#111216] shadow-2xl lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside class="flex min-h-0 flex-col border-b border-white/10 bg-[#15161a] lg:border-b-0 lg:border-r">
        <div class="border-b border-white/8 p-4">
          <button type="button" onclick={() => { showReceivedRequests = !showReceivedRequests; selectedRequest = null; }} class="flex w-full items-center justify-between rounded-xl border border-cyan-400/15 bg-cyan-400/8 px-3 py-2.5 text-left text-sm text-cyan-100 transition hover:bg-cyan-400/12">
            <span class="flex items-center gap-2"><Inbox size={16} /> Received requests</span><span class="rounded-full bg-cyan-400/20 px-2 py-0.5 text-xs font-semibold text-cyan-200">{receivedRequests.length}</span>
          </button>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto">
          {#if loadingConnections}
            <div class="flex justify-center py-12 text-sm text-ink-400"><LoaderCircle size={16} class="mr-2 animate-spin" /> Loading people</div>
          {:else if showReceivedRequests}
            <div class="border-b border-white/8 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-cyan-300">Received requests</div>
            {#if receivedRequests.length}
              {#each receivedRequests as request (request.id)}
                <button type="button" onclick={() => openPendingRequest(request, "received")} class="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/5 {selectedRequest?.id === request.id ? 'bg-cyan-400/10' : ''}">
                  <Avatar class="size-10 shrink-0"><AvatarImage src={request.profile?.avatar_url ?? undefined} /><AvatarFallback>{getInitials(request.profile?.display_name)}</AvatarFallback></Avatar><span class="min-w-0 flex-1"><span class="block truncate text-sm font-medium text-white">{request.profile?.display_name ?? "Unknown"}</span><span class="block truncate text-xs text-cyan-300">Wants to connect</span></span><ChevronRight size={16} class="text-ink-500" />
                </button>
              {/each}
            {:else}<p class="px-4 py-8 text-center text-sm text-ink-500">No pending requests.</p>{/if}
          {:else}
            <div class="border-b border-white/8 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-400">Chats</div>
            {#if acceptedPeople.length}
              {#each acceptedPeople as person (person.userId)}
                <button type="button" onclick={() => openPerson(person)} class="flex w-full items-center gap-3 border-l-2 border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/5 {person.hasMet ? 'border-l-teal-400 bg-teal-400/[0.06]' : 'border-l-transparent'} {selectedConnection?.id === person.connection?.id ? 'bg-white/8' : ''}">
                  <Avatar class="size-10 shrink-0 border {person.hasMet ? 'border-teal-400/40' : 'border-white/10'}"><AvatarImage src={person.profile?.avatar_url ?? undefined} /><AvatarFallback>{getInitials(person.profile?.display_name)}</AvatarFallback></Avatar><span class="min-w-0 flex-1"><span class="flex items-center gap-1 truncate text-sm font-medium text-white">{person.profile?.display_name ?? "Unknown"}{#if person.hasMet}<CalendarHeart size={13} class="shrink-0 text-teal-300" />{/if}</span><span class="block truncate text-xs {person.hasMet ? 'text-teal-200/80' : 'text-ink-500'}">{person.hasMet ? 'Met' : person.connection?.event_name ?? 'Connected'}</span></span>
                </button>
              {/each}
            {:else}<p class="px-4 py-8 text-center text-sm text-ink-500">No accepted connections yet.</p>{/if}
            {#if sentRequests.length}
              <div class="border-y border-white/8 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-400">Sent requests</div>
              {#each sentRequests as request (request.id)}
                <button type="button" onclick={() => openPendingRequest(request, "sent")} class="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/5 {selectedRequest?.id === request.id ? 'bg-white/8' : ''}">
                  <Avatar class="size-10 shrink-0 opacity-70"><AvatarImage src={request.profile?.avatar_url ?? undefined} /><AvatarFallback>{getInitials(request.profile?.display_name)}</AvatarFallback></Avatar><span class="min-w-0 flex-1"><span class="block truncate text-sm font-medium text-white">{request.profile?.display_name ?? "Unknown"}</span><span class="flex items-center gap-1 text-xs text-amber-300"><Lock size={11} /> Awaiting acceptance</span></span>
                </button>
              {/each}
            {/if}
          {/if}
        </div>
        {#if connectionsHasMore}<div class="border-t border-white/8 p-3"><Button variant="outline" class="w-full border-white/10" disabled={loadingMoreConnections} onclick={loadMoreConnections}>{loadingMoreConnections ? "Loading…" : "Load more"}</Button></div>{/if}
      </aside>
      <section class="min-h-[620px] bg-[#101114] p-3 sm:p-4">
        {#if selectedConnection}
          <ConnectionChatWindow connection={selectedConnection} currentUserId={data.user?.id} history={selectedHistory} />
        {:else if selectedRequest}
          <div class="flex h-full min-h-[580px] flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/[0.02] px-6 text-center">
            <Avatar class="mb-4 size-16 border border-white/10"><AvatarImage src={selectedRequest.profile?.avatar_url ?? undefined} /><AvatarFallback>{getInitials(selectedRequest.profile?.display_name)}</AvatarFallback></Avatar><h2 class="text-xl font-semibold text-white">{selectedRequest.profile?.display_name ?? "Connection request"}</h2><p class="mt-2 max-w-sm text-sm leading-6 text-ink-400">{selectedRequest.type === "received" ? `Wants to connect with you from ${selectedRequest.event_name}.` : `Your request from ${selectedRequest.event_name} is awaiting acceptance. Chat will unlock once they accept.`}</p>
            {#if selectedRequest.type === "received"}<div class="mt-6 flex gap-3"><Button disabled={updatingRequest} onclick={() => updateRequest("accepted")} class="gap-2"><Check size={16} /> Accept</Button><Button disabled={updatingRequest} variant="outline" onclick={() => updateRequest("rejected")} class="gap-2 border-white/10"><X size={16} /> Decline</Button></div>{:else}<div class="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-200"><Lock size={14} /> Chat locked until accepted</div>{/if}
          </div>
        {:else}
          <div class="flex h-full min-h-[580px] flex-col items-center justify-center rounded-2xl border border-white/8 bg-[radial-gradient(circle_at_top,#17212a_0%,#101114_55%)] px-6 text-center"><div class="mb-5 flex size-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300"><MessageCircle size={28} /></div><h2 class="text-xl font-semibold text-white">Select a conversation</h2><p class="mt-2 max-w-sm text-sm leading-6 text-ink-400">Choose a connected person from the sidebar to view your chat and shared event history.</p></div>
        {/if}
      </section>
    </div>
  </main>
</PageShell>
