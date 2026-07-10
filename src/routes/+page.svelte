<script>
  import { goto } from '$app/navigation';
  import {
    ArrowRight,
    ClipboardList,
    LogIn,
    MapPin,
    PartyPopper,
    ScanSearch,
    Sparkles,
    Users,
    ChartNoAxesCombined,
    Zap,
    Network,
    Brain
  } from '@lucide/svelte';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert/index.js';
  import Navbar from '$lib/components/navbar.svelte';
  import PageShell from '$lib/components/page-shell.svelte';
  import { demoEvent } from '$lib/demo';
  import { onMount } from 'svelte';

  export let data;

  const supabase = createSupabaseBrowserClient();

  let user = data.user;
  let signingIn = false;
  let signingOut = false;
  let error = '';

  onMount(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      user = session?.user ?? null;
    });
    return () => data.subscription.unsubscribe();
  });

  async function signInWithGoogle() {
    signingIn = true;
    error = '';
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/events` }
    });
    if (authError) { error = authError.message; signingIn = false; }
  }

  async function signOut() {
    signingOut = true;
    error = '';
    const { error: authError } = await supabase.auth.signOut();
    if (authError) error = authError.message;
    signingOut = false;
  }

  const features = [
    {
      icon: ClipboardList,
      label: 'Attendee profile',
      desc: 'Capture who they are, what they do, who they want to meet, and their expectations.',
      accent: 'amber',
      border: 'border-amber-400/20',
      bg: 'bg-amber-400/6',
      iconColor: 'text-amber-300'
    },
    {
      icon: Brain,
      label: 'AI match engine',
      desc: 'Rank people by intent, topic, and collaboration fit with semantic explanations.',
      accent: 'cyan',
      border: 'border-cyan-400/20',
      bg: 'bg-cyan-400/6',
      iconColor: 'text-cyan-300'
    },
    {
      icon: ChartNoAxesCombined,
      label: 'Organizer analytics',
      desc: 'See attendee interest clusters, match trends, and engagement data in real time.',
      accent: 'violet',
      border: 'border-violet-400/20',
      bg: 'bg-violet-400/6',
      iconColor: 'text-violet-300'
    }
  ];

  const steps = [
    { num: '01', title: 'Create event', desc: 'Organizer creates a private event and shares one unique link.' },
    { num: '02', title: 'Join with Google', desc: 'Attendees log in and fill out a short networking profile.' },
    { num: '03', title: 'Get AI matches', desc: 'AI ranks the most relevant people and explains why.' },
    { num: '04', title: 'Review analytics', desc: 'Organizers see audience themes and engagement trends live.' },
  ];
</script>

<svelte:head>
  <title>EventNetwork AI — AI-powered networking for offline events</title>
  <meta name="description" content="AI-powered networking for hackathons, conferences, and meetups. One link, Google sign-in, semantic match engine." />
</svelte:head>

<PageShell>
  <Navbar {user} {signingIn} {signingOut} onSignIn={signInWithGoogle} onSignOut={signOut} />

  <main class="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">

    <!-- ─── Hero ─── -->
    <section class="pt-6 pb-16 animate-fade-in">
      <div class="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">

        <!-- Left: headline + CTAs + feature cards -->
        <div class="space-y-8 animate-slide-up">
          <div class="space-y-5">
            <Badge variant="secondary" class="gap-2 px-4 py-2 text-sm border-amber-400/20 bg-amber-400/8 text-amber-200">
              <PartyPopper size={15} class="text-amber-400" />
              Built for hackathons, conferences &amp; meetups
            </Badge>

            <h1 class="max-w-2xl text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-[3.75rem] leading-[1.08]">
              Turn every event into a room full of&nbsp;<span class="gradient-text">useful introductions.</span>
            </h1>

            <p class="max-w-xl text-lg leading-relaxed text-ink-300">
              One private link. Google sign-in. A short networking profile. Then the AI finds the
              best people for each attendee and explains exactly why.
            </p>
          </div>

          <!-- CTAs -->
          <div class="flex flex-wrap gap-3">
            <Button
              id="sign-in-btn"
              onclick={signInWithGoogle}
              disabled={signingIn}
              class="gap-2 px-6 py-2.5 text-sm font-semibold"
            >
              <LogIn size={16} />
              {#if signingIn}Redirecting…{:else}Sign in to continue{/if}
            </Button>
            <Button
              id="preview-event-btn"
              variant="secondary"
              onclick={() => goto(`/event/${demoEvent.slug}`)}
              class="gap-2 px-6 py-2.5 text-sm font-semibold"
            >
              Preview event flow
              <ArrowRight size={16} />
            </Button>
          </div>

          <!-- Feature cards -->
          <div class="grid gap-3 sm:grid-cols-3 animate-slide-up-delay-1">
            {#each features as f}
              <div class="card-hover rounded-xl p-4 {f.border} {f.bg} border">
                <svelte:component this={f.icon} size={20} class="{f.iconColor} mb-3" />
                <p class="text-sm font-semibold text-white mb-1">{f.label}</p>
                <p class="text-xs leading-5 text-ink-400">{f.desc}</p>
              </div>
            {/each}
          </div>

          <!-- How it works -->
          <div class="glass rounded-2xl p-6 animate-slide-up-delay-2">
            <div class="flex items-center gap-2 mb-5">
              <Network size={16} class="text-emerald-400" />
              <p class="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">How it works</p>
            </div>
            <div class="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {#each steps as step}
                <div>
                  <p class="text-2xl font-black text-ink-700 mb-1">{step.num}</p>
                  <p class="text-sm font-semibold text-white mb-1">{step.title}</p>
                  <p class="text-xs leading-5 text-ink-400">{step.desc}</p>
                </div>
              {/each}
            </div>
          </div>

          {#if error}
            <Alert variant="destructive" class="max-w-xl">
              <AlertTitle>Authentication error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          {/if}
        </div>

        <!-- Right: Demo event card -->
        <div class="animate-slide-up-delay-1 lg:sticky lg:top-28">
          <div class="glass rounded-2xl overflow-hidden border border-white/8 shadow-glow">
            <!-- Card header -->
            <div class="px-6 py-5 border-b border-white/8 bg-gradient-to-r from-amber-400/8 to-transparent">
              <Badge variant="secondary" class="mb-3 gap-2 border-amber-400/25 bg-amber-400/10 text-amber-200 text-xs font-bold uppercase tracking-widest">
                <Sparkles size={12} />
                Demo event
              </Badge>
              <h2 class="text-2xl font-black text-white">{demoEvent.name}</h2>
            </div>

            <!-- Card body -->
            <div class="p-6 space-y-5">
              <p class="text-sm leading-6 text-ink-300">{demoEvent.description}</p>

              <div class="grid grid-cols-2 gap-3">
                <div class="glass rounded-xl p-3">
                  <p class="text-[10px] uppercase tracking-widest text-ink-500 mb-1.5">Location</p>
                  <p class="flex items-center gap-1.5 text-sm font-semibold text-white">
                    <MapPin size={13} class="text-amber-400 shrink-0" />
                    {demoEvent.city}
                  </p>
                </div>
                <div class="glass rounded-xl p-3">
                  <p class="text-[10px] uppercase tracking-widest text-ink-500 mb-1.5">Date</p>
                  <p class="text-sm font-semibold text-white">{demoEvent.date}</p>
                </div>
                <div class="glass rounded-xl p-3 col-span-2">
                  <p class="text-[10px] uppercase tracking-widest text-ink-500 mb-1.5">Format</p>
                  <p class="flex items-center gap-1.5 text-sm font-semibold text-white">
                    <Users size={13} class="text-cyan-400 shrink-0" />
                    {demoEvent.format}
                  </p>
                </div>
              </div>

              <!-- Flow steps -->
              <div class="glass rounded-xl p-4">
                <p class="text-[10px] font-bold uppercase tracking-widest text-cyan-300 mb-3">Attendee flow</p>
                <ol class="space-y-2.5">
                  {#each [
                    'Organizer creates event & shares a unique link.',
                    'Attendee signs in with Google and completes a short profile.',
                    'AI surfaces the most relevant connections with explanations.',
                    'Organizer sees live audience insights and networking trends.'
                  ] as step, i}
                    <li class="flex items-start gap-3 text-sm text-ink-300">
                      <span class="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-white/8 text-[10px] font-bold text-ink-400 mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  {/each}
                </ol>
              </div>

              <!-- Auth status -->
              <div class="rounded-xl border {user ? 'border-emerald-400/20 bg-emerald-400/6' : 'border-white/8 bg-white/4'} p-4">
                <p class="text-[10px] font-bold uppercase tracking-widest {user ? 'text-emerald-400' : 'text-ink-500'} mb-1">
                  {user ? 'Signed in' : 'Status'}
                </p>
                <p class="text-sm font-semibold text-white">
                  {#if user}Welcome back, {user.email}{:else}Google sign-in ready{/if}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</PageShell>
