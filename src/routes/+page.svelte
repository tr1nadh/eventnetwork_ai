<script>
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
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
    WandSparkles,
  } from "@lucide/svelte";
  import { createSupabaseBrowserClient, startGoogleSignIn } from "$lib/supabase/client";
  import AmdAiBadge from "$lib/components/amd-ai-badge.svelte";

  export let data;

  const supabase = createSupabaseBrowserClient();

  let user = data.user;
  let signingIn = false;
  let error = "";
  let scrollY = 0;

  const heroNodes = [
    { name: "Founder", role: "Needs AI talent", x: 22, y: 24 },
    {
      name: "Engineer",
      role: "Looking for teams",
      x: 72,
      y: 16,
    },
    { name: "Mentor", role: "Guides builders", x: 78, y: 54 },
    {
      name: "Designer",
      role: "Ships product UX",
      x: 22,
      y: 68,
    },
    { name: "Investor", role: "Finds signal early", x: 60, y: 82 },
  ];

  const features = [
    {
      icon: WandSparkles,
      title: "AI Profile Auto-Fill",
      desc: "Paste your LinkedIn profile, resume, or free-form text and let AI generate a structured networking profile.",
      tint: "amber",
    },
    {
      icon: Brain,
      title: "Semantic AI Matching",
      desc: "Vector embeddings understand who you are and who you are looking for to recommend highly relevant people.",
      tint: "cyan",
    },
    {
      icon: ScanSearch,
      title: "AI Match Insights",
      desc: "Every match includes AI-generated shared interests, complementary skills, and collaboration opportunities.",
      tint: "violet",
    },
    {
      icon: Handshake,
      title: "Smart Connections",
      desc: "Send, accept, reject, and manage connection requests with an intuitive networking workflow.",
      tint: "emerald",
    },
    {
      icon: Radio,
      title: "Real-Time Connection Requests",
      desc: "Receive connection requests instantly without refreshing the page using Supabase Realtime.",
      tint: "cyan",
    },
    {
      icon: Bell,
      title: "Browser Notifications",
      desc: "Get instant browser notifications whenever someone sends or accepts a connection request.",
      tint: "pink",
    },
    {
      icon: MessageCircle,
      title: "Real-Time Chat",
      desc: "Connected attendees can chat instantly during the event to coordinate meetings.",
      tint: "blue",
    },
    {
      icon: Brain,
      title: "AI Meeting Preparation",
      desc: "Receive personalized questions, discussion ideas, and collaboration topics before meeting.",
      tint: "blue",
    },
    {
      icon: MapPinned,
      title: "Interactive 2D Venue",
      desc: "Explore an interactive venue while organizers visually customize the event layout.",
      tint: "cyan",
    },
    {
      icon: ShieldCheck,
      title: "Event Management",
      desc: "Create, edit, delete, and manage networking events with a simple organizer experience.",
      tint: "emerald",
    },
    {
      icon: LayoutDashboard,
      title: "Organizer Analytics",
      desc: "Track registrations, matches, requests, accepted connections, and networking activity.",
      tint: "violet",
    },
  ];

  const timelineSteps = [
    "Join Event",
    "AI Profile Auto-create",
    "Generate Embeddings",
    "Semantic Match Search",
    "AI Match Analysis",
    "Connect",
    "Real-Time Chat",
    "Generate Icebreakers",
    "Meet",
  ];

  const techChips = [
    {
      icon: Brain,
      label: "Qwen3.7 Plus",
      detail:
        "Profile generation, match explanations, meeting preparation, and personalized icebreakers.",
    },
    {
      icon: Network,
      label: "Qwen3 Embedding 8B",
      detail:
        "Generates semantic embeddings for intelligent participant matching.",
    },
    {
      icon: Cpu,
      label: "Fireworks AI",
      detail: "Provides scalable inference for AI-powered features.",
    },
    {
      icon: Sparkles,
      label: "AI Ecosystem",
      detail:
        "Advanced semantic matching and real-time event intelligence.",
    },
  ];

  const organizerMetrics = [
    { label: "Total Participants", value: 148, suffix: "" },
    { label: "AI Matches", value: 426, suffix: "" },
    { label: "Connection Requests", value: 219, suffix: "" },
    { label: "Accepted Connections", value: 132, suffix: "" },
    { label: "Active Conversations", value: 84, suffix: "" },
    { label: "Networking Analytics", value: 92, suffix: "%" },
    { label: "Interactive Venue Management", value: 7, suffix: " zones" },
  ];

  const whyStats = [
    { value: 95, suffix: "%", label: "Better Networking Quality" },
    { value: 100, suffix: "%", label: "AI Powered Matching" },
    { value: 24, suffix: "/7", label: "Real-Time Collaboration" },
    { value: 10, suffix: "x", label: "Meaningful Professional Connections" },
  ];

  const testimonials = [
    {
      name: "Ananya Rao",
      role: "Hackathon Organizer",
      quote:
        "The matching explanations made networking feel intentional instead of random. Attendees knew exactly who to meet next.",
      initials: "AR",
    },
    {
      name: "Kabir Menon",
      role: "AI Startup Founder",
      quote:
        "I found two relevant collaborators in the first hour. The AI icebreakers made the conversations much sharper.",
      initials: "KM",
    },
    {
      name: "Meera Shah",
      role: "Product Designer",
      quote:
        "The venue map and live connection flow helped me move through the event with confidence and purpose.",
      initials: "MS",
    },
  ];

  const tintClasses = {
    amber: {
      icon: "text-amber-400",
      bg: "bg-amber-400/10",
      border: "border-amber-400/20",
      glow: "group-hover:shadow-[0_18px_46px_rgba(251,191,36,0.14)]",
    },
    cyan: {
      icon: "text-cyan-400",
      bg: "bg-cyan-400/10",
      border: "border-cyan-400/20",
      glow: "group-hover:shadow-[0_18px_46px_rgba(34,211,238,0.14)]",
    },
    violet: {
      icon: "text-violet-400",
      bg: "bg-violet-400/10",
      border: "border-violet-400/20",
      glow: "group-hover:shadow-[0_18px_46px_rgba(167,139,250,0.14)]",
    },
    emerald: {
      icon: "text-emerald-400",
      bg: "bg-emerald-400/10",
      border: "border-emerald-400/20",
      glow: "group-hover:shadow-[0_18px_46px_rgba(52,211,153,0.14)]",
    },
    pink: {
      icon: "text-pink-400",
      bg: "bg-pink-400/10",
      border: "border-pink-400/20",
      glow: "group-hover:shadow-[0_18px_46px_rgba(244,114,182,0.14)]",
    },
    blue: {
      icon: "text-blue-400",
      bg: "bg-blue-400/10",
      border: "border-blue-400/20",
      glow: "group-hover:shadow-[0_18px_46px_rgba(96,165,250,0.14)]",
    },
  };

  onMount(() => {
    const { data: authData } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        user = session?.user ?? null;
      },
    );

    return () => authData.subscription.unsubscribe();
  });

  async function signInWithGoogle() {
    if (signingIn) return;
    signingIn = true;
    error = "";
    try {
      const result = await startGoogleSignIn(data.next);
      if (result.error) throw result.error;
    } catch {
      error = "Google sign-in couldn’t start. Please try again.";
      signingIn = false;
    }
  }

  function goToPrimaryAction() {
    if (user) {
      goto(data.next);
      return;
    }

    signInWithGoogle();
  }
