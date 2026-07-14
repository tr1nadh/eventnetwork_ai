import fs from 'fs';

const pagePath = 'd:\\Projects\\JsProjects\\active\\eventnetwork_ai\\src\\routes\\+page.svelte';
const currentCode = fs.readFileSync(pagePath, 'utf8');

// Extract the script block
const scriptMatch = currentCode.match(/<script>[\s\S]*?<\/script>/);
const scriptBlock = scriptMatch ? scriptMatch[0] : '';

const newTemplate = `
<svelte:head>
  <title>EventNetwork AI | AI-Powered Networking</title>
  <meta name="description" content="AI-powered semantic matching to help attendees discover meaningful professional connections at events." />
</svelte:head>

<svelte:window bind:scrollY />

<div class="app-container bg-black text-slate-200 min-h-screen selection:bg-amber-500/30 selection:text-amber-100 font-sans">
  
  <!-- Subtle ambient background -->
  <div class="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/10 via-black to-black"></div>
  
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
        <div class="mt-24 w-full relative z-10 h-[400px] rounded-2xl border border-white/10 bg-slate-950/50 backdrop-blur-xl overflow-hidden shadow-2xl flex items-center justify-center animate-fade-in-up" style="animation-delay: 200ms;">
          <div class="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          
          <!-- Animated Nodes -->
          <div class="relative w-full h-full" style="transform: translate({mouse.x * 0.5}px, {mouse.y * 0.5}px);">
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow-[0_0_50px_rgba(251,191,36,0.3)] animate-pulse-slow">
              <Brain size={40} class="text-amber-400" />
            </div>
            
            {#each heroNodes as node}
              <div class="absolute flex flex-col items-center gap-2 transition-transform hover:scale-110" style="left: {node.x}%; top: {node.y}%; animation: float 6s ease-in-out infinite; animation-delay: {node.delay};">
                <div class="w-10 h-10 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center shadow-lg relative">
                  <div class="absolute inset-0 rounded-full border border-amber-400/30 animate-ping opacity-20"></div>
                  <UserRoundPlus size={18} class="text-slate-400" />
                </div>
                <div class="bg-slate-950/80 border border-white/10 rounded-md px-2 py-1 text-[10px] whitespace-nowrap backdrop-blur-sm">
                  <span class="text-white font-semibold">{node.name}</span> <span class="text-slate-500">{node.role}</span>
                </div>
              </div>
            {/each}
            
            <!-- Connection Lines (SVG) -->
            <svg class="absolute inset-0 w-full h-full pointer-events-none opacity-30" stroke="currentColor" fill="none">
              <path d="M50% 50% L12% 24%" class="text-amber-500" stroke-width="1" stroke-dasharray="4" />
              <path d="M50% 50% L68% 16%" class="text-emerald-500" stroke-width="1" stroke-dasharray="4" />
              <path d="M50% 50% L82% 54%" class="text-cyan-500" stroke-width="1" stroke-dasharray="4" />
              <path d="M50% 50% L20% 68%" class="text-violet-500" stroke-width="1" stroke-dasharray="4" />
              <path d="M50% 50% L56% 76%" class="text-pink-500" stroke-width="1" stroke-dasharray="4" />
            </svg>
          </div>
        </div>
      </section>

      <!-- FEATURES -->
      <section id="features" class="w-full max-w-7xl mx-auto px-6 py-24 border-t border-white/5" data-section="features">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-5xl font-bold tracking-tight text-white">Everything you need to connect.</h2>
          <p class="mt-4 text-slate-400">A comprehensive suite of tools designed to enhance every aspect of event networking.</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {#each features as feature, i}
            {@const tint = tintClasses[feature.tint]}
            <div class="group relative p-6 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-white/10 hover:bg-slate-800/50 transition-all duration-300 overflow-hidden flex flex-col h-full hover:-translate-y-1" class:opacity-0={!isVisible('features')} class:animate-fade-in-up={isVisible('features')} style="animation-delay: {i * 50}ms; animation-fill-mode: forwards;">
              <div class="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>
              
              <div class="w-10 h-10 rounded-xl {tint.bg} border {tint.border} flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                <svelte:component this={feature.icon} size={20} class={tint.icon} />
              </div>
              
              <h3 class="text-slate-200 font-semibold mb-2">{feature.title}</h3>
              <p class="text-slate-500 text-sm leading-relaxed flex-grow">{feature.desc}</p>
            </div>
          {/each}
        </div>
      </section>

      <!-- HOW IT WORKS (TIMELINE) -->
      <section id="workflow" class="w-full max-w-6xl mx-auto px-6 py-24 border-t border-white/5" data-section="workflow">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-5xl font-bold tracking-tight text-white">How it works</h2>
          <p class="mt-4 text-slate-400">A seamless journey from registration to meaningful conversation.</p>
        </div>
        
        <div class="relative overflow-hidden py-10">
          <div class="flex overflow-x-auto pb-8 hide-scrollbar snap-x snap-mandatory gap-4 px-4 mask-edges">
            {#each timelineSteps as step, i}
              <div class="relative flex flex-col items-center snap-center shrink-0 w-40" class:opacity-0={!isVisible('workflow')} class:animate-fade-in={isVisible('workflow')} style="animation-delay: {i * 100}ms; animation-fill-mode: forwards;">
                <div class="w-full h-0.5 bg-slate-800 absolute top-6 -z-10 {i === 0 ? 'left-1/2' : i === timelineSteps.length - 1 ? 'right-1/2' : ''}"></div>
                <div class="w-12 h-12 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-slate-400 font-bold mb-4 shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-colors hover:border-amber-500 hover:text-amber-400">
                  {i + 1}
                </div>
                <div class="text-center text-sm font-medium text-slate-300 px-2">{step}</div>
              </div>
            {/each}
          </div>
        </div>
      </section>

      <!-- ORGANIZER SECTION -->
      <section id="organizers" class="w-full max-w-6xl mx-auto px-6 py-24 border-t border-white/5" data-section="organizer">
        <div class="grid md:grid-cols-2 gap-16 items-center">
          <div class="space-y-6">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-medium">
              <LayoutDashboard size={14} /> Organizer Tools
            </div>
            <h2 class="text-3xl md:text-5xl font-bold tracking-tight text-white">Measure the unmeasurable.</h2>
            <p class="text-slate-400 text-lg">
              Track real networking engagement. See AI matches, connections made, and venue activity in real-time with our comprehensive analytics dashboard.
            </p>
            <ul class="space-y-3 text-slate-300 text-sm">
              <li class="flex items-center gap-3"><div class="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> Total Participants & Engagement Rates</li>
              <li class="flex items-center gap-3"><div class="w-1.5 h-1.5 rounded-full bg-cyan-400"></div> Active Conversations & Connections</li>
              <li class="flex items-center gap-3"><div class="w-1.5 h-1.5 rounded-full bg-amber-400"></div> Interactive 2D Venue Management</li>
            </ul>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            {#each organizerMetrics.slice(0,4) as metric, i}
              <div class="bg-slate-900/50 border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-center text-center hover:border-white/10 transition-colors">
                <div class="text-4xl font-bold text-white mb-2 tracking-tight">
                  {animatedMetrics[i]}{metric.suffix}
                </div>
                <div class="text-xs font-medium text-slate-500 uppercase tracking-wider">{metric.label}</div>
              </div>
            {/each}
          </div>
        </div>
      </section>

      <!-- AI STACK -->
      <section id="tech" class="w-full max-w-6xl mx-auto px-6 py-24 border-t border-white/5" data-section="technology">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-5xl font-bold tracking-tight text-white">Powered by AI</h2>
          <p class="mt-4 text-slate-400">State-of-the-art models for semantic understanding and generation.</p>
        </div>
        
        <div class="grid md:grid-cols-2 gap-6">
          {#each techChips as tech, i}
            <div class="relative group p-8 rounded-3xl bg-slate-900/30 border border-white/5 overflow-hidden flex flex-col items-start gap-4 transition-all duration-500 hover:bg-slate-900/60 hover:border-white/10" class:opacity-0={!isVisible('technology')} class:animate-fade-in-up={isVisible('technology')} style="animation-delay: {i * 100}ms; animation-fill-mode: forwards;">
              <!-- Subtle glow on hover -->
              <div class="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:via-cyan-500/5 group-hover:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              
              <div class="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <svelte:component this={tech.icon} size={24} />
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
      <section class="w-full max-w-6xl mx-auto px-6 py-24 border-t border-white/5" data-section="why">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/5">
          {#each whyStats as stat, i}
            <div class="flex flex-col items-center justify-center text-center px-4" class:opacity-0={!isVisible('why')} class:animate-fade-in={isVisible('why')} style="animation-delay: {i * 100}ms; animation-fill-mode: forwards;">
              <div class="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-500 mb-2">
                {animatedWhyStats[i]}{stat.suffix}
              </div>
              <div class="text-sm font-medium text-slate-500">{stat.label}</div>
            </div>
          {/each}
        </div>
      </section>

      <!-- CTA -->
      <section class="w-full max-w-4xl mx-auto px-6 py-32 text-center">
        <div class="relative rounded-3xl p-12 overflow-hidden border border-white/10 bg-gradient-to-b from-slate-900/50 to-black shadow-2xl">
          <!-- Background Glows -->
          <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-amber-500/10 blur-[100px] pointer-events-none"></div>
          
          <h2 class="relative z-10 text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
            Ready to Build<br/>Meaningful Connections?
          </h2>
          <div class="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <button onclick={goToPrimaryAction} class="h-12 px-8 rounded-full bg-white text-black font-bold hover:scale-105 transition-transform w-full sm:w-auto shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              Create Your First Event
            </button>
            <button onclick={goToPrimaryAction} class="h-12 px-8 rounded-full border border-slate-700 bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors w-full sm:w-auto">
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
    <footer class="w-full border-t border-white/5 bg-black py-12 px-6">
      <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded bg-amber-500 flex items-center justify-center text-black">
            <Sparkles size={12} />
          </div>
          <span class="text-slate-300 font-semibold text-sm">EventNetwork AI</span>
        </div>
        
        <div class="flex gap-6 text-sm text-slate-500">
          <a href="#features" class="hover:text-slate-300 transition-colors">Features</a>
          <a href="#why" class="hover:text-slate-300 transition-colors">About</a>
          <a href="https://github.com/tr1nadh/eventnetwork-ai" target="_blank" class="hover:text-slate-300 transition-colors">GitHub</a>
          <a href="#" class="hover:text-slate-300 transition-colors">Documentation</a>
          <a href="#" class="hover:text-slate-300 transition-colors">Contact</a>
        </div>
      </div>
      
      <div class="max-w-7xl mx-auto mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 border-t border-white/5 pt-8 text-xs text-slate-600">
        <span>Built for AMD Developer Hackathon ACT II</span>
        <span class="hidden sm:inline">•</span>
        <span>Powered by Fireworks AI</span>
      </div>
    </footer>
  </div>
</div>

<style>
  :global(html) {
    scroll-behavior: smooth;
  }
  
  .scrolled-nav {
    background-color: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(12px);
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
    from { opacity: 0; transform: translateY(20px); }
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
</style>
`;

fs.writeFileSync('generate_page.js', `
const fs = require('fs');
fs.writeFileSync(${JSON.stringify(pagePath)}, ${JSON.stringify(scriptBlock + '\\n' + newTemplate)});
`);
console.log("Created generation script");
