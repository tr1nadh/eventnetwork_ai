<script>
  import { fade } from "svelte/transition";
  import {
    Activity,
    Users,
    Calendar,
    ArrowRight,
    MapPin,
    Cpu,
    CheckCheck,
    CalendarClock,
  } from "@lucide/svelte";
  import PageShell from "$lib/components/page-shell.svelte";
  import Sidebar from "$lib/components/sidebar.svelte";
  import { createSupabaseBrowserClient } from "$lib/supabase/client";
  import { goto } from "$app/navigation";
  import { clearAllEventStores } from "$lib/stores/eventStore";
  import { clearAllChatStores } from "$lib/stores/chatStore";
  import { aiCreditsStore } from "$lib/stores/ai-credits";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";

  export let data;

  let signingOut = false;
  const supabase = createSupabaseBrowserClient();

  async function signOut() {
    signingOut = true;
    await supabase.auth.signOut();
    signingOut = false;
    clearAllEventStores();
    clearAllChatStores();
    await goto("/");
  }
</script>

<svelte:head>
  <title>Dashboard | Evenai</title>
</svelte:head>

<PageShell user={data.user}>
  <Sidebar user={data.user} {signingOut} onSignOut={signOut} />

  <div class="max-w-5xl mx-auto space-y-8 px-4 sm:px-6">
    <div class="flex items-center justify-between mt-8 animate-slide-up">
      <div>
        <h1 class="text-3xl font-black text-white">Dashboard</h1>
        <p class="text-sm text-slate-400 mt-1">
          Welcome back! Here's an overview of your activity.
        </p>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-up-delay-1">
      <!-- Total Events -->
      <div
        class="p-5 bg-[#111] border border-white/5 rounded-2xl flex items-center gap-4 hover:border-white/10 transition-colors"
      >
        <div
          class="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20"
        >
          <Calendar size={20} />
        </div>
        <div>
          <p class="text-sm text-slate-400 font-medium">Total Events</p>
          <p class="text-2xl font-bold text-white">{data.stats.totalEvents}</p>
        </div>
      </div>

      <!-- Total Connections -->
      <div
        class="p-5 bg-[#111] border border-white/5 rounded-2xl flex items-center gap-4 hover:border-white/10 transition-colors"
      >
        <div
          class="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20"
        >
          <Users size={20} />
        </div>
        <div>
          <p class="text-sm text-slate-400 font-medium">Connections</p>
          <p class="text-2xl font-bold text-white">
            {data.stats.totalConnections}
          </p>
        </div>
      </div>

      <!-- AI Credits -->
      <div
        class="p-5 bg-[#111] border border-white/5 rounded-2xl flex items-center gap-4 hover:border-white/10 transition-colors"
      >
        <div
          class="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20"
        >
          <Cpu size={20} />
        </div>
        <div>
          <p class="text-sm text-slate-400 font-medium">AI Credits</p>
          <p class="text-2xl font-bold text-white">
            {#if $aiCreditsStore.loading}
              ...
            {:else}
              {$aiCreditsStore.remaining} / {$aiCreditsStore.limit}
            {/if}
          </p>
        </div>
      </div>
    </div>

    <!-- Recent Events -->
    <div class="animate-slide-up-delay-2 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-white flex items-center gap-2">
          <Activity size={18} class="text-amber-400" />
          Recent Events
        </h2>
        <Button
          href="/events"
          variant="ghost"
          class="text-sm text-slate-400 hover:text-white h-8 px-3"
        >
          View all <ArrowRight size={14} class="ml-1.5" />
        </Button>
      </div>

      {#if data.recentEvents.length === 0}
        <div
          class="flex flex-col items-center justify-center py-16 border border-white/5 bg-[#111]/50 rounded-2xl text-center px-6"
        >
          <div
            class="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-slate-500"
          >
            <Calendar size={20} />
          </div>
          <h3 class="text-white font-medium mb-1">No events yet</h3>
          <p class="text-slate-400 text-sm mb-5">
            You haven't joined or created any events.
          </p>
          <Button
            href="/events"
            variant="outline"
            class="border-white/10 bg-[#111] hover:bg-white/5 text-white"
          >
            Events Events
          </Button>
        </div>
      {:else}
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each data.recentEvents as event}
            <div
              class="flex flex-col p-5 bg-[#111] border border-white/5 rounded-2xl hover:border-white/10 transition-colors h-full"
            >
              <div class="flex justify-between items-start mb-3">
                <Badge
                  variant="outline"
                  class={event.role === "organizer"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"}
                >
                  {event.role === "organizer" ? "Hosting" : "Joined"}
                </Badge>
                <span class="flex items-center gap-1 text-xs text-slate-500">
                  <CalendarClock size={12} />
                  {new Date(event.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>

              <h3 class="text-lg font-bold text-white mb-2 line-clamp-1">
                {event.name}
              </h3>
              <p class="text-sm text-slate-400 line-clamp-2 mb-4 flex-grow">
                {event.description || "No description provided."}
              </p>

              <Button
                href={`/event/${event.slug}`}
                variant="outline"
                class="w-full mt-auto border-white/10 bg-white/5 hover:bg-white/10 text-white group"
              >
                Go to Event
                <ArrowRight
                  size={14}
                  class="ml-2 group-hover:translate-x-1 transition-transform"
                />
              </Button>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</PageShell>