</script>

<svelte:head>
  <title>Evenai | AI-Powered Networking</title>
  <meta
    name="description"
    content="Find relevant people to meet at conferences, hackathons, and networking events with Evenai."
  />
</svelte:head>

<svelte:window bind:scrollY />

<div
  class="app-container bg-background text-slate-200 min-h-screen selection:bg-amber-500/30 selection:text-amber-100 font-sans"
>
  <!-- Subtle ambient background -->
  <div
    class="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/10 via-[#0a0a0a] to-[#0a0a0a]"
  ></div>

  <div class="relative z-10 flex flex-col min-h-screen">
    <!-- Navbar -->
    <header
      class="fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b border-transparent"
      class:scrolled-nav={scrollY > 20}
    >
      <div
        class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between"
      >
        <a href="/" class="flex items-center gap-2 group">
          <div
            class="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black shadow-[0_0_15px_rgba(251,191,36,0.3)] transition-transform group-hover:scale-105"
          >
            <Sparkles size={16} />
          </div>
          <span class="font-semibold text-sm tracking-wide text-slate-100"
            >Evenai</span
          >
        </a>
        <nav
          class="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400"
        >
          <a href="#features" class="hover:text-slate-100 transition-colors"
            >Features</a
          >
          <a href="#workflow" class="hover:text-slate-100 transition-colors"
            >Workflow</a
          >
          <a href="#organizers" class="hover:text-slate-100 transition-colors"
            >Organizers</a
          >
          <a href="#tech" class="hover:text-slate-100 transition-colors"
            >AI Stack</a
          >
        </nav>
        <div class="flex items-center gap-4">
          <button onclick={goToPrimaryAction} disabled={signingIn} class="header-action">
            {signingIn ? "Connecting…" : user ? "Open events" : "Sign in"}
          </button>
        </div>
      </div>
      {#if error}
        <p role="alert" class="auth-error">{error}</p>
      {/if}
    </header>

    <main class="flex-grow flex flex-col items-center w-full">
      <!-- HERO -->
      <section
        class="hero"
      >
        <div class="hero-copy">
          <h1>Meet the right people at your next event.</h1>
          <p>Find attendees who share your interests, goals, and skills at hackathons, conferences, and meetups.</p>
          <div class="hero-actions">
            <button onclick={goToPrimaryAction} disabled={signingIn} class="primary-action">
              {signingIn ? "Connecting…" : user ? "Open events" : "Continue with Google"}
              <ArrowRight size={17} />
            </button>
            <a href="#workflow">How it works</a>
          </div>
        </div>
        <figure class="network-map" aria-label="Example of how Evenai connects event attendees">
          <svg class="network-lines" aria-hidden="true">
            {#each heroNodes as node}
              <line x1="50%" y1="46%" x2={node.x + "%"} y2={node.y + "%"} />
            {/each}
          </svg>
          <div class="network-core"><Brain size={29} /></div>
          {#each heroNodes as node}
            <div class="network-person" style:left={node.x + "%"} style:top={node.y + "%"}>
              <strong>{node.name}</strong><span>{node.role}</span>
            </div>
          {/each}
        </figure>
      </section>

      <!-- FEATURES -->
      <section
        id="features"
        class="w-full max-w-7xl mx-auto px-6 py-16 md:py-24 border-t border-white/5"
      >
        <div class="text-center mb-10 md:mb-14 animate-fade-in-up">
          <h2 class="text-3xl md:text-5xl font-bold tracking-tight text-white">
            Everything you need to connect.
          </h2>
          <p class="mt-4 text-slate-400 max-w-2xl mx-auto text-lg">
            A comprehensive suite of tools designed to enhance every aspect of
            event networking.
          </p>
        </div>

        <div
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {#each features as feature, i}
            {@const tint = tintClasses[feature.tint]}
            <div
              class="group relative p-6 rounded-2xl bg-card border border-white/5 hover:border-white/10 transition-all duration-300 overflow-hidden flex flex-col h-full hover:-translate-y-1 hover:shadow-lg animate-fade-in-up"
              style="animation-delay: {i *
                50}ms; animation-fill-mode: forwards;"
            >
              <div
                class="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"
              ></div>

              <div
                class="w-12 h-12 rounded-xl {tint.bg} border {tint.border} flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
              >
                <svelte:component
                  this={feature.icon}
                  size={22}
                  class={tint.icon}
                />
              </div>

              <h3 class="text-slate-200 font-semibold mb-2">{feature.title}</h3>
              <p class="text-slate-500 text-sm leading-relaxed flex-grow">
                {feature.desc}
              </p>
            </div>
          {/each}
        </div>
      </section>

      <!-- HOW IT WORKS (TIMELINE) -->
      <section
        id="workflow"
        class="w-full max-w-6xl mx-auto px-6 py-16 md:py-24 border-t border-white/5"
      >
        <div class="text-center mb-10 md:mb-14 animate-fade-in-up">
          <h2 class="text-3xl md:text-5xl font-bold tracking-tight text-white">
            How it works
          </h2>
          <p class="mt-4 text-slate-400 max-w-2xl mx-auto text-lg">
            A seamless journey from registration to meaningful conversation.
          </p>
        </div>

        <ol class="workflow-list">
          {#each timelineSteps as step, i}
            <li><span aria-hidden="true">{i + 1}</span>{step}</li>
          {/each}
        </ol>
      </section>

      <!-- VENUE SECTION -->
      <section
        id="venue"
        class="w-full max-w-7xl mx-auto px-6 py-16 md:py-24 border-t border-white/5"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div class="space-y-8 animate-fade-in-up">
            <div
              class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 text-xs font-medium"
            >
              <MapPinned size={14} /> Interactive 2D Venue
            </div>
            <h2
              class="text-3xl md:text-5xl font-bold tracking-tight text-white"
            >
              Design the room, then help people move through it.
            </h2>
            <p class="text-slate-400 text-lg">
              Organizers can customize venue layouts, booths, stages, lounges,
              and meeting points while attendees easily navigate the networking
              spaces around them.
            </p>
            <div class="flex flex-wrap gap-3 mt-6">
              {#each ["Custom zones", "Attendee location", "Booths and stages", "Meeting areas"] as item}
                <span
                  class="rounded-full border border-white/10 bg-card px-4 py-2 text-xs font-semibold text-slate-300 shadow-sm"
                  >{item}</span
                >
              {/each}
            </div>
          </div>

          <div
            class="relative p-3 sm:p-6 rounded-3xl border border-white/10 bg-card shadow-2xl animate-fade-in-up"
            style="animation-delay: 200ms; animation-fill-mode: forwards;"
          >
            <div class="rounded-2xl border border-white/5 bg-background p-3 sm:p-5">
              <div class="mb-5 flex items-center justify-between">
                <div>
                  <p
                    class="text-xs font-bold uppercase tracking-[0.2em] text-amber-400"
                  >
                    Venue Editor
                  </p>
                  <p class="mt-1 text-sm text-slate-400">
                    Hackathon floor layout
                  </p>
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
      <section
        id="organizers"
        class="w-full max-w-6xl mx-auto px-6 py-16 md:py-24 border-t border-white/5"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div class="space-y-8 animate-fade-in-up">
            <div
              class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-medium"
            >
              <LayoutDashboard size={14} /> Organizer Tools
            </div>
            <h2
              class="text-3xl md:text-5xl font-bold tracking-tight text-white"
            >
              Measure the unmeasurable.
            </h2>
            <p class="text-slate-400 text-lg">
              Track real networking engagement. See AI matches, connections
              made, and venue activity in real-time with our comprehensive
              analytics dashboard.
            </p>
            <ul class="space-y-4 text-slate-300 text-sm mt-8">
              <li class="flex items-center gap-3">
                <div
                  class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                ></div>
                Total Participants & Engagement Rates
              </li>
              <li class="flex items-center gap-3">
                <div
                  class="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                ></div>
                Active Conversations & Connections
              </li>
              <li class="flex items-center gap-3">
                <div
                  class="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                ></div>
                Interactive 2D Venue Management
              </li>
            </ul>
          </div>

          <div
            class="grid grid-cols-2 gap-4 animate-fade-in-up"
            style="animation-delay: 200ms; animation-fill-mode: forwards;"
          >
            {#each organizerMetrics.slice(0, 4) as metric}
              <div
                class="bg-card border border-white/5 p-8 rounded-2xl flex flex-col items-center justify-center text-center hover:border-white/10 hover:-translate-y-1 transition-all duration-300"
              >
                <div class="text-5xl font-bold text-white mb-3 tracking-tight">
                  {metric.value}{metric.suffix}
                </div>
                <div
                  class="text-xs font-medium text-slate-500 uppercase tracking-wider"
                >
                  {metric.label}
                </div>
              </div>
            {/each}
          </div>
        </div>
      </section>

      <!-- AI STACK -->
      <section
        id="tech"
        class="w-full max-w-6xl mx-auto px-6 py-16 md:py-24 border-t border-white/5"
      >
        <div class="text-center mb-10 md:mb-14 animate-fade-in-up">
          <h2 class="text-3xl md:text-5xl font-bold tracking-tight text-white">
            Powered by AI
          </h2>
          <p class="mt-4 text-slate-400 max-w-2xl mx-auto text-lg">
            State-of-the-art models for semantic understanding and generation.
          </p>
        </div>

        <div class="grid md:grid-cols-2 gap-6">
          {#each techChips as tech, i}
            <div
              class="relative group p-8 rounded-3xl bg-card border border-white/5 overflow-hidden flex flex-col items-start gap-5 transition-all duration-500 hover:bg-[#151515] hover:border-white/10 animate-fade-in-up"
              style="animation-delay: {i *
                100}ms; animation-fill-mode: forwards;"
            >
              <div
                class="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:via-cyan-500/5 group-hover:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              ></div>

              <div
                class="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 transition-transform group-hover:scale-110"
              >
                <svelte:component this={tech.icon} size={28} />
              </div>
              <div>
                <h3 class="text-xl font-bold text-white mb-2">{tech.label}</h3>
                <p class="text-slate-400 text-sm leading-relaxed">
                  {tech.detail}
                </p>
              </div>
            </div>
          {/each}
        </div>
      </section>

      <!-- WHY Evenai -->
      <section
        class="w-full max-w-6xl mx-auto px-6 py-16 md:py-24 border-t border-white/5"
        id="why"
      >
        <div
          class="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/5"
        >
          {#each whyStats as stat, i}
            <div
              class="flex flex-col items-center justify-center text-center px-4 animate-fade-in"
              style="animation-delay: {i *
                100}ms; animation-fill-mode: forwards;"
            >
              <div
                class="text-4xl md:text-5xl font-extrabold text-slate-100 mb-3"
              >
                {stat.value}{stat.suffix}
              </div>
              <div
                class="text-sm font-medium text-slate-500 uppercase tracking-widest"
              >
                {stat.label}
              </div>
            </div>
          {/each}
        </div>
      </section>

      <!-- TESTIMONIALS -->
      <section
        class="w-full max-w-7xl mx-auto px-6 py-16 md:py-24 border-t border-white/5"
      >
        <div class="text-center mb-10 md:mb-14 animate-fade-in-up">
          <h2 class="text-3xl md:text-5xl font-bold tracking-tight text-white">
            Built for the people in the room
          </h2>
          <p class="mt-4 text-slate-400 max-w-2xl mx-auto text-lg">
            What attendees and organizers are saying about their event
            experiences.
          </p>
        </div>

        <div class="grid gap-6 md:grid-cols-3">
          {#each testimonials as testimonial, i}
            <div
              class="relative group p-8 rounded-3xl bg-card border border-white/5 overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/20 animate-fade-in-up"
              style="animation-delay: {i *
                100}ms; animation-fill-mode: forwards;"
            >
              <div class="flex items-center gap-4 mb-6">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 text-sm font-black text-amber-400"
                >
                  {testimonial.initials}
                </div>
                <div>
                  <p class="font-bold text-white">{testimonial.name}</p>
                  <p class="text-xs text-slate-500">{testimonial.role}</p>
                </div>
              </div>
              <blockquote class="text-sm leading-relaxed text-slate-400">
                "{testimonial.quote}"
              </blockquote>
            </div>
          {/each}
        </div>
      </section>

      <!-- CTA -->
      <section class="w-full max-w-4xl mx-auto px-6 py-16 md:py-24 text-center">
        <div
          class="relative rounded-3xl p-6 sm:p-12 overflow-hidden border border-white/10 bg-card shadow-2xl"
        >
          <div
            class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-[#111] to-[#111] pointer-events-none"
          ></div>

          <h2
            class="relative z-10 text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6"
          >
            Ready to Build<br />Meaningful Connections?
          </h2>
          <div
            class="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4 mt-12"
          >
            <button onclick={goToPrimaryAction} disabled={signingIn} class="primary-action">
              {signingIn ? "Connecting…" : user ? "Open events" : "Continue with Google"}
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </section>
    </main>

    <!-- FOOTER -->
    <footer class="w-full border-t border-white/5 bg-background py-12 px-6">
      <div
        class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 rounded bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black"
          >
            <Sparkles size={14} />
          </div>
          <span class="text-slate-300 font-semibold text-sm tracking-wide"
            >Evenai</span
          >
        </div>

        <div
          class="flex flex-wrap justify-center gap-8 text-sm font-medium text-slate-500"
        >
          <a href="#features" class="hover:text-slate-300 transition-colors"
            >Features</a
          >
          <a href="#why" class="hover:text-slate-300 transition-colors">About</a
          >
          <a
            href="https://github.com/tr1nadh/Evenai-ai"
            target="_blank"
            class="hover:text-slate-300 transition-colors">GitHub</a
          >
        </div>
      </div>

      <div
        class="max-w-7xl mx-auto mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 border-t border-white/5 pt-8 text-xs font-medium text-slate-600 uppercase tracking-widest"
      >
        <span>Evenai Event Platform</span>
        <span class="hidden sm:inline text-slate-800">•</span>
        <span>Powered by Fireworks AI</span>
      </div>
    </footer>
  </div>
</div>

<style>
  :global(html) {
    scroll-behavior: auto;
    background-color: #0a0a0a;
  }

  .scrolled-nav {
    background-color: rgba(10, 10, 10, 0.8);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom-color: rgba(255, 255, 255, 0.05);
  }

  section[id] {
    scroll-margin-top: 4rem;
  }
  .header-action, .primary-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: .75rem;
    min-height: 44px;
    padding: .65rem 1.2rem;
    border-radius: .65rem;
    font-weight: 650;
    cursor: pointer;
  }
  .header-action {
    border: 1px solid #454342;
    color: #fafafa;
    background: var(--card);
  }
  .primary-action {
    background: var(--primary);
    color: var(--primary-foreground);
  }
  .primary-action:hover {
    background: #ffdc75;
  }
  .header-action:hover {
    border-color: #a3a3a3;
  }
  button:disabled {
    cursor: wait;
    opacity: .75;
  }
  .auth-error {
    background: #392222;
    color: #ffe6df;
    text-align: center;
    padding: .6rem 1rem;
  }
  .hero {
    width: min(100%,72rem);
    padding: clamp(6rem,12vw,10rem) 1.5rem clamp(3rem,7vw,6rem);
    display: grid;
    align-items: center;
    grid-template-columns: 1.15fr 1fr;
    gap: clamp(2rem,5vw,5rem);
  }
  .hero h1 {
    color: #fafafa;
    font-size: clamp(2.5rem,4.7vw,4.4rem);
    line-height: 1.03;
    letter-spacing: -.04em;
    font-weight: 750;
  }
  .hero-copy p {
    color: #b6bdc7;
    font-size: 1.06rem;
    line-height: 1.65;
    max-width: 43ch;
    margin-top: 1.35rem;
  }
  .hero-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: .5rem 1.35rem;
    margin-top: 1.75rem;
  }
  .hero-actions a {
    padding: .75rem 0;
    text-decoration: underline;
    text-underline-offset: .25em;
  }
  .network-map {
    position: relative;
    min-height: clamp(16rem,27vw,23rem);
    border-radius: 1rem;
    border: 1px solid #3d382d;
    background: radial-gradient(ellipse at center,#29251a,#141412 75%);
  }
  .network-lines {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    stroke: #8a7946;
    stroke-width: 1.5px;
  }
  .network-core,.network-person {
    position: absolute;
    transform: translate(-50%,-50%);
  }
  .network-core {
    left: 50%;
    top: 46%;
    padding: .8rem;
    background: var(--primary);
    border-radius: 50%;
    color: #28200d;
  }
  .network-person {
    width: max-content;
    max-width: 40%;
    display: grid;
    gap: .15rem;
    border-radius: .55rem;
    border: 1px solid #514b3e;
    background: #201f1b;
    padding: .45rem .65rem;
  }
  .network-person strong {
    font-size: .84rem;
    color: #fff5da;
  }
  .network-person span {
    font-size: .72rem;
    color: #c9c5bb;
  }
  .workflow-list {
    display: grid;
    grid-template-columns: repeat(3,minmax(0,1fr));
    gap: 0 2rem;
  }
  .workflow-list li {
    display: flex;
    align-items: center;
    gap: .8rem;
    padding: 1rem 0;
    border-top: 1px solid #333;
  }
  .workflow-list span {
    color: #facc45;
    font-variant-numeric: tabular-nums;
  }
  @media(max-width: 800px) {
    .hero {
      grid-template-columns: 1fr;
    }
    .network-map {
      min-height: 16rem;
    }
  }
  @media(max-width: 580px) {
    .workflow-list {
      grid-template-columns: 1fr;
    }
    .network-person {
      padding: .35rem .45rem;
    }
  }

  @keyframes fade-in-up {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .animate-fade-in-up {
    animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .animate-fade-in {
    animation: fade-in 0.8s ease-out;
  }

  .venue-grid {
    position: relative;
    display: grid;
    min-height: 360px;
    grid-template-columns: minmax(0,1fr) minmax(0,.7fr) minmax(0,1fr);
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
    overflow-wrap: anywhere;
    font-size: 0.76rem;
    font-weight: 800;
    color: #f8fafc;
    transition: transform 0.3s ease;
  }
  .venue-zone:hover {
    transform: scale(1.02);
  }

  .zone-stage {
    grid-column: 1 / 3;
    background: rgba(251, 191, 36, 0.05);
    border-color: rgba(251, 191, 36, 0.15);
  }
  .zone-booths {
    grid-column: 3;
    grid-row: 1 / 3;
    background: rgba(34, 211, 238, 0.05);
    border-color: rgba(34, 211, 238, 0.15);
  }
  .zone-lounge {
    grid-column: 1;
    grid-row: 2 / 4;
    background: rgba(52, 211, 153, 0.05);
    border-color: rgba(52, 211, 153, 0.15);
  }
  .zone-mentor {
    grid-column: 2;
    grid-row: 2;
    background: rgba(167, 139, 250, 0.05);
    border-color: rgba(167, 139, 250, 0.15);
  }
  .zone-food {
    grid-column: 2 / 4;
    grid-row: 3;
    background: rgba(244, 114, 182, 0.05);
    border-color: rgba(244, 114, 182, 0.15);
  }

  .venue-path {
    position: absolute;
    left: 19%;
    right: 16%;
    top: 48%;
    z-index: 1;
    height: 2px;
    background: linear-gradient(
      90deg,
      rgba(251, 191, 36, 0.5),
      rgba(34, 211, 238, 0.45)
    );
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
    box-shadow:
      0 0 0 6px rgba(251, 191, 36, 0.16),
      0 0 22px rgba(251, 191, 36, 0.65);
    animation: pin-pulse 1.8s ease-in-out infinite;
  }

  .pin-a {
    left: 29%;
    top: 56%;
  }
  .pin-b {
    right: 20%;
    top: 40%;
    animation-delay: -0.7s;
    background: #22d3ee;
    box-shadow:
      0 0 0 6px rgba(34, 211, 238, 0.16),
      0 0 22px rgba(34, 211, 238, 0.65);
  }

  @keyframes pin-pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.18);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .animate-fade-in, .animate-fade-in-up, .venue-pin { animation: none; }
  }

</style>
