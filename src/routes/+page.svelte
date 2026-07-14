<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import {
    ArrowRight,
    Bell,
    Brain,
    Cpu,
    Handshake,
    LayoutDashboard,
    LogIn,
    MapPinned,
    MessageCircle,
    MessagesSquare,
    Network,
    Radio,
    Route,
    ScanSearch,
    ShieldCheck,
    Sparkles,
    UserRoundPlus,
    WandSparkles
  } from '@lucide/svelte';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import AmdAiBadge from '$lib/components/amd-ai-badge.svelte';

  export let data;

  const supabase = createSupabaseBrowserClient();

  let user = data.user;
  let signingIn = false;
  let error = '';
  let scrollY = 0;
  let visibleSections = new Set();
  let mouse = { x: 0, y: 0 };
  let organizerCountersStarted = false;
  let whyCountersStarted = false;

  const heroNodes = [
    { name: 'Founder', role: 'Needs AI talent', x: 12, y: 24, delay: '0s' },
    { name: 'Engineer', role: 'Looking for teams', x: 68, y: 16, delay: '0.25s' },
    { name: 'Mentor', role: 'Guides builders', x: 82, y: 54, delay: '0.5s' },
    { name: 'Designer', role: 'Ships product UX', x: 20, y: 68, delay: '0.75s' },
    { name: 'Investor', role: 'Finds signal early', x: 56, y: 76, delay: '1s' }
  ];

  const features = [
    {
      icon: WandSparkles,
      title: 'AI Profile Auto-Fill',
      desc: 'Paste your LinkedIn profile, resume, or free-form text and let AI generate a structured networking profile.',
      tint: 'amber'
    },
    {
      icon: Brain,
      title: 'Semantic AI Matching',
      desc: 'Vector embeddings understand who you are and who you are looking for to recommend highly relevant people.',
      tint: 'cyan'
    },
    {
      icon: ScanSearch,
      title: 'AI Match Insights',
      desc: 'Every match includes AI-generated shared interests, complementary skills, and collaboration opportunities.',
      tint: 'violet'
    },
    {
      icon: Handshake,
      title: 'Smart Connections',
      desc: 'Send, accept, reject, and manage connection requests with an intuitive networking workflow.',
      tint: 'emerald'
    },
    {
      icon: Radio,
      title: 'Real-Time Connection Requests',
      desc: 'Receive connection requests instantly without refreshing the page using Supabase Realtime.',
      tint: 'cyan'
    },
    {
      icon: Bell,
      title: 'Browser Notifications',
      desc: 'Get instant browser notifications whenever someone sends or accepts a connection request.',
      tint: 'pink'
    },
    {
      icon: MessageCircle,
      title: 'Real-Time Chat',
      desc: 'Connected attendees can chat instantly during the event to coordinate meetings.',
      tint: 'blue'
    },
    {
      icon: Brain,
      title: 'AI Meeting Preparation',
      desc: 'Receive personalized questions, discussion ideas, and collaboration topics before meeting.',
      tint: 'blue'
    },
    {
      icon: MapPinned,
      title: 'Interactive 2D Venue',
      desc: 'Explore an interactive venue while organizers visually customize the event layout.',
      tint: 'cyan'
    },
    {
      icon: ShieldCheck,
      title: 'Event Management',
      desc: 'Create, edit, delete, and manage networking events with a simple organizer experience.',
      tint: 'emerald'
    },
    {
      icon: LayoutDashboard,
      title: 'Organizer Analytics',
      desc: 'Track registrations, matches, requests, accepted connections, and networking activity.',
      tint: 'violet'
    }
  ];

  const timelineSteps = [
    'Join Event',
    'AI Profile Auto-create',
    'Generate Embeddings',
    'Semantic Match Search',
    'AI Match Analysis',
    'Connect',
    'Real-Time Chat',
    'Generate Icebreakers',
    'Meet'
  ];

  const techChips = [
    { icon: Brain, label: 'Qwen3.7 Plus', detail: 'Profile generation, match explanations, meeting preparation, and personalized icebreakers.' },
    { icon: Network, label: 'Qwen3 Embedding 8B', detail: 'Generates semantic embeddings for intelligent participant matching.' },
    { icon: Cpu, label: 'Fireworks AI', detail: 'Provides scalable inference for AI-powered features.' },
    { icon: Sparkles, label: 'AMD AI Ecosystem', detail: 'Built for the AMD Developer Hackathon, leveraging AMD AI momentum.' }
  ];

  const organizerMetrics = [
    { label: 'Total Participants', value: 148, suffix: '' },
    { label: 'AI Matches', value: 426, suffix: '' },
    { label: 'Connection Requests', value: 219, suffix: '' },
    { label: 'Accepted Connections', value: 132, suffix: '' },
    { label: 'Active Conversations', value: 84, suffix: '' },
    { label: 'Networking Analytics', value: 92, suffix: '%' },
    { label: 'Interactive Venue Management', value: 7, suffix: ' zones' }
  ];

  let animatedMetrics = organizerMetrics.map(() => 0);

  const whyStats = [
    { value: 95, suffix: '%', label: 'Better Networking Quality' },
    { value: 100, suffix: '%', label: 'AI Powered Matching' },
    { value: 24, suffix: '/7', label: 'Real-Time Collaboration' },
    { value: 10, suffix: 'x', label: 'Meaningful Professional Connections' }
  ];

  let animatedWhyStats = whyStats.map(() => 0);

  const testimonials = [
    {
      name: 'Ananya Rao',
      role: 'Hackathon Organizer',
      quote: 'The matching explanations made networking feel intentional instead of random. Attendees knew exactly who to meet next.',
      initials: 'AR'
    },
    {
      name: 'Kabir Menon',
      role: 'AI Startup Founder',
      quote: 'I found two relevant collaborators in the first hour. The AI icebreakers made the conversations much sharper.',
      initials: 'KM'
    },
    {
      name: 'Meera Shah',
      role: 'Product Designer',
      quote: 'The venue map and live connection flow helped me move through the event with confidence and purpose.',
      initials: 'MS'
    }
  ];

  const tintClasses = {
    amber: {
      icon: 'text-amber-400',
      bg: 'bg-amber-400/10',
      border: 'border-amber-400/20',
      glow: 'group-hover:shadow-[0_18px_46px_rgba(251,191,36,0.14)]'
    },
    cyan: {
      icon: 'text-cyan-400',
      bg: 'bg-cyan-400/10',
      border: 'border-cyan-400/20',
      glow: 'group-hover:shadow-[0_18px_46px_rgba(34,211,238,0.14)]'
    },
    violet: {
      icon: 'text-violet-400',
      bg: 'bg-violet-400/10',
      border: 'border-violet-400/20',
      glow: 'group-hover:shadow-[0_18px_46px_rgba(167,139,250,0.14)]'
    },
    emerald: {
      icon: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      border: 'border-emerald-400/20',
      glow: 'group-hover:shadow-[0_18px_46px_rgba(52,211,153,0.14)]'
    },
    pink: {
      icon: 'text-pink-400',
      bg: 'bg-pink-400/10',
      border: 'border-pink-400/20',
      glow: 'group-hover:shadow-[0_18px_46px_rgba(244,114,182,0.14)]'
    },
    blue: {
      icon: 'text-blue-400',
      bg: 'bg-blue-400/10',
      border: 'border-blue-400/20',
      glow: 'group-hover:shadow-[0_18px_46px_rgba(96,165,250,0.14)]'
    }
  };

  onMount(() => {
    const { data: authData } = supabase.auth.onAuthStateChange((_event, session) => {
      user = session?.user ?? null;
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const section = entry.target.dataset.section;
          visibleSections = new Set([...visibleSections, section]);
          visibleSections = visibleSections;

          if (section === 'organizer' && !organizerCountersStarted) {
            organizerCountersStarted = true;
            startOrganizerCounters();
          }

          if (section === 'why' && !whyCountersStarted) {
            whyCountersStarted = true;
            startWhyCounters();
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -5% 0px' }
    );

    document.querySelectorAll('[data-section]').forEach((el) => observer.observe(el));

    const onPointerMove = (event) => {
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;
      mouse = {
        x: (event.clientX / width - 0.5) * 14,
        y: (event.clientY / height - 0.5) * 14
      };
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });

    return () => {
      authData.subscription.unsubscribe();
      observer.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
    };
  });

  function isVisible(section) {
    return visibleSections.has(section);
  }

  function startOrganizerCounters() {
    const duration = 1300;
    const startedAt = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      animatedMetrics = organizerMetrics.map((metric) => Math.round(metric.value * eased));

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }

  function startWhyCounters() {
    const duration = 1200;
    const startedAt = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      animatedWhyStats = whyStats.map((stat) => Math.round(stat.value * eased));

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }

  async function signInWithGoogle() {
    signingIn = true;
    error = '';

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });

    if (authError) {
      error = authError.message;
      signingIn = false;
    }
  }

  function goToPrimaryAction() {
    if (user) {
      goto('/events/create');
      return;
    }

    signInWithGoogle();
  }
