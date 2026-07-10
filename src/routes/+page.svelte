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
    ChartNoAxesCombined
  } from '@lucide/svelte';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { Button } from '$lib/components/ui/button/index.js';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent
  } from '$lib/components/ui/card/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert/index.js';
  import Navbar from '$lib/components/navbar.svelte';
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
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/events`
      }
    });

    if (authError) {
      error = authError.message;
      signingIn = false;
    }
  }

  async function signOut() {
    signingOut = true;
    error = '';
    const { error: authError } = await supabase.auth.signOut();
    if (authError) error = authError.message;
    signingOut = false;
  }
</script>

<svelte:head>
  <title>EventNetwork AI</title>
  <meta
    name="description"
    content="AI-powered networking for hackathons, conferences, and meetups."
  />
</svelte:head>

<main class="min-h-screen bg-[#050816] text-white">
  <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.16),_transparent_36%),radial-gradient(circle_at_85%_20%,_rgba(45,212,191,0.16),_transparent_32%),linear-gradient(180deg,_rgba(2,6,23,0.96),_rgba(2,6,23,1))]"></div>
  <div class="absolute inset-0 bg-radial-grid bg-[length:24px_24px] opacity-25"></div>

  <section class="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <Navbar
      {user}
      {signingIn}
      {signingOut}
      onSignIn={signInWithGoogle}
      onSignOut={signOut}
    />

    <div class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
      <div class="space-y-7">
        <div class="space-y-4">
          <Badge variant="secondary" className="gap-2 px-4 py-2 text-sm text-slate-200">
            <PartyPopper size={16} class="text-amber-300" />
            Built for hackathons, conferences, and meetups
          </Badge>
          <h1 class="max-w-3xl text-5xl font-black tracking-tight text-white sm:text-6xl">
            Turn every event into a room full of useful introductions.
          </h1>
          <p class="max-w-2xl text-lg leading-8 text-slate-300">
            EventNetwork AI helps organizers share one private link, lets attendees join with Google, capture a short
            networking profile, and recommends the best people to meet with clear explanations.
          </p>
        </div>

        <div class="flex flex-wrap gap-3">
          <Button onclick={signInWithGoogle} disabled={signingIn}>
            <LogIn size={16} />
            {#if signingIn}Redirecting{:else}Sign in to continue{/if}
          </Button>
          <Button variant="secondary" onclick={() => goto(`/event/${demoEvent.slug}`)}>
            Preview event flow
            <ArrowRight size={16} />
          </Button>
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <Card className="border-amber-300/15 bg-amber-300/8 p-4">
            <CardHeader>
              <ClipboardList class="text-amber-300" size={20} />
              <CardTitle className="text-sm">Attendee profile</CardTitle>
              <CardDescription>Capture who they are, what they do, who they want, and expectations.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-cyan-300/15 bg-cyan-300/8 p-4">
            <CardHeader>
              <ScanSearch class="text-cyan-300" size={20} />
              <CardTitle className="text-sm">AI match engine</CardTitle>
              <CardDescription>Rank people by intent, topic, and collaboration fit.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-white/10 bg-white/5 p-4">
            <CardHeader>
              <ChartNoAxesCombined class="text-white" size={20} />
              <CardTitle className="text-sm">Organizer analytics</CardTitle>
              <CardDescription>See attendee interests, trends, and engagement in real time.</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="border-white/10 bg-white/5 p-6">
          <CardHeader>
            <div class="flex items-center gap-2 text-emerald-200">
              <Users size={18} />
              <p class="text-sm font-semibold uppercase tracking-[0.2em]">How it works</p>
            </div>
          </CardHeader>
          <CardContent className="mt-4 grid gap-4 md:grid-cols-4">
            <div>
              <p class="text-sm font-semibold text-white">1. Create event</p>
              <p class="mt-1 text-sm text-slate-300">Organizer creates a private event and shares one link.</p>
            </div>
            <div>
              <p class="text-sm font-semibold text-white">2. Join with Google</p>
              <p class="mt-1 text-sm text-slate-300">Attendees log in and fill out a short networking profile.</p>
            </div>
            <div>
              <p class="text-sm font-semibold text-white">3. Get matches</p>
              <p class="mt-1 text-sm text-slate-300">AI ranks the most relevant people and explains why.</p>
            </div>
            <div>
              <p class="text-sm font-semibold text-white">4. Review analytics</p>
              <p class="mt-1 text-sm text-slate-300">Organizers see audience themes and engagement trends live.</p>
            </div>
          </CardContent>
        </Card>

        {#if error}
          <Alert variant="destructive" className="max-w-xl">
            <AlertTitle>Authentication error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        {/if}
      </div>

      <Card className="overflow-hidden p-0">
        <CardHeader className="border-b border-white/10 bg-white/5 px-6 py-5">
          <Badge variant="accent" className="w-fit">Demo event</Badge>
          <CardTitle className="mt-1 text-2xl">{demoEvent.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          <div class="space-y-2 text-sm text-slate-300">
            <p>{demoEvent.description}</p>
            <p class="flex items-center gap-2 text-slate-200"><MapPin size={16} />{demoEvent.city} - {demoEvent.date}</p>
            <p class="flex items-center gap-2 text-slate-200"><Users size={16} />{demoEvent.format}</p>
          </div>

          <Card className="border-white/10 bg-slate-950/60 p-4">
            <CardHeader className="pb-2">
              <Badge variant="info" className="w-fit uppercase tracking-[0.18em]">Flow</Badge>
            </CardHeader>
            <CardContent>
              <ol class="space-y-3 text-sm text-slate-200">
                <li>1. Organizer creates the event and shares a unique link.</li>
                <li>2. Attendee signs in with Google and completes a short profile.</li>
                <li>3. AI surfaces the most relevant connections with explanations.</li>
                <li>4. Organizer sees live audience insights and networking trends.</li>
              </ol>
            </CardContent>
          </Card>

          <Alert variant="success">
            <AlertTitle>Signed in status</AlertTitle>
            <AlertDescription className="mt-1 text-lg font-semibold">
              {#if user}
                Welcome back, {user.email}
              {:else}
                Google sign-in ready
              {/if}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  </section>
</main>
