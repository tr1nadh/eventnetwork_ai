<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { BarChart3, Network, TrendingUp, PieChart, Target, LineChart, Plus } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button/index.js';

  export let eventId;
  export let isOrganizer;
  let analytics;
  let loadError = '';
  async function loadAnalytics() {
    loadError = '';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch('/api/events/' + encodeURIComponent(eventId), {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.headers.get('content-type')?.includes('application/json')) {
        throw new Error('The analytics endpoint returned an unexpected response (HTTP ' + response.status + '). Please reload the page and retry.');
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || result.error || 'Could not load analytics.');
      analytics = result;
    } catch (err) {
      loadError = err.name === 'AbortError' ? 'Analytics took too long to load. Please retry.' : err.message;
    } finally {
      clearTimeout(timeout);
    }
  }
  onMount(() => { if (isOrganizer) loadAnalytics(); });

  $: analyticsMetricCards = analytics
    ? [
        { label: "Total Participants", value: analytics.totalParticipants },
        { label: "AI Matches Generated", value: analytics.aiMatchesGenerated },
        { label: "Connection Requests", value: analytics.connectionRequests },
        { label: "Accepted Connections", value: analytics.acceptedConnections },
        { label: "People Met", value: analytics.peopleMet },
        {
          label: "Connection Acceptance Rate",
          value: `${analytics.connectionAcceptanceRate}%`,
        },
        {
          label: "QR Meet Completion Rate",
          value: `${analytics.qrMeetCompletionRate}%`,
        },
      ]
    : [];
  $: maxFunnelValue = Math.max(
    ...(analytics?.networkingFunnel ?? []).map((item) => item.value),
    1,
  );
</script>

