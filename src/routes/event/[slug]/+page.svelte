<script>
  import { goto } from '$app/navigation';
  import {
    ArrowRight,
    LoaderCircle,
    LogIn,
    MapPin,
    Sparkles,
    Users,
    CheckCircle2,
    RefreshCcw
  } from '@lucide/svelte';
  import Navbar from '$lib/components/navbar.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent
  } from '$lib/components/ui/card/index.js';
  import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { toast } from '$lib/components/ui/sonner/index.js';
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import { onMount } from 'svelte';

  export let data;

  const supabase = createSupabaseBrowserClient();
  const storageBase = `eventnetwork:event:${data.event.slug}`;
  const pendingJoinKey = `${storageBase}:pending-join`;

  let signingOut = false;
  let joining = false;
  let savingProfile = false;
  let refreshingMatches = false;
  let stage = 'preview';
  let activeTab = 'details';
  let matches = data.suggestedMatches ?? [];
  let networkingProfile = {
    whoTheyAre: '',
    whatTheyDo: '',
    whoTheyWant: '',
    expectations: ''
  };

  function profileKey(userId) {
    return `${storageBase}:profile:${userId}`;
  }

  function loadStoredWorkspace(userId) {
    if (typeof localStorage === 'undefined') return;

    const rawProfile = localStorage.getItem(profileKey(userId));
    if (!rawProfile) return;

    try {
      const stored = JSON.parse(rawProfile);

      networkingProfile = {
        whoTheyAre: stored.profile?.whoTheyAre ?? '',
        whatTheyDo: stored.profile?.whatTheyDo ?? '',
        whoTheyWant: stored.profile?.whoTheyWant ?? '',
        expectations: stored.profile?.expectations ?? ''
      };
      matches = stored.matches?.length ? stored.matches : matches;
      stage = 'workspace';
      activeTab = 'details';
    } catch {
      localStorage.removeItem(profileKey(userId));
    }
  }

  function storeWorkspace(userId, nextMatches) {
    localStorage.setItem(
      profileKey(userId),
      JSON.stringify({
        profile: networkingProfile,
        matches: nextMatches
      })
    );
    localStorage.removeItem(pendingJoinKey);
  }

  async function signOut() {
    signingOut = true;
    await supabase.auth.signOut();
    signingOut = false;
    await goto('/');
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/event/${data.event.slug}`
      }
    });

    if (error) {
      toast.error('Google sign-in failed', {
        description: error.message
      });
    }
  }

  async function joinEvent() {
    if (joining) return;

    joining = true;

    try {
      localStorage.setItem(pendingJoinKey, '1');

      if (!data.user) {
        await signInWithGoogle();
        return;
      }

      stage = 'profile';
      toast.success('Joined event', {
        description: 'Complete your networking profile to unlock event tabs and matches.'
      });
    } catch (error) {
      toast.error('Could not join event', {
        description: error instanceof Error ? error.message : 'Please try again.'
      });
    } finally {
      joining = false;
    }
  }

  async function fetchRecommendations() {
    const response = await fetch('/api/recommendations', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        profile: networkingProfile
      })
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error ?? 'Unable to build recommendations.');
    }

    return payload?.recommendations ?? [];
  }

  async function saveProfile() {
    if (!data.user) {
      toast.error('Sign in first', {
        description: 'You need a Google account before saving your networking profile.'
      });
      return;
    }

    savingProfile = true;

    try {
      const nextMatches = await fetchRecommendations();
      matches = nextMatches;
      storeWorkspace(data.user.id, nextMatches);
      stage = 'workspace';
      activeTab = 'details';

      toast.success('Networking profile saved', {
        description: 'Your event workspace is ready.'
      });
    } catch (error) {
      toast.error('Could not save profile', {
        description: error instanceof Error ? error.message : 'Please try again.'
      });
    } finally {
      savingProfile = false;
    }
  }

  async function refreshMatches() {
    if (!data.user) return;

    refreshingMatches = true;

    try {
      const nextMatches = await fetchRecommendations();
      matches = nextMatches;
      storeWorkspace(data.user.id, nextMatches);
      toast.success('Matches refreshed', {
        description: 'The recommendations are up to date.'
      });
    } catch (error) {
      toast.error('Could not refresh matches', {
        description: error instanceof Error ? error.message : 'Please try again.'
      });
    } finally {
      refreshingMatches = false;
    }
  }

  function setActiveTab(value) {
    activeTab = value;
  }

  onMount(() => {
    if (!data.user) return;

    const pendingJoin = localStorage.getItem(pendingJoinKey) === '1';

    if (pendingJoin) {
      stage = 'profile';
    }

    loadStoredWorkspace(data.user.id);

    if (stage !== 'workspace' && pendingJoin) {
      stage = 'profile';
    }
  });
</script>

<svelte:head>
  <title>{data.event.name} | EventNetwork AI</title>
</svelte:head>

<main class="min-h-screen bg-[#050816] text-white">
  <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.16),_transparent_36%),radial-gradient(circle_at_85%_20%,_rgba(45,212,191,0.16),_transparent_32%),linear-gradient(180deg,_rgba(2,6,23,0.96),_rgba(2,6,23,1))]"></div>
  <section class="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <Navbar user={data.user} {signingOut} onSignOut={signOut} onSignIn={joinEvent} />

    {#if stage === 'preview'}
      <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <Card className="space-y-6 p-6">
          <Badge variant="secondary" className="gap-2 px-4 py-2 text-sm text-slate-200">
            <Sparkles size={16} class="text-amber-300" />
            Event preview
          </Badge>

          <CardHeader className="space-y-3">
            <CardTitle className="text-4xl sm:text-5xl">{data.event.name}</CardTitle>
            <CardDescription className="max-w-3xl text-base leading-7">{data.event.description}</CardDescription>
          </CardHeader>

          <div class="grid gap-3 sm:grid-cols-2">
            <Card className="border-white/10 bg-slate-950/60 p-4">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Event ID</p>
              <p class="mt-2 text-sm font-semibold text-white">{data.event.slug}</p>
            </Card>
            <Card className="border-white/10 bg-slate-950/60 p-4">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Organizer access</p>
              <p class="mt-2 text-sm font-semibold text-white">Google sign-in required</p>
            </Card>
          </div>

          <div class="flex flex-wrap gap-3">
            <Button onclick={joinEvent} disabled={joining}>
              {#if joining}
                <LoaderCircle size={16} class="animate-spin" />
                Redirecting
              {:else}
                <LogIn size={16} />
                {#if data.user}Join event{:else}Join with Google{/if}
              {/if}
            </Button>
            {#if data.user}
              <Button variant="secondary" onclick={() => (stage = 'profile')}>
                <ArrowRight size={16} />
                Continue
              </Button>
            {/if}
          </div>
        </Card>

        <Card className="space-y-5 p-6">
          <CardHeader>
            <div class="flex items-center gap-2 text-cyan-200">
              <Users size={18} />
              <p class="text-sm font-semibold uppercase tracking-[0.2em]">What happens next</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 text-sm leading-6 text-slate-300">
            <Card className="border-white/10 bg-slate-950/60 p-4">1. Sign in with Google to confirm your attendance.</Card>
            <Card className="border-white/10 bg-slate-950/60 p-4">2. Fill a short networking profile so the AI can understand your intent.</Card>
            <Card className="border-white/10 bg-slate-950/60 p-4">3. Review event details, edit your profile, and explore the best matches.</Card>
          </CardContent>
        </Card>
      </div>
    {:else if stage === 'profile'}
      <div class="mx-auto max-w-4xl">
        <Card className="space-y-6 p-6">
          <CardHeader className="space-y-2">
            <Badge variant="accent" className="w-fit uppercase tracking-[0.18em]">Mandatory profile</Badge>
            <CardTitle className="text-3xl">Tell us who you are</CardTitle>
            <CardDescription>
              This profile powers the semantic matching engine and will be visible only inside your event workspace.
            </CardDescription>
          </CardHeader>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="md:col-span-2">
              <Label for="whoTheyAre">Who are you?</Label>
              <Input
                id="whoTheyAre"
                bind:value={networkingProfile.whoTheyAre}
                placeholder="Builder, founder, designer, student, operator..."
              />
            </div>

            <div class="md:col-span-2">
              <Label for="whatTheyDo">What do you do?</Label>
              <Input
                id="whatTheyDo"
                bind:value={networkingProfile.whatTheyDo}
                placeholder="I build consumer AI tools for early-stage startups."
              />
            </div>

            <div class="md:col-span-2">
              <Label for="whoTheyWant">Who do you want to network with?</Label>
              <Input
                id="whoTheyWant"
                bind:value={networkingProfile.whoTheyWant}
                placeholder="Founders, product designers, AI engineers, investors..."
              />
            </div>

            <div class="md:col-span-2">
              <Label for="expectations">What are your expectations?</Label>
              <Input
                id="expectations"
                bind:value={networkingProfile.expectations}
                placeholder="Looking for meaningful intros, cofounder chats, and practical collaborations."
              />
            </div>
          </div>

          <div class="flex flex-wrap gap-3">
            <Button onclick={saveProfile} disabled={savingProfile}>
              {#if savingProfile}
                <LoaderCircle size={16} class="animate-spin" />
                Saving
              {:else}
                <CheckCircle2 size={16} />
                Save networking profile
              {/if}
            </Button>
            <Button variant="secondary" onclick={() => (stage = 'preview')}>
              Back to event preview
            </Button>
          </div>
        </Card>
      </div>
    {:else}
      <div class="space-y-6">
        <Card className="space-y-5 p-6">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="space-y-3">
              <Badge variant="success" className="gap-2">
                <CheckCircle2 size={14} />
                Joined event
              </Badge>
              <div>
                <h1 class="text-4xl font-black tracking-tight">{data.event.name}</h1>
                <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{data.event.description}</p>
              </div>
            </div>

            <div class="flex flex-wrap gap-3">
              <Button variant="secondary" onclick={refreshMatches} disabled={refreshingMatches}>
                {#if refreshingMatches}
                  <LoaderCircle size={16} class="animate-spin" />
                  Refreshing
                {:else}
                  <RefreshCcw size={16} />
                  Refresh matches
                {/if}
              </Button>
              <Button onclick={() => (stage = 'profile')}>
                <ArrowRight size={16} />
                Edit networking profile
              </Button>
            </div>
          </div>

          <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
            <Tabs.List className="grid w-full grid-cols-3 overflow-x-auto">
              <Tabs.Trigger value="details">Event details</Tabs.Trigger>
              <Tabs.Trigger value="networking">Networking profile</Tabs.Trigger>
              <Tabs.Trigger value="matches">Matches</Tabs.Trigger>
            </Tabs.List>

          <Tabs.Content value="details" className="mt-4">
            <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <Card className="space-y-4 p-5">
                <CardHeader>
                  <div class="flex items-center gap-2 text-amber-200">
                    <MapPin size={18} />
                    <p class="text-sm font-semibold uppercase tracking-[0.2em]">Event summary</p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 text-sm leading-6 text-slate-300">
                  <p>{data.event.description}</p>
                  <div class="grid gap-3 sm:grid-cols-2">
                    <Card className="border-white/10 bg-slate-950/60 p-4">
                      <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Event ID</p>
                      <p class="mt-2 font-semibold text-white">{data.event.slug}</p>
                    </Card>
                    <Card className="border-white/10 bg-slate-950/60 p-4">
                      <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Room status</p>
                      <p class="mt-2 font-semibold text-white">Networking profile complete</p>
                    </Card>
                  </div>
                </CardContent>
                </Card>

              <Card className="space-y-4 p-5">
                <CardHeader>
                  <div class="flex items-center gap-2 text-cyan-200">
                    <Users size={18} />
                    <p class="text-sm font-semibold uppercase tracking-[0.2em]">Event flow</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-300">
                  <Card className="border-white/10 bg-slate-950/60 p-4">1. Attendees join with Google.</Card>
                  <Card className="border-white/10 bg-slate-950/60 p-4">2. The mandatory networking profile unlocks the workspace.</Card>
                  <Card className="border-white/10 bg-slate-950/60 p-4">3. Matches are generated with explanations for each suggested intro.</Card>
                </CardContent>
                </Card>
              </div>
            </Tabs.Content>

            <Tabs.Content value="networking" className="mt-4">
              <Card className="space-y-5 p-5">
                <CardHeader>
                  <div class="flex items-center gap-2 text-amber-200">
                    <Sparkles size={18} />
                    <p class="text-sm font-semibold uppercase tracking-[0.2em]">Edit networking profile</p>
                  </div>
                </CardHeader>

                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div class="md:col-span-2">
                    <Label for="workspace-whoTheyAre">Who are you?</Label>
                    <Input id="workspace-whoTheyAre" bind:value={networkingProfile.whoTheyAre} />
                  </div>
                  <div class="md:col-span-2">
                    <Label for="workspace-whatTheyDo">What do you do?</Label>
                    <Input id="workspace-whatTheyDo" bind:value={networkingProfile.whatTheyDo} />
                  </div>
                  <div class="md:col-span-2">
                    <Label for="workspace-whoTheyWant">Who do you want to network with?</Label>
                    <Input id="workspace-whoTheyWant" bind:value={networkingProfile.whoTheyWant} />
                  </div>
                  <div class="md:col-span-2">
                    <Label for="workspace-expectations">What are your expectations?</Label>
                    <Input id="workspace-expectations" bind:value={networkingProfile.expectations} />
                  </div>
                </CardContent>

                <div class="flex flex-wrap gap-3">
                  <Button onclick={saveProfile} disabled={savingProfile}>
                    {#if savingProfile}
                      <LoaderCircle size={16} class="animate-spin" />
                      Saving
                    {:else}
                      <CheckCircle2 size={16} />
                      Save changes
                    {/if}
                  </Button>
                  <Button variant="secondary" onclick={refreshMatches} disabled={refreshingMatches}>
                    {#if refreshingMatches}
                      <LoaderCircle size={16} class="animate-spin" />
                      Refreshing
                    {:else}
                      <RefreshCcw size={16} />
                      Refresh matches
                    {/if}
                  </Button>
                </div>
              </Card>
            </Tabs.Content>

            <Tabs.Content value="matches" className="mt-4">
              <div class="grid gap-4 lg:grid-cols-3">
                {#if matches.length}
                  {#each matches as match}
                    <Card className="space-y-4 p-5">
                      <CardHeader className="flex items-start justify-between gap-3">
                        <div>
                          <h3 class="text-xl font-bold text-white">{match.name}</h3>
                          <p class="mt-1 text-sm text-slate-300">
                            {match.role} at {match.company}
                          </p>
                        </div>
                        <Badge variant="accent">Match</Badge>
                      </CardHeader>

                      <CardContent>
                        <p class="text-sm leading-6 text-slate-300">{match.about}</p>
                      {#if match.explanation}
                        <Alert variant="info" className="mt-4 border-white/10 bg-slate-950/60 text-slate-200">
                          <AlertTitle className="text-xs uppercase tracking-[0.2em] text-cyan-200">Why this match</AlertTitle>
                          <AlertDescription className="mt-2 leading-6">{match.explanation}</AlertDescription>
                        </Alert>
                      {/if}

                      <div class="flex flex-wrap gap-2">
                        {#each match.tags.slice(0, 4) as tag}
                          <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                            #{tag}
                          </span>
                        {/each}
                      </div>
                      </CardContent>
                    </Card>
                  {/each}
                {:else}
                  <Card className="p-6">
                    <p class="text-sm text-slate-300">No matches available yet. Save your profile to generate recommendations.</p>
                  </Card>
                {/if}
              </div>
            </Tabs.Content>
          </Tabs.Root>
        </Card>
      </div>
    {/if}
  </section>
</main>