</script>

<svelte:head>
  <title>EventNetwork AI | AI-Powered Networking</title>
  <meta name="description" content="AI-powered semantic matching to help attendees discover meaningful professional connections at events." />
</svelte:head>

<svelte:window bind:scrollY />

<div class="app-container bg-[#0a0a0a] text-slate-200 min-h-screen selection:bg-amber-500/30 selection:text-amber-100 font-sans">
  
  <!-- Subtle ambient background -->
  <div class="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/10 via-[#0a0a0a] to-[#0a0a0a]"></div>
  
  <div class="relative z-10 flex flex-col min-h-screen">
    
    <!-- Navbar -->
    <header class="fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b border-transparent" class:scrolled-nav={scrollY > 20}>
      <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" class="flex items-center gap-2 group">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black shadow-[0_0_15px_rgba(251,191,36,0.3)] transition-transform group-hover:scale-105">
            <Sparkles size={16} />
          </div>
          <span class="font-semibold text-sm tracking-wide text-slate-100">EventNetwork <span class="text-amber-400">AI</span></span>
        </a>
        <nav class="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <a href="#features" class="hover:text-slate-100 transition-colors">Features</a>
          <a href="#workflow" class="hover:text-slate-100 transition-colors">Workflow</a>
          <a href="#organizers" class="hover:text-slate-100 transition-colors">Organizers</a>
          <a href="#tech" class="hover:text-slate-100 transition-colors">AI Stack</a>
        </nav>
        <div class="flex items-center gap-4">
          <button onclick={signInWithGoogle} class="text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors hidden sm:block">Login</button>
          <button onclick={goToPrimaryAction} disabled={signingIn} class="h-9 px-4 rounded-full bg-slate-100 text-black text-sm font-medium hover:bg-white transition-colors flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            {#if signingIn}
              <span class="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
            {:else}
              Get Started
            {/if}
          </button>
        </div>
      </div>
    </header>

    <main class="flex-grow flex flex-col items-center w-full">
      
      <!-- HERO -->
      <section class="w-full max-w-6xl mx-auto px-6 pt-40 pb-32 flex flex-col items-center text-center relative">
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none z-0"></div>
        
        <div class="relative z-10 flex flex-col items-center animate-fade-in-up">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-300 text-xs font-medium mb-8 backdrop-blur-sm shadow-[0_0_15px_rgba(251,191,36,0.1)]">
            <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            ⚡ Powered by AMD AI
          </div>
          
          <h1 class="text-5xl md:text-7xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 max-w-4xl leading-[1.1]">
            Meet the Right People,<br/>Not Just More People.
          </h1>
          
          <p class="mt-8 text-lg md:text-xl text-slate-400 max-w-2xl font-light">
            EventNetwork AI uses AI-powered semantic matching to help attendees discover meaningful professional connections at hackathons, conferences, meetups, and networking events.
          </p>
          
          <div class="mt-10 flex flex-col sm:flex-row items-center gap-4">
            <button onclick={goToPrimaryAction} class="h-12 px-8 rounded-full bg-white text-black font-semibold flex items-center gap-2 hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              Get Started <ArrowRight size={18} />
            </button>
            <a href="#features" class="h-12 px-8 rounded-full border border-slate-700 bg-slate-900/50 text-slate-300 font-medium flex items-center gap-2 hover:bg-slate-800 transition-colors backdrop-blur-md">
              Explore Features
            </a>
          </div>
        </div>

        <!-- Hero Illustration -->
        <div class="mt-24 w-full relative z-10 h-[400px] rounded-2xl border border-white/10 bg-black backdrop-blur-xl overflow-hidden shadow-2xl flex items-center justify-center animate-fade-in-up" style="animation-delay: 200ms;">
          <div class="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black pointer-events-none"></div>
          
          <!-- Animated Nodes -->
          <div class="relative w-full h-full" style="transform: translate({mouse.x * 0.5}px, {mouse.y * 0.5}px);">
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-[0_0_60px_rgba(251,191,36,0.2)] animate-pulse-slow">
              <Brain size={40} class="text-amber-400" />
            </div>
            
            {#each heroNodes as node}
              <div class="absolute flex flex-col items-center gap-2 transition-transform hover:scale-110" style="left: {node.x}%; top: {node.y}%; animation: float 6s ease-in-out infinite; animation-delay: {node.delay};">
                <div class="w-10 h-10 rounded-full bg-[#111] border border-white/10 flex items-center justify-center shadow-lg relative">
                  <div class="absolute inset-0 rounded-full border border-amber-400/20 animate-ping opacity-20"></div>
                  <UserRoundPlus size={18} class="text-slate-400" />
                </div>
                <div class="bg-[#111]/80 border border-white/10 rounded-md px-2 py-1 text-[10px] whitespace-nowrap backdrop-blur-sm">
                  <span class="text-white font-semibold">{node.name}</span> <span class="text-slate-500">{node.role}</span>
                </div>
              </div>
            {/each}
            
            <!-- Connection Lines (SVG) -->
            <svg class="absolute inset-0 w-full h-full pointer-events-none opacity-40" stroke="currentColor" fill="none">
              <path d="M50% 50% L12% 24%" class="text-amber-500/50" stroke-width="1.5" stroke-dasharray="4" />
              <path d="M50% 50% L68% 16%" class="text-emerald-500/50" stroke-width="1.5" stroke-dasharray="4" />
              <path d="M50% 50% L82% 54%" class="text-cyan-500/50" stroke-width="1.5" stroke-dasharray="4" />
              <path d="M50% 50% L20% 68%" class="text-violet-500/50" stroke-width="1.5" stroke-dasharray="4" />
              <path d="M50% 50% L56% 76%" class="text-pink-500/50" stroke-width="1.5" stroke-dasharray="4" />
            </svg>
          </div>
        </div>
      </section>

      <!-- FEATURES -->
      <section id="features" class="w-full max-w-7xl mx-auto px-6 py-32 border-t border-white/5" data-section="features">
        <div class="text-center mb-20 animate-fade-in-up">
          <h2 class="text-3xl md:text-5xl font-bold tracking-tight text-white">Everything you need to connect.</h2>
          <p class="mt-4 text-slate-400 max-w-2xl mx-auto text-lg">A comprehensive suite of tools designed to enhance every aspect of event networking.</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {#each features as feature, i}
            {@const tint = tintClasses[feature.tint]}
            <div class="group relative p-6 rounded-2xl bg-[#111] border border-white/5 hover:border-white/10 transition-all duration-300 overflow-hidden flex flex-col h-full hover:-translate-y-1 hover:shadow-lg animate-fade-in-up" style="animation-delay: {i * 50}ms; animation-fill-mode: forwards;">
              <div class="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>
              
              <div class="w-12 h-12 rounded-xl {tint.bg} border {tint.border} flex items-center justify-center mb-5 transition-transform group-hover:scale-110">
                <svelte:component this={feature.icon} size={22} class={tint.icon} />
              </div>
              
              <h3 class="text-slate-200 font-semibold mb-2">{feature.title}</h3>
              <p class="text-slate-500 text-sm leading-relaxed flex-grow">{feature.desc}</p>
            </div>
          {/each}
        </div>
      </section>

      <!-- HOW IT WORKS (TIMELINE) -->
      <section id="workflow" class="w-full max-w-6xl mx-auto px-6 py-32 border-t border-white/5" data-section="workflow">
        <div class="text-center mb-20 animate-fade-in-up">
          <h2 class="text-3xl md:text-5xl font-bold tracking-tight text-white">How it works</h2>
          <p class="mt-4 text-slate-400 max-w-2xl mx-auto text-lg">A seamless journey from registration to meaningful conversation.</p>
        </div>
        
        <div class="relative overflow-hidden py-10 animate-fade-in" style="animation-delay: 200ms; animation-fill-mode: forwards;">
          <div class="flex overflow-x-auto pb-12 hide-scrollbar snap-x snap-mandatory gap-0 px-4 mask-edges">
            {#each timelineSteps as step, i}
              <div class="relative flex flex-col items-center snap-center shrink-0 w-48 group">
                <div class="w-full h-[1px] bg-gradient-to-r from-transparent via-slate-700 to-transparent absolute top-6 -z-10 {i === 0 ? 'left-1/2 w-1/2' : i === timelineSteps.length - 1 ? 'right-1/2 w-1/2' : ''}"></div>
                <div class="w-12 h-12 rounded-full bg-[#111] border border-slate-700 flex items-center justify-center text-slate-400 font-bold mb-6 shadow-lg transition-all duration-300 group-hover:border-amber-500 group-hover:text-amber-400 group-hover:shadow-[0_0_20px_rgba(251,191,36,0.2)] group-hover:scale-110">
                  {i + 1}
                </div>
                <div class="text-center text-sm font-medium text-slate-300 px-2 transition-colors group-hover:text-white">{step}</div>
              </div>
            {/each}
          </div>
        </div>
      </section>

      
      <!-- VENUE SECTION -->
      <section id="venue" class="w-full max-w-7xl mx-auto px-6 py-32 border-t border-white/5" data-section="venue">
        <div class="grid md:grid-cols-2 gap-16 items-center">
          <div class="space-y-8 animate-fade-in-up">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 text-xs font-medium">
              <MapPinned size={14} /> Interactive 2D Venue
            </div>
            <h2 class="text-3xl md:text-5xl font-bold tracking-tight text-white">Design the room, then help people move through it.</h2>
            <p class="text-slate-400 text-lg">
              Organizers can customize venue layouts, booths, stages, lounges, and meeting points while attendees easily navigate the networking spaces around them.
            </p>
            <div class="flex flex-wrap gap-3 mt-6">
              {#each ['Custom zones', 'Attendee location', 'Booths and stages', 'Meeting areas'] as item}
                <span class="rounded-full border border-white/10 bg-[#111] px-4 py-2 text-xs font-semibold text-slate-300 shadow-sm">{item}</span>
              {/each}
            </div>
          </div>

          <div class="relative p-6 rounded-3xl border border-white/10 bg-[#111] shadow-2xl animate-fade-in-up" style="animation-delay: 200ms; animation-fill-mode: forwards;">
            <div class="rounded-2xl border border-white/5 bg-[#0a0a0a] p-5">
              <div class="mb-5 flex items-center justify-between">
                <div>
                  <p class="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Venue Editor</p>
                  <p class="mt-1 text-sm text-slate-400">Hackathon floor layout</p>
                </div>
                <Route size={20} class="text-cyan-400" />
              </div>

              <div class="venue-grid">
                <div class="venue-zone zone-stage">Main Stage</div>
                <div class="venue-zone zone-booths">Sponsor Booths</div>
                <div class="venue-zone zone-lounge">Networking Lounge</div>
                <div class="venue-zone zone-mentor">Mentor Hub</div>
                <div class="venue-zone zone-food">Cafe</div>
                <div class="venue-path"></div>
                <div class="venue-pin pin-a"></div>
                <div class="venue-pin pin-b"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

<!-- ORGANIZER SECTION -->
      <section id="organizers" class="w-full max-w-6xl mx-auto px-6 py-32 border-t border-white/5" data-section="organizer">
        <div class="grid md:grid-cols-2 gap-16 items-center">
          <div class="space-y-8 animate-fade-in-up">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-medium">
              <LayoutDashboard size={14} /> Organizer Tools
            </div>
            <h2 class="text-3xl md:text-5xl font-bold tracking-tight text-white">Measure the unmeasurable.</h2>
            <p class="text-slate-400 text-lg">
              Track real networking engagement. See AI matches, connections made, and venue activity in real-time with our comprehensive analytics dashboard.
            </p>
            <ul class="space-y-4 text-slate-300 text-sm mt-8">
              <li class="flex items-center gap-3"><div class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div> Total Participants & Engagement Rates</li>
              <li class="flex items-center gap-3"><div class="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"></div> Active Conversations & Connections</li>
              <li class="flex items-center gap-3"><div class="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]"></div> Interactive 2D Venue Management</li>
            </ul>
          </div>
          
          <div class="grid grid-cols-2 gap-4 animate-fade-in-up" style="animation-delay: 200ms; animation-fill-mode: forwards;">
            {#each organizerMetrics.slice(0,4) as metric, i}
              <div class="bg-[#111] border border-white/5 p-8 rounded-2xl flex flex-col items-center justify-center text-center hover:border-white/10 hover:-translate-y-1 transition-all duration-300">
                <div class="text-5xl font-bold text-white mb-3 tracking-tight">
                  {animatedMetrics[i]}{metric.suffix}
                </div>
                <div class="text-xs font-medium text-slate-500 uppercase tracking-wider">{metric.label}</div>
              </div>
            {/each}
          </div>
        </div>
      </section>

      <!-- AI STACK -->
      <section id="tech" class="w-full max-w-6xl mx-auto px-6 py-32 border-t border-white/5" data-section="technology">
        <div class="text-center mb-20 animate-fade-in-up">
          <h2 class="text-3xl md:text-5xl font-bold tracking-tight text-white">Powered by AI</h2>
          <p class="mt-4 text-slate-400 max-w-2xl mx-auto text-lg">State-of-the-art models for semantic understanding and generation.</p>
        </div>
        
        <div class="grid md:grid-cols-2 gap-6">
          {#each techChips as tech, i}
            <div class="relative group p-8 rounded-3xl bg-[#111] border border-white/5 overflow-hidden flex flex-col items-start gap-5 transition-all duration-500 hover:bg-[#151515] hover:border-white/10 animate-fade-in-up" style="animation-delay: {i * 100}ms; animation-fill-mode: forwards;">
              <div class="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:via-cyan-500/5 group-hover:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              
              <div class="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 transition-transform group-hover:scale-110">
                <svelte:component this={tech.icon} size={28} />
              </div>
              <div>
                <h3 class="text-xl font-bold text-white mb-2">{tech.label}</h3>
                <p class="text-slate-400 text-sm leading-relaxed">{tech.detail}</p>
              </div>
            </div>
          {/each}
        </div>
      </section>

      <!-- WHY EVENTNETWORK -->
      <section class="w-full max-w-6xl mx-auto px-6 py-32 border-t border-white/5" data-section="why">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/5">
          {#each whyStats as stat, i}
            <div class="flex flex-col items-center justify-center text-center px-4 animate-fade-in" style="animation-delay: {i * 100}ms; animation-fill-mode: forwards;">
              <div class="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-500 mb-3">
                {animatedWhyStats[i]}{stat.suffix}
              </div>
              <div class="text-sm font-medium text-slate-500 uppercase tracking-widest">{stat.label}</div>
            </div>
          {/each}
        </div>
      </section>

      
      <!-- TESTIMONIALS -->
      <section class="w-full max-w-7xl mx-auto px-6 py-32 border-t border-white/5" data-section="testimonials">
        <div class="text-center mb-20 animate-fade-in-up">
          <h2 class="text-3xl md:text-5xl font-bold tracking-tight text-white">Built for the people in the room</h2>
          <p class="mt-4 text-slate-400 max-w-2xl mx-auto text-lg">What attendees and organizers are saying about their event experiences.</p>
        </div>

        <div class="grid gap-6 md:grid-cols-3">
          {#each testimonials as testimonial, i}
            <div class="relative group p-8 rounded-3xl bg-[#111] border border-white/5 overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/20 animate-fade-in-up" style="animation-delay: {i * 100}ms; animation-fill-mode: forwards;">
              <div class="flex items-center gap-4 mb-6">
                <div class="flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 text-sm font-black text-amber-400">
                  {testimonial.initials}
                </div>
                <div>
                  <p class="font-bold text-white">{testimonial.name}</p>
                  <p class="text-xs text-slate-500">{testimonial.role}</p>
                </div>
              </div>
              <blockquote class="text-sm leading-relaxed text-slate-400">"{testimonial.quote}"</blockquote>
            </div>
          {/each}
        </div>
      </section>

<!-- CTA -->
      <section class="w-full max-w-4xl mx-auto px-6 py-32 text-center">
        <div class="relative rounded-3xl p-16 overflow-hidden border border-white/10 bg-[#111] shadow-2xl">
          <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-[#111] to-[#111] pointer-events-none"></div>
          
          <h2 class="relative z-10 text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
            Ready to Build<br/>Meaningful Connections?
          </h2>
          <div class="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4 mt-12">
            <button onclick={goToPrimaryAction} class="h-14 px-10 rounded-full bg-white text-black font-bold hover:scale-105 transition-transform w-full sm:w-auto shadow-[0_0_30px_rgba(255,255,255,0.15)] text-lg">
              Create Your First Event
            </button>
            <button onclick={goToPrimaryAction} class="h-14 px-10 rounded-full border border-slate-700 bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors w-full sm:w-auto text-lg">
              Get Started
            </button>
          </div>
          {#if error}
            <p class="relative z-10 mt-4 text-sm text-red-400">{error}</p>
          {/if}
        </div>
      </section>
      
    </main>

    <!-- FOOTER -->
    <footer class="w-full border-t border-white/5 bg-[#0a0a0a] py-12 px-6">
      <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black">
            <Sparkles size={14} />
          </div>
          <span class="text-slate-300 font-semibold text-sm tracking-wide">EventNetwork AI</span>
        </div>
        
        <div class="flex flex-wrap justify-center gap-8 text-sm font-medium text-slate-500">
          <a href="#features" class="hover:text-slate-300 transition-colors">Features</a>
          <a href="#why" class="hover:text-slate-300 transition-colors">About</a>
          <a href="https://github.com/tr1nadh/eventnetwork-ai" target="_blank" class="hover:text-slate-300 transition-colors">GitHub</a>
          <a href="#" class="hover:text-slate-300 transition-colors">Documentation</a>
          <a href="#" class="hover:text-slate-300 transition-colors">Contact</a>
        </div>
      </div>
      
      <div class="max-w-7xl mx-auto mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 border-t border-white/5 pt-8 text-xs font-medium text-slate-600 uppercase tracking-widest">
        <span>Built for AMD Developer Hackathon ACT II</span>
        <span class="hidden sm:inline text-slate-800">•</span>
        <span>Powered by Fireworks AI</span>
      </div>
    </footer>
  </div>
</div>

<style>
  :global(html) {
    scroll-behavior: smooth;
    background-color: #0a0a0a;
  }
  
  .scrolled-nav {
    background-color: rgba(10, 10, 10, 0.8);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom-color: rgba(255, 255, 255, 0.05);
  }

  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .mask-edges {
    mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
    -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-15px); }
  }

  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .animate-fade-in-up {
    animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  }
  
  .animate-fade-in {
    animation: fade-in 0.8s ease-out;
  }

  .animate-pulse-slow {
    animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  .venue-grid {
    position: relative;
    display: grid;
    min-height: 360px;
    grid-template-columns: 1fr 0.7fr 1fr;
    grid-template-rows: 1fr 0.9fr 0.8fr;
    gap: 0.75rem;
  }

  .venue-zone {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 0.75rem;
    text-align: center;
    font-size: 0.76rem;
    font-weight: 800;
    color: #f8fafc;
    transition: transform 0.3s ease;
  }
  .venue-zone:hover {
    transform: scale(1.02);
  }

  .zone-stage { grid-column: 1 / 3; background: rgba(251, 191, 36, 0.05); border-color: rgba(251, 191, 36, 0.15); }
  .zone-booths { grid-column: 3; grid-row: 1 / 3; background: rgba(34, 211, 238, 0.05); border-color: rgba(34, 211, 238, 0.15); }
  .zone-lounge { grid-column: 1; grid-row: 2 / 4; background: rgba(52, 211, 153, 0.05); border-color: rgba(52, 211, 153, 0.15); }
  .zone-mentor { grid-column: 2; grid-row: 2; background: rgba(167, 139, 250, 0.05); border-color: rgba(167, 139, 250, 0.15); }
  .zone-food { grid-column: 2 / 4; grid-row: 3; background: rgba(244, 114, 182, 0.05); border-color: rgba(244, 114, 182, 0.15); }

  .venue-path {
    position: absolute;
    left: 19%;
    right: 16%;
    top: 48%;
    z-index: 1;
    height: 2px;
    background: linear-gradient(90deg, rgba(251, 191, 36, 0.5), rgba(34, 211, 238, 0.45));
    transform: rotate(10deg);
    opacity: 0.75;
  }

  .venue-pin {
    position: absolute;
    z-index: 3;
    height: 12px;
    width: 12px;
    border-radius: 999px;
    background: #fbbf24;
    box-shadow: 0 0 0 6px rgba(251, 191, 36, 0.16), 0 0 22px rgba(251, 191, 36, 0.65);
    animation: pin-pulse 1.8s ease-in-out infinite;
  }

  .pin-a { left: 29%; top: 56%; }
  .pin-b { right: 20%; top: 40%; animation-delay: -0.7s; background: #22d3ee; box-shadow: 0 0 0 6px rgba(34, 211, 238, 0.16), 0 0 22px rgba(34, 211, 238, 0.65); }

  @keyframes pin-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.18); }
  }

</style>
