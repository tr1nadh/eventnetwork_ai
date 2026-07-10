<script>
  import { BarChart3, Sparkles, TrendingUp, Users, MessageSquareMore, ArrowRight, MapPin } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Card } from '$lib/components/ui/card/index.js';
  import { organizerInsights } from '$lib/demo';
  import { goto } from '$app/navigation';

  const metricCards = [
    { label: 'Attendees joined', value: '112', detail: '86% Google sign-in completion', icon: Users },
    { label: 'Match requests', value: '418', detail: 'Average 3.7 per attendee', icon: MessageSquareMore },
    { label: 'Engagement lift', value: '+27%', detail: 'Compared with prior event run', icon: TrendingUp }
  ];
</script>

<svelte:head>
  <title>Organizer Dashboard | EventNetwork AI</title>
</svelte:head>

<main class="min-h-screen bg-[#050816] text-white">
  <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.16),_transparent_36%),radial-gradient(circle_at_85%_20%,_rgba(45,212,191,0.16),_transparent_32%),linear-gradient(180deg,_rgba(2,6,23,0.96),_rgba(2,6,23,1))]"></div>
  <section class="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <p class="text-sm uppercase tracking-[0.22em] text-amber-200">Organizer analytics</p>
        <h1 class="mt-2 text-3xl font-black">EventNetwork AI dashboard</h1>
      </div>
      <Button variant="secondary" onclick={() => goto('/')}>
        <ArrowRight size={16} class="rotate-180" />
        Home
      </Button>
    </div>

    <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div class="grid gap-4 md:grid-cols-3">
        {#each metricCards as card}
          <Card className="p-5">
            <svelte:component this={card.icon} size={18} class="text-amber-300" />
            <p class="mt-4 text-3xl font-black">{card.value}</p>
            <p class="mt-1 text-sm font-semibold">{card.label}</p>
            <p class="mt-2 text-sm text-slate-300">{card.detail}</p>
          </Card>
        {/each}
      </div>

      <Card>
        <div class="flex items-center gap-2 text-cyan-200">
          <BarChart3 size={18} />
          <p class="text-sm font-semibold uppercase tracking-[0.2em]">Live themes</p>
        </div>
        <div class="mt-5 space-y-4">
          {#each organizerInsights as insight}
            <div class="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <p class="text-sm text-slate-400">{insight.label}</p>
              <p class="mt-1 text-lg font-semibold">{insight.value}</p>
              <p class="mt-2 text-sm leading-6 text-slate-300">{insight.detail}</p>
            </div>
          {/each}
        </div>
      </Card>
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <Card>
        <div class="flex items-center gap-2 text-emerald-200">
          <Sparkles size={18} />
          <p class="text-sm font-semibold uppercase tracking-[0.2em]">What organizers get</p>
        </div>
        <ul class="mt-4 space-y-3 text-sm leading-6 text-slate-300">
          <li>- Real-time attendee interest clusters by role, topic, and intent.</li>
          <li>- Match heatmaps that show which participant groups need more introductions.</li>
          <li>- Engagement trends to understand which sessions drive networking.</li>
          <li>- Exportable summaries for post-event follow-up and sponsor reporting.</li>
        </ul>
      </Card>

      <Card>
        <div class="flex items-center gap-2 text-amber-200">
          <MapPin size={18} />
          <p class="text-sm font-semibold uppercase tracking-[0.2em]">Suggested next step</p>
        </div>
        <p class="mt-4 text-lg font-semibold">Connect this dashboard to your Supabase tables and live event pipeline.</p>
        <p class="mt-2 text-sm leading-6 text-slate-300">
          This screen is already aligned to the product. The next backend step is to persist events, attendee profiles,
          and match logs so organizer analytics can update in real time.
        </p>
      </Card>
    </div>
  </section>
</main>
