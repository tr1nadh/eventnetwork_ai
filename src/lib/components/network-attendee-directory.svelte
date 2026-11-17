<script>
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";

  export let eventId;
  export let hostId;
  export let viewerId;
  export let connections;
  export let connectingIds;
  export let onConnect;

  let attendees = [];
  let loading = true;
  let failed = false;
  const controller = new AbortController();

  async function load() {
    loading = true;
    failed = false;
    try {
      const params = new URLSearchParams({ event_id: eventId, status: "joined", network_profiles_only: "true" });
      const res = await fetch(`/api/attendees?${params}`, { signal: controller.signal });
      if (!res.ok) throw new Error("Could not load attendees");
      const payload = await res.json();
      attendees = payload.attendees.filter(person =>
        !person.is_host && person.user_id !== hostId &&
        (!person.registrationStatus || person.registrationStatus === "joined")
      );
    } catch {
      if (!controller.signal.aborted) failed = true;
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    load();
    return () => controller.abort();
  });

  $: byPerson = new Map(connections.map(connection => [
    connection.sender_user_id === viewerId ? connection.receiver_user_id : connection.sender_user_id,
    connection
  ]));

  function requestState(person, connection) {
    if (connection) {
      if (connection.status === "pending") return connection.sender_user_id === viewerId ? "sent" : "received";
      return connection.status;
    }
    return person.connectionStatus || "none";
  }

  const statusLabels = {
    sent: "Request sent", received: "Request received", connected: "Connected",
    accepted: "Connected", met: "Connected", rejected: "Request declined", cancelled: "Request cancelled"
  };
</script>

{#if loading}
  <p role="status" class="py-6 text-sm text-ink-400">Loading attendeesâ€¦</p>
{:else if failed}
  <div class="space-y-3 py-6">
    <p role="alert">Couldnâ€™t load attendees.</p>
    <Button variant="outline" onclick={load}>Try again</Button>
  </div>
{:else if !attendees.length}
  <p class="py-6 text-sm text-ink-400">No attendees have completed their networking profile yet.</p>
{:else}
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each attendees as person (person.user_id)}
      {@const state = requestState(person, byPerson.get(person.user_id))}
      <article class="workspace-panel flex min-w-0 flex-col gap-4 p-5">
        <h3 class="break-words text-lg font-semibold">{person.name}</h3>
        <dl class="flex-1 space-y-3 text-sm">
          {#each [["What I do", person.role], ["Who Iâ€™m looking for", person.looking_for], ["About me", person.about]] as [label, value]}
            <div>
              <dt class="font-medium text-ink-400">{label}</dt>
              <dd class="mt-1 whitespace-pre-line break-words text-ink-100">{value || "Not provided"}</dd>
            </div>
          {/each}
        </dl>
        {#if person.user_id !== viewerId && !person.is_current_user}
          {#if state === "none"}
            <Button disabled={connectingIds.includes(person.user_id)} onclick={() => onConnect(person)}>
              {connectingIds.includes(person.user_id) ? "Sendingâ€¦" : "Send request"}
            </Button>
          {:else}
            <p role="status" class="text-sm text-ink-400">{statusLabels[state] || "Request unavailable"}</p>
          {/if}
        {/if}
      </article>
    {/each}
  </div>
{/if}
