<script>
  import { BarChart3, Sparkles, TrendingUp, Users, MessageSquareMore, ArrowRight, MapPin, Zap, Target, Activity } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import PageShell from '$lib/components/page-shell.svelte';
  import { organizerInsights } from '$lib/demo';
  import { goto } from '$app/navigation';

  const metricCards = [
    {
      label: 'Attendees joined',
      value: '112',
      detail: '86% Google sign-in completion',
      icon: Users,
      color: 'amber',
      border: 'border-amber-400/20',
      bg: 'bg-amber-400/6',
      iconBg: 'bg-amber-400/12 border-amber-400/20',
      iconColor: 'text-amber-300',
      valueColor: 'text-amber-200'
    },
    {
      label: 'Match requests',
      value: '418',
      detail: 'Average 3.7 per attendee',
      icon: MessageSquareMore,
      color: 'cyan',
      border: 'border-cyan-400/20',
      bg: 'bg-cyan-400/6',
      iconBg: 'bg-cyan-400/12 border-cyan-400/20',
      iconColor: 'text-cyan-300',
      valueColor: 'text-cyan-200'
    },
    {
      label: 'Engagement lift',
      value: '+27%',
      detail: 'Compared with prior event run',
      icon: TrendingUp,
      color: 'emerald',
      border: 'border-emerald-400/20',
      bg: 'bg-emerald-400/6',
      iconBg: 'bg-emerald-400/12 border-emerald-400/20',
      iconColor: 'text-emerald-300',
      valueColor: 'text-emerald-200'
    }
  ];

  const benefits = [
    { icon: Target, text: 'Real-time attendee interest clusters by role, topic, and intent.' },
    { icon: BarChart3, text: 'Match heatmaps that show which participant groups need more introductions.' },
    { icon: Activity, text: 'Engagement trends to understand which sessions drive networking.' },
    { icon: Sparkles, text: 'Exportable summaries for post-event follow-up and sponsor reporting.' },
  ];
</script>

<svelte:head>
  <title>Organizer Dashboard | EventNetwork AI</title>
  <meta name="description" content="Live analytics and audience insights for your EventNetwork AI event." />
</svelte:head>