{#if isOrganizer && analytics}
  <div class="space-y-5">
    <div class="glass rounded-2xl border border-white/8 p-6">
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <div class="flex items-center gap-2 mb-2">
            <BarChart3 size={18} class="text-cyan-300" />
            <p
              class="text-xs font-bold uppercase tracking-widest text-cyan-300"
            >
              Organizer Analytics
            </p>
          </div>
          <h2 class="text-2xl font-black text-white">
            Event performance dashboard
          </h2>
          <p
            class="mt-2 max-w-2xl text-sm leading-6 text-ink-400"
          >
            Monitor participant engagement, AI match activity,
            connection momentum, and QR meet completion for this
            event.
          </p>
        </div>
        <div
          class="rounded-xl border border-amber-400/20 bg-amber-400/8 px-4 py-3 text-right"
        >
          <p
            class="text-[10px] font-bold uppercase tracking-widest text-amber-300"
          >
            Live insight
          </p>
          <p class="mt-1 text-2xl font-black text-white">
            {analytics.connectionAcceptanceRate}%
          </p>
          <p class="text-xs text-ink-400">acceptance rate</p>
        </div>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {#each analyticsMetricCards as metric}
        <div
          class="glass card-hover rounded-2xl border border-white/8 p-5"
        >
          <p
            class="text-[10px] font-bold uppercase tracking-widest text-ink-500"
          >
            {metric.label}
          </p>
          <p class="mt-3 text-3xl font-black text-white">
            {metric.value}
          </p>
        </div>
      {/each}
    </div>

    <div class="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <div class="glass rounded-2xl border border-white/8 p-6">
        <div class="mb-5 flex items-center gap-2">
          <Network size={17} class="text-amber-300" />
          <h3 class="text-lg font-bold text-white">
            Networking Funnel
          </h3>
        </div>
        <div class="space-y-4">
          {#each analytics.networkingFunnel as step}
            <div>
              <div
                class="mb-1.5 flex items-center justify-between gap-3"
              >
                <p class="text-sm font-semibold text-ink-200">
                  {step.label}
                </p>
                <p class="text-sm font-bold text-white">
                  {step.value}
                </p>
              </div>
              <div
                class="h-2 overflow-hidden rounded-full bg-white/8"
              >
                <div
                  class="h-full rounded-full bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400"
                  style="width: {Math.max(
                    (step.value / maxFunnelValue) * 100,
                    step.value ? 8 : 2,
                  )}%"
                ></div>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="glass rounded-2xl border border-white/8 p-6">
        <div class="mb-5 flex items-center gap-2">
          <TrendingUp size={17} class="text-emerald-300" />
          <h3 class="text-lg font-bold text-white">
            AI Organizer Summary
          </h3>
        </div>
        <p class="text-sm leading-6 text-ink-300">
          {analytics.organizerSummary}
        </p>
      </div>
    </div>

    <div class="grid gap-5 lg:grid-cols-2">
      <div class="glass rounded-2xl border border-white/8 p-6">
        <div class="mb-5 flex items-center gap-2">
          <PieChart size={17} class="text-purple-300" />
          <h3 class="text-lg font-bold text-white">Top Skills</h3>
        </div>
        <div class="space-y-3">
          {#each analytics.topSkills as skill}
            <div
              class="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/4 px-4 py-3"
            >
              <p class="text-sm font-semibold text-white">
                {skill.label}
              </p>
              <span
                class="rounded-full bg-purple-400/15 px-2.5 py-1 text-[11px] font-bold text-purple-200"
              >
                {skill.count
                  ? `${skill.count} profile${skill.count === 1 ? "" : "s"}`
                  : "Waiting"}
              </span>
            </div>
          {/each}
        </div>
      </div>

      <div class="glass rounded-2xl border border-white/8 p-6">
        <div class="mb-5 flex items-center gap-2">
          <Target size={17} class="text-cyan-300" />
          <h3 class="text-lg font-bold text-white">
            Most Requested Networking Goals
          </h3>
        </div>
        <div class="space-y-3">
          {#each analytics.topGoals as goal}
            <div
              class="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/4 px-4 py-3"
            >
              <p class="text-sm font-semibold text-white">
                {goal.label}
              </p>
              <span
                class="rounded-full bg-cyan-400/15 px-2.5 py-1 text-[11px] font-bold text-cyan-200"
              >
                {goal.count
                  ? `${goal.count} mention${goal.count === 1 ? "" : "s"}`
                  : "Waiting"}
              </span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
{:else if isOrganizer}
  {#if loadError}
    <p role="alert">{loadError}</p>
    <Button onclick={loadAnalytics}>Retry</Button>
  {:else}
    <p role="status">Loading analytics…</p>
  {/if}
{:else}
  <div
    class="glass rounded-2xl border border-white/8 p-8 sm:p-10"
  >
    <div
      class="mx-auto grid max-w-4xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center"
    >
      <div class="relative mx-auto h-56 w-full max-w-xs">
        <div
          class="absolute inset-0 rounded-2xl border border-cyan-400/20 bg-cyan-400/8"
        ></div>
        <div
          class="absolute left-6 right-6 top-8 rounded-xl border border-white/10 bg-ink-950/70 p-4 shadow-glow-cyan"
        >
          <div class="mb-4 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <BarChart3 size={17} class="text-cyan-300" />
              <span
                class="text-xs font-bold uppercase tracking-widest text-cyan-200"
                >Analytics</span
              >
            </div>
            <span class="h-2 w-2 rounded-full bg-emerald-300"
            ></span>
          </div>
          <div class="space-y-3">
            <div
              class="h-2 w-3/4 rounded-full bg-amber-300/80"
            ></div>
            <div
              class="h-2 w-full rounded-full bg-cyan-300/70"
            ></div>
            <div
              class="h-2 w-1/2 rounded-full bg-emerald-300/70"
            ></div>
          </div>
        </div>
        <div
          class="absolute bottom-7 left-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10"
        >
          <LineChart size={34} class="text-amber-300" />
        </div>
        <div
          class="absolute bottom-8 right-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-400/10"
        >
          <PieChart size={28} class="text-purple-300" />
        </div>
      </div>

      <div class="text-center lg:text-left">
        <p
          class="mb-2 text-xs font-bold uppercase tracking-widest text-cyan-300"
        >
          Event insights
        </p>
        <h2 class="text-2xl font-black text-white">
          Organizer Analytics
        </h2>
        <p
          class="mx-auto mt-4 max-w-xl whitespace-pre-line text-sm leading-6 text-ink-300 lg:mx-0"
        >
          Detailed event analytics are only available to the event
          organizer. Create your own event to unlock organizer
          analytics and monitor participant engagement, AI
          matches, networking activity, and event insights.
        </p>
        <Button onclick={() => goto('/events/create')} class="mt-6 gap-2">
          <Plus size={16} />
          Create Event
        </Button>
      </div>
    </div>
  </div>
{/if}
