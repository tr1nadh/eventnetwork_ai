<script>
  import { goto } from '$app/navigation';
  import {
    ArrowRight,
    Brain,
    Sparkles,
    Users,
    MessageCircle,
    QrCode,
    Network,
    Zap,
    Target,
    LogIn,
    CheckCircle,
    ChevronRight
  } from '@lucide/svelte';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { Button } from '$lib/components/ui/button/index.js';
  import { demoEvent } from '$lib/demo';
  import { onMount } from 'svelte';

  export let data;

  const supabase = createSupabaseBrowserClient();

  let user = data.user;
  let signingIn = false;
  let error = '';
  let scrollY = 0;

  // Intersection observer for scroll animations
  let visibleSections = new Set();

  onMount(() => {
    const { data: authData } = supabase.auth.onAuthStateChange((_event, session) => {
      user = session?.user ?? null;
    });

    // Scroll observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleSections = new Set([...visibleSections, entry.target.dataset.section]);
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll('[data-section]').forEach((el) => observer.observe(el));

    // Counter animation
    animateCounters();

    return () => {
      authData.subscription.unsubscribe();
      observer.disconnect();
    };
  });

  function animateCounters() {
    const counters = document.querySelectorAll('[data-counter]');
    counters.forEach((el) => {
      const target = parseInt(el.dataset.counter);
      const duration = 2000;
      const start = performance.now();
      const update = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target).toLocaleString();
        if (progress < 1) requestAnimationFrame(update);
      };
      setTimeout(() => requestAnimationFrame(update), 600);
    });
  }

  async function signInWithGoogle() {
    signingIn = true;
    error = '';
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/events` }
    });
    if (authError) { error = authError.message; signingIn = false; }
  }

  const features = [
    {
      emoji: '✨',
      icon: Sparkles,
      title: 'Magic AI Profile Auto-Fill',
      desc: 'Generate a complete networking profile from a simple bio, LinkedIn summary, or free-form paragraph.',
      color: 'violet',
      border: 'border-violet-400/20',
      bg: 'bg-violet-400/5',
      glow: 'hover:shadow-[0_0_30px_rgba(167,139,250,0.15)]',
      iconColor: 'text-violet-300',
      iconBg: 'bg-violet-400/10'
    },
    {
      emoji: '🤖',
      icon: Brain,
      title: 'AI Semantic Matching',
      desc: 'Find the most relevant people at an event using semantic embeddings instead of keyword matching.',
      color: 'cyan',
      border: 'border-cyan-400/20',
      bg: 'bg-cyan-400/5',
      glow: 'hover:shadow-[0_0_30px_rgba(34,211,238,0.15)]',
      iconColor: 'text-cyan-300',
      iconBg: 'bg-cyan-400/10'
    },
    {
      emoji: '💡',
      icon: Zap,
      title: 'AI Match Insights',
      desc: 'Every recommendation includes an AI-generated explanation describing why the match is valuable.',
      color: 'amber',
      border: 'border-amber-400/20',
      bg: 'bg-amber-400/5',
      glow: 'hover:shadow-[0_0_30px_rgba(251,191,36,0.15)]',
      iconColor: 'text-amber-300',
      iconBg: 'bg-amber-400/10'
    },
    {
      emoji: '🤝',
      icon: Users,
      title: 'Smart Connections',
      desc: 'Send connection requests, manage accepted connections, and build meaningful professional relationships.',
      color: 'emerald',
      border: 'border-emerald-400/20',
      bg: 'bg-emerald-400/5',
      glow: 'hover:shadow-[0_0_30px_rgba(52,211,153,0.15)]',
      iconColor: 'text-emerald-300',
      iconBg: 'bg-emerald-400/10'
    },
    {
      emoji: '💬',
      icon: MessageCircle,
      title: 'Real-Time Chat',
      desc: 'Chat instantly with accepted connections without leaving the event platform.',
      color: 'blue',
      border: 'border-blue-400/20',
      bg: 'bg-blue-400/5',
      glow: 'hover:shadow-[0_0_30px_rgba(96,165,250,0.15)]',
      iconColor: 'text-blue-300',
      iconBg: 'bg-blue-400/10'
    },
    {
      emoji: '📱',
      icon: QrCode,
      title: 'QR Meet Confirmation',
      desc: 'Confirm real-world meetings by scanning each other\'s QR code. Track who you actually met.',
      color: 'pink',
      border: 'border-pink-400/20',
      bg: 'bg-pink-400/5',
      glow: 'hover:shadow-[0_0_30px_rgba(244,114,182,0.15)]',
      iconColor: 'text-pink-300',
      iconBg: 'bg-pink-400/10'
    }
  ];

  const steps = [
    { num: '01', title: 'Join Event', desc: 'Get the event link from the organizer and sign in with Google in one click.', color: 'amber' },
    { num: '02', title: 'AI Profile', desc: 'Paste your bio or LinkedIn — our AI generates your networking profile instantly.', color: 'violet' },
    { num: '03', title: 'AI Matches', desc: 'Semantic AI finds the most relevant people and explains each match.', color: 'cyan' },
    { num: '04', title: 'Connect', desc: 'Send connection requests to people you want to meet.', color: 'emerald' },
    { num: '05', title: 'Chat', desc: 'Message accepted connections directly inside the platform.', color: 'blue' },
    { num: '06', title: 'Meet', desc: 'Schedule an in-person conversation during the event.', color: 'pink' },
    { num: '07', title: 'Scan QR', desc: 'Confirm your real-world meeting by scanning each other\'s QR codes.', color: 'amber' },
    { num: '08', title: 'Grow Network', desc: 'Build lasting professional relationships that outlive the event.', color: 'violet' }
  ];

  const stats = [
    { value: 1247, label: 'AI Matches Generated', suffix: '+' },
    { value: 389, label: 'Connections Made', suffix: '+' },
    { value: 28, label: 'Events Hosted', suffix: '' },
    { value: 512, label: 'Profiles Created', suffix: '+' }
  ];

  const whyCards = [
    {
      emoji: '🎯',
      title: 'Better Networking',
      desc: 'Find people based on goals instead of random conversations. Every connection has a purpose.',
      color: 'amber',
      border: 'border-amber-400/20',
      bg: 'bg-amber-400/5'
    },
    {
      emoji: '⚡',
      title: 'AI Powered',
      desc: 'Semantic AI understands who you are and who you\'re looking for — beyond keywords.',
      color: 'cyan',
      border: 'border-cyan-400/20',
      bg: 'bg-cyan-400/5'
    },
    {
      emoji: '🤝',
      title: 'Meaningful Connections',
      desc: 'Build lasting professional relationships instead of collecting business cards.',
      color: 'violet',
      border: 'border-violet-400/20',
      bg: 'bg-violet-400/5'
    }
  ];

  const colorMap = {
    amber: 'text-amber-300',
    violet: 'text-violet-300',
    cyan: 'text-cyan-300',
    emerald: 'text-emerald-300',
    blue: 'text-blue-300',
    pink: 'text-pink-300'
  };
  const bgColorMap = {
    amber: 'bg-amber-400/10 border-amber-400/20',
    violet: 'bg-violet-400/10 border-violet-400/20',
    cyan: 'bg-cyan-400/10 border-cyan-400/20',
    emerald: 'bg-emerald-400/10 border-emerald-400/20',
    blue: 'bg-blue-400/10 border-blue-400/20',
    pink: 'bg-pink-400/10 border-pink-400/20'
  };
</script>

<svelte:head>
  <title>EventNetwork AI — AI-Powered Networking for Offline Events</title>
  <meta name="description" content="AI-powered networking for hackathons, conferences, and meetups. Semantic matching finds the right people. Built for AMD Developer Hackathon: ACT II." />
</svelte:head>

<svelte:window bind:scrollY />

<div class="relative min-h-screen bg-ink-950 text-ink-50 overflow-x-hidden">

  <!-- ─── Ambient Background ─── -->
  <div class="pointer-events-none fixed inset-0 z-0" aria-hidden="true" style="background:
    radial-gradient(ellipse 80% 60% at 10% 5%, rgba(250,204,21,0.10) 0%, transparent 55%),
    radial-gradient(ellipse 70% 55% at 90% 10%, rgba(34,211,238,0.09) 0%, transparent 50%),
    radial-gradient(ellipse 60% 70% at 50% 100%, rgba(99,102,241,0.07) 0%, transparent 55%),
    radial-gradient(ellipse 40% 40% at 80% 70%, rgba(167,139,250,0.05) 0%, transparent 50%),
    linear-gradient(180deg, #050816 0%, #060c1a 100%)">
  </div>
  <!-- Dot grid -->
  <div class="pointer-events-none fixed inset-0 z-0 opacity-[0.18]" aria-hidden="true"
    style="background-image: var(--background-image-radial-grid); background-size: 24px 24px;">
  </div>

  <div class="relative z-10">

    <!-- ─── NAVBAR ─── -->
    <header class="sticky top-0 z-50 transition-all duration-300" class:navbar-blur={scrollY > 20}>
      <nav class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
        <!-- Logo -->
        <a href="/" class="flex items-center gap-3 group">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950 shadow-glow transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_0_2px_rgba(250,204,21,0.4),_0_8px_24px_rgba(250,204,21,0.25)]">
            <Sparkles size={17} />
          </div>
          <span class="hidden sm:block text-sm font-bold tracking-wider text-white">EventNetwork <span class="text-amber-300">AI</span></span>
        </a>

        <!-- Nav links -->
        <div class="hidden md:flex items-center gap-1">
          <a href="#features" class="px-3 py-1.5 text-sm text-ink-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">Features</a>
          <a href="#how-it-works" class="px-3 py-1.5 text-sm text-ink-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">How It Works</a>
          <a href="#about" class="px-3 py-1.5 text-sm text-ink-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">About</a>
        </div>

        <!-- CTA buttons -->
        <div class="flex items-center gap-2">
          <button
            onclick={signInWithGoogle}
            class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-ink-300 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            Login
          </button>
          <button
            id="nav-get-started-btn"
            onclick={signInWithGoogle}
            disabled={signingIn}
            class="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-amber-400 text-slate-950 rounded-xl hover:bg-amber-300 transition-all duration-200 shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:shadow-[0_0_30px_rgba(250,204,21,0.5)] disabled:opacity-60"
          >
            {#if signingIn}
              <span class="h-3.5 w-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></span>
              Redirecting…
            {:else}
              Get Started
              <ChevronRight size={14} />
            {/if}
          </button>
        </div>
      </nav>
    </header>

    <!-- ─── HERO SECTION ─── -->
    <section class="relative pt-16 pb-24 sm:pt-20 sm:pb-32 px-5 sm:px-6 lg:px-8 overflow-hidden">
      <div class="mx-auto max-w-7xl">
        <div class="flex flex-col items-center text-center space-y-8 animate-slide-up">

          <!-- Badge row -->
          <div class="flex flex-wrap items-center justify-center gap-3">
            <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-amber-400/10 border border-amber-400/25 text-amber-300">
              <span class="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              Powered by AMD AI
            </span>
            <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-ink-400">
              🏆 AMD Developer Hackathon: ACT II
            </span>
          </div>

          <!-- Headline -->
          <div class="space-y-4 max-w-4xl">
            <h1 class="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.06]">
              Network Smarter<br/>
              <span class="gradient-text">with AI</span>
            </h1>
            <p class="text-lg sm:text-xl leading-relaxed text-ink-300 max-w-2xl mx-auto">
              Helping attendees discover the right people at conferences, hackathons, meetups, and networking events using AI-powered semantic matching.
            </p>
          </div>

          <!-- CTAs -->
          <div class="flex flex-wrap items-center justify-center gap-4">
            <button
              id="hero-get-started-btn"
              onclick={signInWithGoogle}
              disabled={signingIn}
              class="group flex items-center gap-2.5 px-7 py-3.5 text-base font-bold bg-amber-400 text-slate-950 rounded-2xl hover:bg-amber-300 transition-all duration-200 shadow-[0_0_30px_rgba(250,204,21,0.35)] hover:shadow-[0_0_50px_rgba(250,204,21,0.55)] disabled:opacity-60"
            >
              {#if signingIn}
                <span class="h-4 w-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></span>
                Redirecting…
              {:else}
                <LogIn size={18} />
                Get Started
                <ArrowRight size={16} class="group-hover:translate-x-0.5 transition-transform" />
              {/if}
            </button>
            <button
              id="hero-demo-btn"
              onclick={() => goto(`/event/${demoEvent.slug}`)}
              class="group flex items-center gap-2.5 px-7 py-3.5 text-base font-semibold glass rounded-2xl hover:bg-white/8 transition-all duration-200 text-ink-200 hover:text-white border border-white/10 hover:border-white/20"
            >
              Explore Demo
              <ArrowRight size={16} class="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <!-- Social proof hint -->
          <p class="text-sm text-ink-500">
            No setup required · Sign in with Google · Free to try
          </p>
        </div>

        <!-- ─── Hero AI Visualization ─── -->
        <div class="mt-20 relative hidden sm:block" data-section="hero-vis">
          <div class="relative mx-auto max-w-3xl">
            <!-- Central glow -->
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div class="h-64 w-64 rounded-full bg-amber-400/8 blur-3xl"></div>
              <div class="absolute h-48 w-48 rounded-full bg-cyan-400/8 blur-2xl translate-x-24"></div>
              <div class="absolute h-48 w-48 rounded-full bg-violet-400/8 blur-2xl -translate-x-24"></div>
            </div>

            <!-- Network nodes visualization -->
            <div class="relative h-80 flex items-center justify-center">

              <!-- Central AI node -->
              <div class="absolute z-10 flex flex-col items-center animate-float">
                <div class="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 shadow-[0_0_40px_rgba(250,204,21,0.5)]">
                  <Brain size={36} />
                </div>
                <span class="mt-2 text-xs font-bold text-amber-300 uppercase tracking-widest">Semantic AI</span>
              </div>

              <!-- Orbiting person nodes -->
              {#each [
                { name: 'Aarav M.', role: 'ML Engineer', angle: -120, dist: 130, color: 'cyan', delay: '0s' },
                { name: 'Sara K.', role: 'Founder', angle: -60, dist: 140, color: 'violet', delay: '0.3s' },
                { name: 'Nikhil R.', role: 'Designer', angle: 0, dist: 130, color: 'emerald', delay: '0.6s' },
                { name: 'Maya I.', role: 'Engineer', angle: 60, dist: 140, color: 'pink', delay: '0.9s' },
                { name: 'Rohit P.', role: 'Investor', angle: 120, dist: 130, color: 'blue', delay: '1.2s' },
                { name: 'Priya S.', role: 'Product', angle: 180, dist: 140, color: 'amber', delay: '1.5s' }
              ] as node}
                {@const rad = (node.angle * Math.PI) / 180}
                {@const x = Math.cos(rad) * node.dist}
                {@const y = Math.sin(rad) * node.dist}
                <!-- Connection line -->
                <div class="absolute top-1/2 left-1/2 h-px opacity-20 origin-left"
                  style="width: {node.dist}px; transform: translate(-50%, -50%) rotate({node.angle}deg); background: linear-gradient(90deg, rgba(250,204,21,0.6), transparent);">
                </div>
                <!-- Node -->
                <div class="absolute glass rounded-xl px-3 py-2 border text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-default animate-float-node"
                  style="
                    left: calc(50% + {x}px);
                    top: calc(50% + {y}px);
                    transform: translate(-50%, -50%);
                    border-color: rgba(255,255,255,0.12);
                    animation-delay: {node.delay};
                  "
                >
                  <div class="text-xs font-bold text-white">{node.name}</div>
                  <div class="text-[10px] text-ink-400">{node.role}</div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── FEATURES SECTION ─── -->
    <section id="features" class="py-24 px-5 sm:px-6 lg:px-8" data-section="features">
      <div class="mx-auto max-w-7xl">

        <!-- Section header -->
        <div class="text-center mb-16 space-y-4">
          <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-cyan-400/10 border border-cyan-400/20 text-cyan-300">
            <Zap size={12} />
            Features
          </span>
          <h2 class="text-4xl sm:text-5xl font-black text-white">
            Everything you need to<br/><span class="gradient-text">network smarter</span>
          </h2>
          <p class="text-ink-400 max-w-xl mx-auto text-lg">
            From AI profile generation to QR-confirmed meetings — a complete networking journey.
          </p>
        </div>

        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {#each features as feature, i}
            <div
              class="group relative card-hover rounded-2xl p-6 border {feature.border} {feature.bg} {feature.glow} transition-all duration-300 animate-slide-up"
              style="animation-delay: {i * 0.07}s"
            >
              <!-- Icon -->
              <div class="flex h-12 w-12 items-center justify-center rounded-xl {feature.iconBg} mb-5 group-hover:scale-110 transition-transform duration-300">
                <svelte:component this={feature.icon} size={22} class="{feature.iconColor}" />
              </div>
              <!-- Content -->
              <h3 class="text-base font-bold text-white mb-2">{feature.emoji} {feature.title}</h3>
              <p class="text-sm leading-6 text-ink-400">{feature.desc}</p>

              <!-- Hover accent line -->
              <div class="absolute bottom-0 left-0 h-0.5 w-0 rounded-b-2xl group-hover:w-full transition-all duration-500 bg-gradient-to-r from-transparent via-current to-transparent {feature.iconColor} opacity-40"></div>
            </div>
          {/each}
        </div>
      </div>
    </section>

    <!-- ─── HOW IT WORKS ─── -->
    <section id="how-it-works" class="py-24 px-5 sm:px-6 lg:px-8" data-section="how-it-works">
      <div class="mx-auto max-w-7xl">

        <div class="text-center mb-16 space-y-4">
          <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-violet-400/10 border border-violet-400/20 text-violet-300">
            <Network size={12} />
            How It Works
          </span>
          <h2 class="text-4xl sm:text-5xl font-black text-white">
            From joining to<br/><span class="gradient-text">growing your network</span>
          </h2>
        </div>

        <!-- Steps grid -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {#each steps as step, i}
            <div
              class="group glass rounded-2xl p-5 border border-white/8 hover:border-white/15 transition-all duration-300 hover:-translate-y-1 animate-slide-up"
              style="animation-delay: {i * 0.08}s"
            >
              <!-- Step number -->
              <div class="flex items-center gap-3 mb-4">
                <span class="text-3xl font-black {colorMap[step.color]} opacity-30 group-hover:opacity-60 transition-opacity">{step.num}</span>
                <div class="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
              </div>
              <h3 class="text-sm font-bold text-white mb-2">{step.title}</h3>
              <p class="text-xs leading-5 text-ink-400">{step.desc}</p>

              <!-- Bottom connector arrow (except last) -->
              {#if i < steps.length - 1}
                <div class="mt-4 flex justify-center lg:hidden">
                  <div class="h-4 w-px bg-gradient-to-b from-white/20 to-transparent"></div>
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <!-- CTA below steps -->
        <div class="mt-12 text-center">
          <button
            onclick={signInWithGoogle}
            class="group inline-flex items-center gap-2.5 px-7 py-3.5 text-base font-bold bg-amber-400 text-slate-950 rounded-2xl hover:bg-amber-300 transition-all duration-200 shadow-[0_0_30px_rgba(250,204,21,0.3)] hover:shadow-[0_0_50px_rgba(250,204,21,0.5)]"
          >
            Start your journey
            <ArrowRight size={16} class="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </section>

    <!-- ─── STATS SECTION ─── -->
    <section class="py-20 px-5 sm:px-6 lg:px-8" data-section="stats">
      <div class="mx-auto max-w-7xl">
        <div class="glass rounded-3xl border border-white/8 p-10 sm:p-14"
          style="background: linear-gradient(135deg, rgba(250,204,21,0.04) 0%, rgba(34,211,238,0.03) 50%, rgba(99,102,241,0.03) 100%)">
          <div class="text-center mb-12">
            <h2 class="text-3xl font-black text-white">Growing every day</h2>
            <p class="text-ink-400 mt-2">Real impact at real events</p>
          </div>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {#each stats as stat, i}
              <div class="text-center">
                <div class="text-4xl sm:text-5xl font-black text-white mb-2">
                  <span data-counter="{stat.value}">0</span>{stat.suffix}
                </div>
                <p class="text-sm text-ink-400">{stat.label}</p>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </section>

    <!-- ─── WHY EVENTNETWORK AI ─── -->
    <section id="about" class="py-24 px-5 sm:px-6 lg:px-8" data-section="why">
      <div class="mx-auto max-w-7xl">

        <div class="text-center mb-16 space-y-4">
          <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-emerald-400/10 border border-emerald-400/20 text-emerald-300">
            <Target size={12} />
            Why EventNetwork AI
          </span>
          <h2 class="text-4xl sm:text-5xl font-black text-white">
            Networking that<br/><span class="gradient-text">actually works</span>
          </h2>
        </div>

        <div class="grid gap-6 sm:grid-cols-3">
          {#each whyCards as card, i}
            <div
              class="card-hover rounded-2xl p-8 border {card.border} {card.bg} text-center animate-slide-up"
              style="animation-delay: {i * 0.1}s"
            >
              <div class="text-5xl mb-6">{card.emoji}</div>
              <h3 class="text-xl font-bold text-white mb-3">{card.title}</h3>
              <p class="text-sm leading-6 text-ink-400">{card.desc}</p>
            </div>
          {/each}
        </div>
      </div>
    </section>

    <!-- ─── SCREENSHOTS / DEMO PREVIEW ─── -->
    <section class="py-20 px-5 sm:px-6 lg:px-8" data-section="screenshots">
      <div class="mx-auto max-w-7xl">
        <div class="text-center mb-12 space-y-4">
          <h2 class="text-3xl sm:text-4xl font-black text-white">See it in action</h2>
          <p class="text-ink-400">Preview the live demo event or sign in to create your own.</p>
        </div>

        <!-- Mock UI cards -->
        <div class="grid gap-5 lg:grid-cols-2">
          <!-- Match card preview -->
          <div class="glass rounded-2xl overflow-hidden border border-white/10">
            <div class="h-0.5 bg-gradient-to-r from-amber-400 via-amber-300/50 to-transparent"></div>
            <div class="p-6 space-y-4">
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs font-bold uppercase tracking-widest text-amber-300">AI Match Card</p>
                <span class="px-2.5 py-1 text-[10px] font-bold rounded-full bg-amber-400/15 border border-amber-400/25 text-amber-300">87% Match</span>
              </div>
              <div class="flex items-start gap-4">
                <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-400/15 border border-cyan-400/20 text-lg">👤</div>
                <div>
                  <p class="font-bold text-white">Nikhil Rao</p>
                  <p class="text-xs text-ink-400 mt-0.5">ML Engineer at Orbit AI</p>
                </div>
              </div>
              <div class="rounded-xl border border-cyan-400/15 bg-cyan-400/6 p-4">
                <p class="text-[10px] font-bold uppercase tracking-widest text-cyan-300 mb-2">Why this match</p>
                <p class="text-sm leading-6 text-ink-300">
                  Both of you are building AI-powered products with a focus on matching and retrieval — Nikhil's expertise in semantic search directly complements your event-tech vision.
                </p>
              </div>
              <div class="flex gap-2">
                <div class="flex-1 py-2 text-center text-xs font-semibold rounded-lg bg-amber-400/15 text-amber-300 border border-amber-400/20">Connect</div>
                <div class="flex-1 py-2 text-center text-xs font-semibold rounded-lg bg-white/5 text-ink-400 border border-white/10">View Profile</div>
              </div>
            </div>
          </div>

          <!-- Connections preview -->
          <div class="glass rounded-2xl overflow-hidden border border-white/10">
            <div class="h-0.5 bg-gradient-to-r from-violet-400 via-cyan-400/60 to-transparent"></div>
            <div class="p-6 space-y-4">
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs font-bold uppercase tracking-widest text-violet-300">Your Connections</p>
                <span class="px-2.5 py-1 text-[10px] font-bold rounded-full bg-violet-400/15 border border-violet-400/25 text-violet-300">3 Connected</span>
              </div>
              {#each [
                { name: 'Sara Khan', role: 'Product Designer', status: 'Connected', met: true },
                { name: 'Maya Iyer', role: 'Community Manager', status: 'Connected', met: false },
                { name: 'Aarav Mehta', role: 'Frontend Engineer', status: 'Pending', met: false }
              ] as conn}
                <div class="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/8">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm">
                    {conn.name[0]}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-white truncate">{conn.name}</p>
                    <p class="text-xs text-ink-400 truncate">{conn.role}</p>
                  </div>
                  <div class="flex items-center gap-1.5">
                    {#if conn.met}
                      <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/20">Met ✓</span>
                    {:else if conn.status === 'Connected'}
                      <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-400/15 text-cyan-300 border border-cyan-400/20">Chat</span>
                    {:else}
                      <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-white/10 text-ink-400 border border-white/10">Pending</span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>

        <div class="mt-8 text-center">
          <button
            onclick={() => goto(`/event/${demoEvent.slug}`)}
            class="group inline-flex items-center gap-2 text-sm font-semibold text-amber-300 hover:text-amber-200 transition-colors"
          >
            View full demo event
            <ArrowRight size={14} class="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </section>

    <!-- ─── FINAL CTA ─── -->
    <section class="py-24 px-5 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-3xl text-center">
        <div class="glass rounded-3xl border border-amber-400/15 p-12 sm:p-16 relative overflow-hidden"
          style="background: linear-gradient(135deg, rgba(250,204,21,0.06) 0%, rgba(34,211,238,0.04) 100%)">
          <!-- Background glow -->
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="h-64 w-64 rounded-full bg-amber-400/10 blur-3xl"></div>
          </div>
          <div class="relative space-y-6">
            <div class="text-5xl">🚀</div>
            <h2 class="text-4xl sm:text-5xl font-black text-white">
              Ready to network<br/><span class="gradient-text">smarter?</span>
            </h2>
            <p class="text-lg text-ink-300 max-w-md mx-auto">
              Sign in with Google and start meeting the right people at your next event.
            </p>
            <button
              id="cta-get-started-btn"
              onclick={signInWithGoogle}
              disabled={signingIn}
              class="group inline-flex items-center gap-2.5 px-8 py-4 text-lg font-bold bg-amber-400 text-slate-950 rounded-2xl hover:bg-amber-300 transition-all duration-200 shadow-[0_0_40px_rgba(250,204,21,0.4)] hover:shadow-[0_0_60px_rgba(250,204,21,0.6)] disabled:opacity-60"
            >
              {#if signingIn}
                <span class="h-5 w-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></span>
                Redirecting…
              {:else}
                <LogIn size={20} />
                Get Started Free
                <ArrowRight size={18} class="group-hover:translate-x-0.5 transition-transform" />
              {/if}
            </button>
            {#if error}
              <p class="text-sm text-rose-400">{error}</p>
            {/if}
          </div>
        </div>
      </div>
    </section>

    <!-- ─── FOOTER ─── -->
    <footer class="border-t border-white/6 py-12 px-5 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-7xl">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-6">
          <!-- Logo + tagline -->
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-slate-950">
              <Sparkles size={14} />
            </div>
            <div>
              <p class="text-sm font-bold text-white">EventNetwork <span class="text-amber-300">AI</span></p>
              <p class="text-xs text-ink-500">AI-powered networking for offline events</p>
            </div>
          </div>

          <!-- Tech stack badges -->
          <div class="flex flex-wrap items-center justify-center gap-2">
            {#each ['AMD AI', 'Fireworks AI', 'Qwen3', 'Supabase', 'SvelteKit'] as tech}
              <span class="px-2.5 py-1 text-[10px] font-semibold rounded-full bg-white/5 border border-white/10 text-ink-400">
                {tech}
              </span>
            {/each}
          </div>
        </div>

        <div class="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p class="text-xs text-ink-600">© 2026 EventNetwork AI. Built for AMD Developer Hackathon: ACT II.</p>
          <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-400/8 border border-amber-400/20 text-amber-400">
            <span class="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            Powered by AMD AI
          </span>
        </div>
      </div>
    </footer>

  </div>
</div>

<style>
  .navbar-blur {
    background: rgba(5, 8, 22, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }

  @keyframes float-node {
    0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
    50% { transform: translate(-50%, -50%) translateY(-5px); }
  }

  :global(.animate-float) {
    animation: float 4s ease-in-out infinite;
  }

  :global(.animate-float-node) {
    animation: float-node 3s ease-in-out infinite;
  }
</style>