<PageShell>
  <main class="mx-auto max-w-7xl px-4 py-8 pb-20 sm:px-6 lg:px-8">

    <!-- Header -->
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-in">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.2em] text-violet-300 mb-1">Analytics</p>
        <h1 class="text-3xl font-black text-white">Organizer dashboard</h1>
        <p class="mt-1.5 text-sm text-ink-400">Live audience insights and engagement metrics.</p>
      </div>
      <Button variant="secondary" onclick={() => goto('/')} class="gap-2 shrink-0">
        <ArrowRight size={15} class="rotate-180" />
        Back to home
      </Button>
    </div>

    <!-- Metric cards -->
    <div class="grid gap-4 sm:grid-cols-3 mb-6 animate-slide-up">
      {#each metricCards as card}
        <div class="glass card-hover rounded-2xl p-6 border {card.border} {card.bg}">
          <div class="flex items-start justify-between mb-4">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl border {card.iconBg}">
              <svelte:component this={card.icon} size={18} class={card.iconColor} />
            </div>
            <span class="text-[10px] font-bold uppercase tracking-widest text-ink-600">Live</span>
          </div>
          <p class="text-4xl font-black {card.valueColor} mb-1">{card.value}</p>
          <p class="text-sm font-semibold text-white mb-1">{card.label}</p>
          <p class="text-xs text-ink-500 leading-5">{card.detail}</p>
        </div>
      {/each}
    </div>

    <div class="grid gap-6 lg:grid-cols-[1fr_280px] animate-slide-up-delay-1">

      <!-- Main content -->
      <div class="space-y-6">
        <!-- Live themes -->
        <div class="glass rounded-2xl border border-white/8 overflow-hidden">
          <div class="px-6 py-5 border-b border-white/8 flex items-center gap-2.5">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10 border border-cyan-400/20">
              <BarChart3 size={15} class="text-cyan-300" />
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-widest text-cyan-300">Live themes</p>
              <p class="text-[10px] text-ink-500">Updating as attendees join</p>
            </div>
            <!-- Pulse indicator -->
            <div class="ml-auto flex items-center gap-1.5">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span class="text-[10px] font-semibold text-emerald-400">Live</span>
            </div>
          </div>
          <div class="p-6 space-y-4">
            {#each organizerInsights as insight, i}
              <div class="glass rounded-xl p-4 border border-white/6 card-hover">
                <div class="flex items-center justify-between mb-2">
                  <p class="text-[10px] font-bold uppercase tracking-widest text-ink-500">{insight.label}</p>
                  <span class="text-[10px] text-ink-600">#{i + 1}</span>
                </div>
                <p class="text-lg font-bold text-white mb-1">{insight.value}</p>
                <p class="text-xs leading-5 text-ink-400">{insight.detail}</p>
                <!-- Visual bar -->
                <div class="mt-3 h-1 rounded-full bg-white/6">
                  <div
                    class="h-1 rounded-full bg-gradient-to-r from-amber-400 to-cyan-400"
                    style="width: {[72, 58, 45][i]}%"
                  ></div>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- What organizers get -->
        <div class="glass rounded-2xl border border-white/8 p-6">
          <div class="flex items-center gap-2 mb-5">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 border border-emerald-400/20">
              <Sparkles size={15} class="text-emerald-300" />
            </div>
            <p class="text-xs font-bold uppercase tracking-widest text-emerald-300">What organizers get</p>
          </div>
          <ul class="grid gap-3 sm:grid-cols-2">
            {#each benefits as b}
              <li class="flex items-start gap-3">
                <div class="mt-0.5 shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-white/6 border border-white/8">
                  <svelte:component this={b.icon} size={13} class="text-ink-400" />
                </div>
                <p class="text-xs leading-5 text-ink-300">{b.text}</p>
              </li>
            {/each}
          </ul>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="space-y-4 animate-slide-up-delay-2">
        <!-- Next step card -->
        <div class="glass rounded-2xl border border-amber-400/15 bg-amber-400/4 p-5">
          <div class="flex items-center gap-2 mb-3">
            <MapPin size={14} class="text-amber-300" />
            <p class="text-xs font-bold uppercase tracking-widest text-amber-300">Suggested next step</p>
          </div>
          <p class="text-sm font-semibold text-white mb-2">Connect to live Supabase tables</p>
          <p class="text-xs leading-5 text-ink-400">
            This dashboard is already aligned to the product. The next step is to persist events, attendee profiles, and match logs so analytics update in real time.
          </p>
        </div>

        <!-- Quick nav -->
        <div class="glass rounded-2xl border border-white/8 p-5">
          <p class="text-[10px] font-bold uppercase tracking-widest text-ink-500 mb-3">Quick navigation</p>
          <div class="space-y-2">
            <button onclick={() => goto('/events')} class="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm text-ink-300 transition hover:bg-white/6 hover:text-white">
              My events
              <ArrowRight size={13} class="text-ink-600" />
            </button>
            <button onclick={() => goto('/')} class="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm text-ink-300 transition hover:bg-white/6 hover:text-white">
              Home
              <ArrowRight size={13} class="text-ink-600" />
            </button>
          </div>
        </div>

        <!-- Stats summary -->
        <div class="glass rounded-2xl border border-white/8 p-5">
          <p class="text-[10px] font-bold uppercase tracking-widest text-ink-500 mb-4">Summary</p>
          <div class="space-y-3">
            {#each [
              { label: 'Total attendees', value: '112' },
              { label: 'Profiles completed', value: '96' },
              { label: 'Matches generated', value: '418' },
              { label: 'Avg. match score', value: '87%' },
            ] as row}
              <div class="flex items-center justify-between">
                <span class="text-xs text-ink-500">{row.label}</span>
                <span class="text-xs font-bold text-white">{row.value}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </main>
</PageShell>
