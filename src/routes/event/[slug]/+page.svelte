<script>
  import { goto } from "$app/navigation";
  import {
    ArrowLeft,
    ArrowRight,
    LoaderCircle,
    LogIn,
    MapPin,
    Sparkles,
    Users,
    CheckCircle2,
    RefreshCcw,
    Brain,
    UserCircle2,
    Target,
    MessageSquare,
    Info,
  } from "@lucide/svelte";
  import Navbar from "$lib/components/navbar.svelte";
  import PageShell from "$lib/components/page-shell.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { toast } from "$lib/components/ui/sonner/index.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { createSupabaseBrowserClient } from "$lib/supabase/client";
  import { onMount } from "svelte";

  const supabase = createSupabaseBrowserClient();

  export let data;

  let signingOut = false;
  let joining = false;
  let savingProfile = false;
  let loadingProfile = false;
  let pageLoading = true;
  let loadError = "";
  let profileLoaded = false;
  let refreshingMatches = false;
  let activeTab = "details";
  let editProfileOpen = false;
  let stage = data.isParticipant ? "workspace" : "preview";

  async function fetchMatches() {
    refreshingMatches = true;
    try {
      const res = await fetch(`/api/recommendations?event_id=${data.event.id}`, {
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to fetch matches");
      const { recommendations } = await res.json();
      matches = recommendations || [];
    } catch (error) {
      toast.error("Could not find matches");
    } finally {
      refreshingMatches = false;
    }
  }

  let matches = data.suggestedMatches ?? [];
  let networkingProfile = {
    whoTheyAre: "",
    whatTheyDo: "",
    whoTheyWant: "",
    expectations: "",
  };
  // If server provided a network profile, use it as initial data
  if (data.networkProfile) {
    networkingProfile = { ...networkingProfile, ...data.networkProfile };
  }

  async function signOut() {
    signingOut = true;
    await supabase.auth.signOut();
    signingOut = false;
    await goto("/");
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/event/${data.event.slug}`,
      },
    });
    if (error)
      toast.error("Google sign-in failed", { description: error.message });
  }

  async function joinEvent() {
    if (joining) return;
    joining = true;
    try {
      if (!data.user) {
        await signInWithGoogle();
        return;
      }

      // Register the join in the database
      const res = await fetch("/api/events/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: data.event.id }),
      });

      if (!res.ok) {
        throw new Error("Failed to register event participation in database");
      }

      stage = "profile";
      toast.success("Joined event", {
        description: "Complete your networking profile to unlock matches.",
      });
    } catch (error) {
      toast.error("Could not join event", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      joining = false;
    }
  }

  async function saveProfile() {
    if (!data.user) {
      toast.error("Sign in first", {
        description:
          "You need a Google account before saving your networking profile.",
      });
      return;
    }
    savingProfile = true;
    try {
      // Matches are no longer fetched on save; only the profile is saved.
      // Save networking profile to DB
      const profileRes = await fetch("/api/network_profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        mode: "same-origin",
        body: JSON.stringify({
          profile: networkingProfile,
          event_id: data.event.id,
        }),
      });
      const profilePayload = await profileRes.json();
      if (!profileRes.ok) {
        throw new Error(
          profilePayload.error ?? "Failed to save networking profile",
        );
      }
      // Transform DB row to UI shape
      const normalizeProfile = (p) => {
        let lookingForStr = p.looking_for ?? '';
        try {
          const parsed = JSON.parse(lookingForStr);
          if (Array.isArray(parsed)) {
            lookingForStr = parsed.join(', ');
          }
        } catch(e) {}
        return {
          whoTheyAre: p.display_name,
          whatTheyDo: p.what_i_do,
          whoTheyWant: lookingForStr,
          expectations: p.about_me,
        };
      };
      if (profilePayload.profile) {
        networkingProfile = {
          ...networkingProfile,
          ...normalizeProfile(profilePayload.profile),
        };
      }
      profileLoaded = true;
      stage = "workspace";
      editProfileOpen = false;
      toast.success("Networking profile saved", {
        description: "Your event workspace is ready.",
      });
    } catch (error) {
      toast.error("Could not save profile", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      savingProfile = false;
    }
  }

  async function loadNetworkProfile() {
    loadingProfile = true;
    try {
      console.log("Loading network profile for event", data.event.id);
      const res = await fetch(
        `/api/network_profiles?event_id=${data.event.id}`,
        {
          credentials: "include",
        },
      );
      if (!res.ok) {
        const err = await res.json();
        console.error("Failed to load profile", err);
        toast.error("Failed to load profile", {
          description: err.error ?? "Unknown error",
        });
        throw new Error("Failed to load profile");
      }
      const responseData = await res.json();
      console.log("Profile load response", responseData);
      if (responseData.profile) {
        // whoTheyWant is correctly handled by the API now
        networkingProfile = { ...networkingProfile, ...responseData.profile };
        profileLoaded = true;
        // User has a saved profile → show the workspace with details tab active
        stage = "workspace";
        activeTab = "details";
      } else if (data.isParticipant) {
        // Joined but no profile yet → go to profile fill-in form
        stage = "profile";
      }
    } catch (e) {
      loadError = "Could not load your saved profile.";
    } finally {
      loadingProfile = false;
    }
  }

  onMount(async () => {
    if (!data.user) {
      pageLoading = false;
      return;
    }

    // Load network profile first if participant
    if (data.isParticipant) {
      console.log("Loading network profile");
      await loadNetworkProfile();
    }
    // If no saved profile, prefill from Google
    // Page data ready – stop showing skeleton
    pageLoading = false;
  });

  const profileFields = [
    {
      key: "whoTheyAre",
      label: "Display Name",
      placeholder:
        "Enter the name you'd like other attendees to see during networking.",
      id: "whoTheyAre",
      wsId: "ws-whoTheyAre",
    },
    {
      key: "whatTheyDo",
      label: "What do you do?",
      placeholder:
        "Tell us what you're currently working on. This could be your job, startup, side project, research, freelancing, or anything you're actively building.",
      id: "whatTheyDo",
      wsId: "ws-whatTheyDo",
      suggestions: ["AI Engineer", "Founder", "Product Designer", "Researcher"],
    },
    {
      key: "whoTheyWant",
      label: "Who are you looking to meet?",
      placeholder:
        "Describe the people you'd like to connect with and why. For example, you might be looking for a technical co-founder, investors, designers, developers, mentors, recruiters, or collaborators for a project.",
      id: "whoTheyWant",
      wsId: "ws-whoTheyWant",
      suggestions: [
        "Investors",
        "Co‑founders",
        "Mentors",
        "Strategic Partners",
      ],
    },
    {
      key: "expectations",
      label: "Tell others about yourself",
      placeholder:
        "Share a little about yourself, including your experience, interests, skills, achievements, or the kind of work you're passionate about. This helps others understand who you are and makes AI matching more accurate.",
      id: "expectations",
      wsId: "ws-expectations",
    },
  ];
</script>

<svelte:head>
  <title>{data.event.name} | EventNetwork AI</title>
  <meta
    name="description"
    content="Join {data.event
      .name} on EventNetwork AI and get AI-powered networking matches."
  />
</svelte:head>

<PageShell>
  <Navbar
    user={data.user}
    {signingOut}
    onSignOut={signOut}
    onSignIn={joinEvent}
  />

  <main class="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
    <div class="mb-6 animate-slide-up">
      <button
        onclick={() => goto("/events")}
        class="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 transition hover:text-white"
      >
        <ArrowLeft size={16} />
        Back to events
      </button>
    </div>

    <!-- ─── PREVIEW STAGE ─── -->
    {#if stage === "preview"}
      <div
        class="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start animate-fade-in"
      >
        <!-- Left: Event info -->
        <div class="glass rounded-3xl border border-white/8 overflow-hidden">
          <div
            class="h-1 bg-gradient-to-r from-amber-400 via-amber-300/50 to-transparent"
          ></div>
          <div class="p-8 sm:p-10 space-y-8">
            <Badge
              variant="secondary"
              class="gap-2 border-amber-400/20 bg-amber-400/8 text-amber-200 text-xs font-bold uppercase tracking-widest px-3 py-1.5"
            >
              <Sparkles size={14} class="text-amber-400" />
              Event preview
            </Badge>

            <div>
              <h1
                class="text-4xl font-black tracking-tight text-white sm:text-6xl mb-4"
              >
                {data.event.name}
                {#if data.isParticipant}
                  <CheckCheck
                    size={20}
                    class="inline-block text-amber-400 ml-2"
                  />
                {/if}
              </h1>
              <p class="text-lg leading-relaxed text-ink-300 max-w-2xl">
                {data.event.description}
              </p>
            </div>

            <div class="grid gap-4 sm:grid-cols-2 mt-4">
              <div
                class="glass rounded-2xl p-5 border border-white/6 flex flex-col justify-center"
              >
                <p class="text-xs uppercase tracking-widest text-ink-500 mb-2">
                  Event ID
                </p>
                <p class="text-base font-mono font-semibold text-white">
                  {data.event.slug}
                </p>
              </div>
              <div
                class="glass rounded-2xl p-5 border border-white/6 flex flex-col justify-center"
              >
                <p class="text-xs uppercase tracking-widest text-ink-500 mb-2">
                  Access Requirements
                </p>
                <p
                  class="text-base font-semibold text-white flex items-center gap-2"
                >
                  <LogIn size={16} class="text-ink-400" />
                  Google Sign-in
                </p>
              </div>
            </div>

            <div class="flex flex-wrap gap-4 pt-2">
              {#if !data.isParticipant}
                <Button
                  id="join-event-btn"
                  onclick={joinEvent}
                  disabled={joining}
                  class="h-12 px-6 gap-2 text-base shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_30px_rgba(251,191,36,0.5)] transition-all"
                >
                  {#if joining}
                    <LoaderCircle size={18} class="animate-spin" />
                    Redirecting…
                  {:else}
                    <LogIn size={18} />
                    {#if data.user}Join event{:else}Join with Google{/if}
                  {/if}
                </Button>
              {:else}
                <div class="flex items-center gap-2 text-amber-400">
                  <CheckCheck size={18} /> Joined
                </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Right: What happens next -->
        <div class="glass rounded-3xl border border-white/8 p-8 sm:p-10">
          <div class="flex items-center gap-3 mb-8">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 border border-cyan-400/20"
            >
              <Users size={20} class="text-cyan-300" />
            </div>
            <p
              class="text-sm font-bold uppercase tracking-widest text-cyan-300"
            >
              What happens next
            </p>
          </div>

          <ol class="space-y-6">
            {#each [{ icon: LogIn, title: "Sign in with Google", desc: "Confirm your attendance with a quick OAuth login." }, { icon: UserCircle2, title: "Fill your profile", desc: "A short networking profile so the AI understands your intent." }, { icon: Brain, title: "Review AI matches", desc: "See the most relevant people and why each match was made." }] as step, i}
              <li class="flex items-start gap-4">
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 border border-white/10 text-sm font-bold text-ink-400 mt-0.5"
                >
                  {i + 1}
                </div>
                <div>
                  <p class="text-base font-semibold text-white mb-1">
                    {step.title}
                  </p>
                  <p class="text-sm leading-relaxed text-ink-400">
                    {step.desc}
                  </p>
                </div>
              </li>
            {/each}
          </ol>
        </div>
      </div>

      <!-- ─── PROFILE STAGE ─── -->
    {:else if stage === "profile"}
      <div class="mx-auto max-w-2xl animate-slide-up">
        <div
          class="glass rounded-2xl border border-violet-400/15 overflow-hidden"
        >
          <div
            class="h-0.5 bg-gradient-to-r from-violet-400 via-cyan-400/60 to-transparent"
          ></div>
          <div class="p-7 space-y-6">
            <div>
              <Badge
                variant="secondary"
                class="mb-3 gap-2 border-violet-400/20 bg-violet-400/8 text-violet-200 text-[10px] font-bold uppercase tracking-widest"
              >
                <Brain size={12} class="text-violet-300" />
                Networking profile
              </Badge>
              <h1 class="text-3xl font-black text-white">
                Tell us who you are
              </h1>
              <p class="mt-2 text-sm leading-6 text-ink-400">
                This profile powers the semantic matching engine. It's only
                visible inside your event workspace.
              </p>
            </div>

            <div class="h-px bg-white/6"></div>

            <div class="space-y-4">
              {#each profileFields as field}
                <div class="space-y-1.5">
                  <Label
                    for={field.id}
                    class="text-xs font-semibold uppercase tracking-widest text-ink-400"
                  >
                    {field.label}
                  </Label>
                  {#if loadingProfile}
                    <div class="h-10 bg-white/5 rounded animate-pulse"></div>
                  {:else if field.key === "whoTheyAre"}
                    <Input
                      id={field.id}
                      bind:value={networkingProfile[field.key]}
                      placeholder={field.placeholder}
                      class="bg-white/4 border-white/10 text-white placeholder:text-ink-600 focus:border-violet-400/50 focus:ring-violet-400/20"
                      list={field.suggestions ? field.key + "-list" : undefined}
                    />
                  {:else}
                    <textarea
                      id={field.id}
                      bind:value={networkingProfile[field.key]}
                      placeholder={field.placeholder}
                      class="bg-white/4 border-white/10 text-white placeholder:text-ink-600 focus:border-violet-400/50 focus:ring-violet-400/20 w-full rounded-md p-2"
                      rows="4"
                    ></textarea>
                  {/if}
                  {#if loadError && field.key === "whoTheyAre"}
                    <p class="text-sm text-amber-300">{loadError}</p>
                  {/if}
                  {#if field.suggestions}
                    <datalist id={field.key + "-list"}>
                      {#each field.suggestions as suggestion}
                        <option value={suggestion}></option>
                      {/each}
                    </datalist>
                  {/if}
                </div>
              {/each}
            </div>

            <div class="flex flex-wrap gap-3">
              <Button
                id="save-profile-btn"
                onclick={saveProfile}
                disabled={savingProfile}
                class="gap-2"
              >
                {#if savingProfile}
                  <LoaderCircle size={15} class="animate-spin" />
                  Saving profile…
                {:else}
                  <CheckCircle2 size={15} />
                  Save profile
                {/if}
              </Button>
              <Button
                variant="secondary"
                onclick={() => (stage = "preview")}
                class="gap-2"
              >
                Back
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── WORKSPACE STAGE ─── -->
    {:else}
      <div class="space-y-8 animate-fade-in">
        <!-- Workspace header -->
        {#if pageLoading}
          <div
            class="glass rounded-3xl border border-emerald-400/15 bg-emerald-400/4 p-8 sm:p-10"
          >
            <div class="flex flex-col items-center gap-6 animate-pulse">
              <div class="h-8 w-48 bg-ink-400 rounded"></div>
              <div class="h-4 w-96 bg-ink-400 rounded"></div>
            </div>
          </div>
        {:else}
          <div
            class="glass rounded-3xl border border-emerald-400/15 bg-emerald-400/4 p-8 sm:p-10"
          >
            <div class="flex flex-col items-center gap-6">
              <div class="space-y-3 text-center">
                <Badge
                  variant="secondary"
                  class="gap-2 border-emerald-400/20 bg-emerald-400/8 text-emerald-200 text-xs font-bold uppercase tracking-widest px-3 py-3"
                >
                  <CheckCircle2 size={14} class="text-emerald-400" />
                  Joined
                </Badge>
                <h1
                  class="text-4xl sm:text-5xl font-black tracking-tight text-white"
                >
                  {data.event.name}
                </h1>
                <p
                  class="text-base leading-relaxed text-ink-300 max-w-2xl mx-auto"
                >
                  {data.event.description}
                </p>
              </div>
            </div>
          </div>
        {/if}

        <Tabs.Root value={activeTab} onValueChange={(v) => (activeTab = v)}>
          <Tabs.List
            class="glass rounded-xl flex overflow-hidden divide-x divide-white/10"
          >
            <Tabs.Trigger
              value="details"
              class="flex-1 text-center py-2 text-sm font-medium transition-colors duration-200 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=inactive]:text-ink-500 hover:text-white"
            >
              <Info size={16} class="inline-block mr-1 align-text-bottom" />
              Details
            </Tabs.Trigger>

            <Tabs.Trigger
              value="matches"
              class="flex-1 text-center py-2 text-sm font-medium transition-colors duration-200 data-[state=active]:bg-amber-400/15 data-[state=active]:text-amber-200 data-[state=inactive]:text-ink-500 hover:text-amber-200"
            >
              <Users size={16} class="inline-block mr-1 align-text-bottom" />
              Matches {#if matches.length}<span
                  class="ml-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-bold text-amber-300"
                  >{matches.length}</span
                >{/if}
            </Tabs.Trigger>
          </Tabs.List>

          <!-- Details tab -->
          <Tabs.Content value="details" class="mt-4">
            <div class="grid gap-5 lg:grid-cols-2">
              <div class="glass rounded-2xl border border-white/8 p-6">
                <div class="flex items-center gap-2 mb-5">
                  <MapPin size={15} class="text-amber-300" />
                  <p
                    class="text-xs font-bold uppercase tracking-widest text-amber-300"
                  >
                    Event summary
                  </p>
                </div>
                <p class="text-sm leading-6 text-ink-300 mb-4">
                  {data.event.description}
                </p>
                <div class="grid gap-3 sm:grid-cols-2">
                  <div class="glass rounded-xl p-3 border border-white/6">
                    <p
                      class="text-[10px] uppercase tracking-widest text-ink-500 mb-1.5"
                    >
                      Event ID
                    </p>
                    <p class="text-sm font-mono font-semibold text-white">
                      {data.event.slug}
                    </p>
                  </div>
                  <div class="glass rounded-xl p-3 border border-white/6">
                    <p
                      class="text-[10px] uppercase tracking-widest text-ink-500 mb-1.5"
                    >
                      Room status
                    </p>
                    <p class="text-sm font-semibold text-emerald-300">
                      Profile complete ✓
                    </p>
                  </div>
                </div>
              </div>

              <div class="glass rounded-2xl border border-white/8 p-6">
                <div class="flex items-center gap-2 mb-5">
                  <Users size={15} class="text-cyan-300" />
                  <p
                    class="text-xs font-bold uppercase tracking-widest text-cyan-300"
                  >
                    Event flow
                  </p>
                </div>
                <ol class="space-y-3">
                  {#each ["Attendees join with Google.", "The mandatory networking profile unlocks the workspace.", "Matches are generated with explanations for each suggested intro."] as step, i}
                    <li class="flex items-start gap-3">
                      <span
                        class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/8 text-[10px] font-bold text-ink-500"
                        >{i + 1}</span
                      >
                      <p class="text-sm text-ink-300">{step}</p>
                    </li>
                  {/each}
                </ol>
              </div>
            </div>
          </Tabs.Content>

          <!-- Networking profile dialog (portaled outside) -->
          <Dialog.Root bind:open={editProfileOpen}>
            <Dialog.Content class="sm:max-w-2xl bg-[#0f0f11] border border-white/10 text-white max-h-[90vh] overflow-y-auto">
              <Dialog.Header class="hidden">
                <Dialog.Title>Edit networking profile</Dialog.Title>
              </Dialog.Header>
              <div class="flex items-center gap-2 mb-5">
                <Sparkles size={15} class="text-amber-300" />
                <p
                  class="text-xs font-bold uppercase tracking-widest text-amber-300"
                >
                  Edit networking profile
                </p>
              </div>
              <div class="grid gap-4 sm:grid-cols-2 mb-5">
                {#each profileFields as field}
                  <div class="space-y-1.5">
                    <Label
                      for={field.wsId}
                      class="text-xs font-semibold uppercase tracking-widest text-ink-400"
                    >
                      {field.label}
                    </Label>
                    {#if field.key === "whoTheyWant"}
                      <textarea
                        id={field.wsId}
                        bind:value={networkingProfile[field.key]}
                        class="bg-white/4 border-white/10 text-white placeholder:text-ink-600 focus:border-amber-400/50 focus:ring-amber-400/20 w-full rounded-md p-2"
                        rows="4"
                      ></textarea>
                    {:else}
                      <Input
                        id={field.wsId}
                        bind:value={networkingProfile[field.key]}
                        class="bg-white/4 border-white/10 text-white focus:border-amber-400/50 focus:ring-amber-400/20"
                      />
                    {/if}
                  </div>
                {/each}
              </div>
              <div class="flex flex-wrap gap-3">
                <Button
                  onclick={saveProfile}
                  disabled={savingProfile}
                  class="gap-2"
                >
                  {#if savingProfile}
                    <LoaderCircle size={15} class="animate-spin" />
                    Saving…
                  {:else}
                    <CheckCircle2 size={15} />
                    Save changes
                  {/if}
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Root>

          <!-- Matches tab -->
          <Tabs.Content value="matches" class="mt-4">
            <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div class="flex items-center gap-2">
                <Users size={18} class="text-white" />
                <h2 class="text-lg font-bold text-white">Your Matches</h2>
              </div>
              <div class="flex items-center gap-3">
                <Button variant="outline" class="border-white/10 text-white hover:bg-white/10" onclick={() => (editProfileOpen = true)}>
                  <UserCircle2 size={15} class="mr-2" />
                  Edit profile
                </Button>
                <Button class="gap-2" onclick={fetchMatches} disabled={refreshingMatches}>
                  {#if refreshingMatches}
                    <LoaderCircle size={15} class="animate-spin" />
                    Finding…
                  {:else}
                    <Sparkles size={15} />
                    Find matches
                  {/if}
                </Button>
              </div>
            </div>
            {#if matches.length}
              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {#each matches as match, i}
                  <div
                    class="glass card-hover rounded-2xl border border-white/8 overflow-hidden"
                  >
                    <!-- Match strength bar -->
                    <div
                      class="h-0.5 bg-gradient-to-r from-amber-400 to-cyan-400"
                      style="width: {Math.max(60, 100 - i * 12)}%"
                    ></div>

                    <div class="p-5 space-y-4">
                      <div class="flex items-start justify-between gap-3">
                        <div>
                          <h3 class="text-base font-bold text-white">
                            {match.name}
                          </h3>
                          <p class="mt-0.5 text-xs text-ink-400">
                            {match.role} · {match.company}
                          </p>
                        </div>
                        <span
                          class="shrink-0 rounded-full border border-amber-400/25 bg-amber-400/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300"
                        >
                          Match
                        </span>
                      </div>

                      <p class="text-xs leading-5 text-ink-300">
                        {match.about}
                      </p>

                      {#if match.explanation}
                        <div
                          class="rounded-xl border border-cyan-400/15 bg-cyan-400/6 p-3"
                        >
                          <p
                            class="text-[10px] font-bold uppercase tracking-widest text-cyan-300 mb-1.5"
                          >
                            Why this match
                          </p>
                          <p class="text-xs leading-5 text-ink-300">
                            {match.explanation}
                          </p>
                        </div>
                      {/if}

                      {#if match.tags?.length}
                        <div class="flex flex-wrap gap-1.5">
                          {#each match.tags.slice(0, 4) as tag}
                            <span
                              class="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-ink-400"
                            >
                              #{tag}
                            </span>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div
                class="glass rounded-2xl border border-white/8 border-dashed p-12 text-center"
              >
                <div
                  class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 border border-amber-400/20"
                >
                  <Brain size={22} class="text-amber-300" />
                </div>
                <h3 class="text-lg font-bold text-white mb-2">
                  No matches yet
                </h3>
                <p class="text-sm text-ink-400 max-w-xs mx-auto mb-5">
                  Save your networking profile to generate AI-powered
                  recommendations.
                </p>
                <Button
                  onclick={() => (editProfileOpen = true)}
                  class="gap-2"
                >
                  <Sparkles size={15} />
                  Fill your profile
                </Button>
              </div>
            {/if}
          </Tabs.Content>
        </Tabs.Root>
      </div>
    {/if}
  </main>
</PageShell>
