<script>
  import { slide, fade } from 'svelte/transition';
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
    RefreshCw,
    Info,
    X,
    Ghost,
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
import { activeTab, matchesStore, connectionsStore } from "$lib/stores/eventStore";
  
  // Embedding helper – calls server-side /api/embeddings to keep the API key secure
  async function generateEmbedding(text) {
    const res = await fetch('/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? 'Embedding generation failed');
    }
    const { embedding } = await res.json();
    return embedding;
  }
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

  let editProfileOpen = false;
  let stage = data.isParticipant ? "workspace" : "preview";

  // Initialize matches store with server data
  matchesStore.set(data.suggestedMatches ?? []);


  async function fetchMatches() {
    refreshingMatches = true;
    try {
      const res = await fetch(`/api/recommendations?event_id=${data.event.id}`, {
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to fetch matches");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      matchesStore.set([]); // Clear existing matches while streaming new ones

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            const match = JSON.parse(line);
            matchesStore.update(matches => [...matches, match]);
          }
        }
      }
    } catch (error) {
      toast.error("Could not find matches");
    } finally {
      refreshingMatches = false;
    }
  }

  let refreshingFromDb = false;
  async function refreshFromDb() {
    refreshingFromDb = true;
    try {
      const res = await fetch(`/api/matches?event_id=${data.event.id}`, {
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to refresh matches from DB");
      const { matches: dbMatches } = await res.json();
       matchesStore.set(dbMatches || []);
      toast.success("Matches refreshed");
    } catch (error) {
      toast.error("Could not refresh matches");
    } finally {
      refreshingFromDb = false;
    }
  }

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
let loadingConnections = false;
let connectionFilter = 'received'; // received | sent | connected | met

// Reactive derived array for filtered connections
$: filteredConnections = $connectionsStore.filter(conn => {
  const isSender = conn.sender_user_id === data.user?.id;
  const isReceiver = conn.receiver_user_id === data.user?.id;
  
  if (connectionFilter === 'received') {
    return isReceiver && conn.status === 'pending';
  }
  if (connectionFilter === 'sent') {
    return isSender && conn.status === 'pending';
  }
  if (connectionFilter === 'connected') {
    return (isSender || isReceiver) && conn.status === 'accepted';
  }
  if (connectionFilter === 'met') {
    return (isSender || isReceiver) && conn.status === 'accepted' && !!conn.met_at;
  }
  return false;
});

let connectionsPage = 1;
let connectionsHasMore = false;
let loadingMoreConnections = false;

async function fetchAllConnections() {
  loadingConnections = true;
  connectionsPage = 1;
  try {
    const res = await fetch(`/api/connections?event_id=${data.event.id}&filter=all&page=1&limit=50`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to fetch connections');
    const { connections: conn, hasMore } = await res.json();
    connectionsStore.set(conn || []);
    connectionsHasMore = hasMore;
  } catch (e) {
    toast.error('Could not load connections');
  } finally {
    loadingConnections = false;
  }
}

async function loadMoreConnections() {
  if (loadingMoreConnections || !connectionsHasMore) return;
  loadingMoreConnections = true;
  try {
    const nextPage = connectionsPage + 1;
    const res = await fetch(`/api/connections?event_id=${data.event.id}&filter=all&page=${nextPage}&limit=50`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to fetch more connections');
    const { connections: newConns, hasMore } = await res.json();
    connectionsStore.update(existing => {
      // Deduplicate by ID
      const existingIds = new Set(existing.map(c => c.id));
      const uniqueNewConns = newConns.filter(c => !existingIds.has(c.id));
      return [...existing, ...uniqueNewConns];
    });
    connectionsHasMore = hasMore;
    connectionsPage = nextPage;
  } catch (e) {
    toast.error('Could not load more connections');
  } finally {
    loadingMoreConnections = false;
  }
}

async function updateConnection(connectionId, newStatus) {
  try {
    const res = await fetch(`/api/connections/${connectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to update connection');
    
    connectionsStore.update(conns => {
      return conns.map(c => {
        if (c.id === connectionId) {
          return { ...c, status: newStatus, met_at: newStatus === 'met' ? new Date().toISOString() : c.met_at };
        }
        return c;
      });
    });
    toast.success(`Connection ${newStatus}`);
  } catch (e) {
    toast.error('Could not update connection');
  }
}

async function connectUser(match) {
  // Check if there's an existing cancelled connection we should reactivate
  const existing = $connectionsStore.find(c =>
    c.sender_user_id === data.user?.id &&
    c.receiver_user_id === match.user_id &&
    c.status === 'cancelled'
  );

  if (existing) {
    await updateConnection(existing.id, 'pending');
    return;
  }

  // If dummy user, show confirmation modal first
  if (match.is_dummy) {
    pendingDummyUserId = match.user_id;
    dummyConnectModalOpen = true;
    return;
  }

  await doConnect(match.user_id);
}

async function doConnect(matchUserId) {
  try {
    const res = await fetch(`/api/connections/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: data.event.id, receiver_user_id: matchUserId }),
      credentials: 'include'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Failed to create connection request');
    }
    const { connection } = await res.json();
    
    connectionsStore.update(conns => {
      const newConn = {
        id: connection.id,
        status: connection.status,
        match_id: connection.match_id,
        sender_user_id: connection.sender_user_id,
        receiver_user_id: connection.receiver_user_id,
        met_at: connection.met_at ?? null,
        profile: connection.profile
      };
      return [...conns, newConn];
    });

    if (connection.status === 'accepted') {
      toast.success('Connected!');
    } else {
      toast.success('Connection request sent');
    }
  } catch (e) {
    toast.error(e.message || 'Could not send request');
  }
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
      // Step 1: Build texts for embeddings
      const aboutUserText = `What I do:\n${networkingProfile.whatTheyDo}` +
        (networkingProfile.expectations ? `\n\nAbout me:\n${networkingProfile.expectations}` : '');
      const lookingForText = `Looking for:\n${networkingProfile.whoTheyWant}`;

      // Step 2: Generate embeddings (parallel)
      const [aboutUserEmbed, lookingForEmbed] = await Promise.all([
        generateEmbedding(aboutUserText),
        generateEmbedding(lookingForText),
      ]);

      // Step 3: Save networking profile with embeddings
      const profileRes = await fetch("/api/network_profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        mode: "same-origin",
        body: JSON.stringify({
          profile: {
            ...networkingProfile,
            about_user_embed: aboutUserEmbed,
            looking_for_embed: lookingForEmbed,
          },
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
        activeTab.set("details");
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
      fetchAllConnections();
      
      // Initialize Supabase Realtime channel for connections
      const channel = supabase.channel('connections-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, payload => {
          if (payload.new && payload.new.event_id === data.event.id && 
             (payload.new.sender_user_id === data.user.id || payload.new.receiver_user_id === data.user.id)) {
            
            if (payload.eventType === 'UPDATE') {
               // Update connection in store locally
               connectionsStore.update(conns => conns.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c));
            } else if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
               // Fetch all connections for inserts so we can get the profile join cleanly
               fetchAllConnections();
            }
          }
        })
        .subscribe();

      // Return cleanup function to unsubscribe on component destroy
      return () => {
        supabase.removeChannel(channel);
      };
    }
    
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
    }
  ];

  $: profileValid = (networkingProfile.whoTheyAre?.trim()?.length || 0) > 0 &&
                    (networkingProfile.whatTheyDo?.trim()?.length || 0) >= 20 &&
                    (networkingProfile.whoTheyWant?.trim()?.length || 0) >= 20 &&
                    (networkingProfile.expectations?.trim()?.length || 0) >= 20;


  let dummyModalOpen = false;
  let creatingDummy = false;

  // Dummy connect confirmation modal
  let dummyConnectModalOpen = false;
  let pendingDummyUserId = null;

  async function createDummyUsers() {
    creatingDummy = true;
    try {
      const res = await fetch('/api/dummy_users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ event_id: data.event.id })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to create simulation');
      }
      await fetchMatches();
      toast.success('Dummy users created');
      dummyModalOpen = false;
    } catch (e) {
      toast.error('Could not create simulation', { description: e.message });
    } finally {
      creatingDummy = false;
    }
  }
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
                      maxlength="500"
                    ></textarea>
                    <div class="flex justify-between mt-1">
                      <span class="text-[10px] text-amber-500/80">{(networkingProfile[field.key]?.length || 0) < 20 ? 'Minimum 20 characters required' : ''}</span>
                      <span class="text-[10px] text-ink-500 text-right">{networkingProfile[field.key]?.length || 0} / 500</span>
                    </div>
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
                disabled={savingProfile || !profileValid}
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
      <div class="space-y-8 animate-fade-in min-h-[800px]">
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

        <Tabs.Root value={$activeTab} onValueChange={(v) => {
          activeTab.set(v);
        }}>
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
               Matches {#if $matchesStore.length}<span
                   class="ml-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-bold text-amber-300"
                   >{$matchesStore.length}</span>
                 {/if}
            </Tabs.Trigger>
          <Tabs.Trigger
                value="connections"
                class="flex-1 text-center py-2 text-sm font-medium transition-colors duration-200 data-[state=active]:bg-purple-400/15 data-[state=active]:text-purple-200 data-[state=inactive]:text-ink-500 hover:text-purple-200"
              >
                <Target size={16} class="inline-block mr-1 align-text-bottom" />
                Connections
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
                    {#if field.key === "whoTheyAre"}
                      <Input
                        id={field.wsId}
                        bind:value={networkingProfile[field.key]}
                        class="bg-white/4 border-white/10 text-white focus:border-amber-400/50 focus:ring-amber-400/20"
                      />
                    {:else}
                      <textarea
                        id={field.wsId}
                        bind:value={networkingProfile[field.key]}
                        class="bg-white/4 border-white/10 text-white placeholder:text-ink-600 focus:border-amber-400/50 focus:ring-amber-400/20 w-full rounded-md p-2"
                        rows="4"
                        maxlength="500"
                      ></textarea>
                      <div class="flex justify-between mt-1">
                        <span class="text-[10px] text-amber-500/80">{(networkingProfile[field.key]?.length || 0) < 20 ? 'Minimum 20 characters required' : ''}</span>
                        <span class="text-[10px] text-ink-500 text-right">{networkingProfile[field.key]?.length || 0} / 500</span>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
              <div class="flex flex-wrap gap-3">
                <Button
                  onclick={saveProfile}
                  disabled={savingProfile || !profileValid}
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
                  Edit network profile
                </Button>
                <Button variant="outline" class="border-white/10 text-white hover:bg-white/10 gap-2" onclick={refreshFromDb} disabled={refreshingFromDb}>
                  {#if refreshingFromDb}
                    <LoaderCircle size={15} class="animate-spin" />
                  {:else}
                    <RefreshCcw size={15} />
                  {/if}
                  Refresh
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
                <Button variant="outline" class="gap-2 border-white/10 text-white hover:bg-white/10" onclick={() => (dummyModalOpen = true)}>
                  <Users size={15} />
                  Create simulation
                </Button>
              </div>
            </div>
            {#if refreshingFromDb || refreshingMatches}
              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {#each Array(3) as _}
                  <div class="glass card-hover rounded-2xl border border-white/8 h-[350px] animate-pulse bg-white/5"></div>
                {/each}
              </div>
            {:else if $matchesStore.length}
              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {#each $matchesStore as match, i}
                  {@const conn = $connectionsStore.find(c => c.sender_user_id === match.user_id || c.receiver_user_id === match.user_id)}
                  <div
                    class="glass card-hover rounded-2xl border border-white/8 overflow-hidden"
                  >
                    <!-- Match strength bar -->
                    <div
                      class="h-0.5 bg-gradient-to-r from-amber-400 to-cyan-400"
                      style="width: {match.matchPercentage ?? 50}%"
                    ></div>

                    <div class="flex-1 flex flex-col p-5">
                      <Tabs.Root value="ai-insights" class="flex-1 flex flex-col">
                        <Tabs.List class="grid w-full grid-cols-2 mb-4 bg-white/5 border border-white/10 rounded-xl p-1">
                          <Tabs.Trigger 
                            value="ai-insights" 
                            class="rounded-lg text-xs font-semibold data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-300"
                          >
                            🤖 AI Insights
                          </Tabs.Trigger>
                          <Tabs.Trigger 
                            value="profile" 
                            class="rounded-lg text-xs font-semibold data-[state=active]:bg-white/10 data-[state=active]:text-white"
                          >
                            👤 Profile
                          </Tabs.Trigger>
                        </Tabs.List>

                        <!-- AI Insights Tab -->
                        <Tabs.Content value="ai-insights" class="flex-1 space-y-4 outline-none m-0">
                          <div class="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <h3 class="text-base font-bold text-white">
                                {match.name}
                              </h3>
                              <p class="mt-0.5 text-xs text-ink-400">
                                AI Match Analysis
                              </p>
                            </div>
                            <span class="shrink-0 rounded-full border border-amber-400/25 bg-amber-400/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300">
                              {match.matchPercentage ?? '—'}% Match
                            </span>
                          </div>

                          {#if match.explanation}
                            <div class="rounded-xl border border-cyan-400/15 bg-cyan-400/6 p-4">
                              <p class="text-[10px] font-bold uppercase tracking-widest text-cyan-300 mb-2">
                                Why this match
                              </p>
                              <p class="text-sm leading-6 text-ink-300">
                                {match.explanation}
                              </p>
                            </div>
                          {:else}
                            <div class="rounded-xl border border-white/5 bg-white/5 p-4 text-center">
                              <p class="text-xs text-ink-400">No detailed AI insights available for this match.</p>
                            </div>
                          {/if}
                        </Tabs.Content>

                        <!-- Profile Tab -->
                        <Tabs.Content value="profile" class="flex-1 space-y-4 outline-none m-0">
                          <div class="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <h3 class="text-base font-bold text-white">
                                {match.name}
                              </h3>
                              <p class="mt-0.5 text-xs text-ink-400">
                                {match.role}{match.company ? ` · ${match.company}` : ''}
                              </p>
                            </div>
                          </div>

                          <div class="space-y-3">
                            <div>
                              <p class="text-[10px] font-bold uppercase tracking-widest text-ink-500 mb-1">About Me</p>
                              <p class="text-xs leading-5 text-ink-300">
                                {match.about}
                              </p>
                            </div>
                          </div>

                          {#if match.tags?.length}
                            <div class="flex flex-wrap gap-1.5 pt-2">
                              {#each match.tags.slice(0, 4) as tag}
                                <span class="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-ink-400">
                                  #{tag}
                                </span>
                              {/each}
                            </div>
                          {/if}
                        </Tabs.Content>
                      </Tabs.Root>
                      <!-- Connect Button -->
                      <div class="pt-4 mt-auto">
                        {#if !conn || conn.status === 'cancelled'}
                          <Button class="w-full bg-white text-black hover:bg-white/90 gap-2" onclick={() => connectUser(match)}>
                            <Users size={16} /> Connect
                          </Button>
                        {:else if conn.status === 'pending' && conn.sender_user_id === data.user?.id}
                          <Button variant="outline" class="w-full gap-2 text-ink-300 border-ink-600 hover:text-white" onclick={() => updateConnection(conn.id, 'cancelled')}>
                            Cancel Request
                          </Button>
                        {:else if conn.status === 'pending' && conn.receiver_user_id === data.user?.id}
                          <Button variant="outline" class="w-full gap-2 text-amber-300 border-amber-600/50" disabled>
                            Pending Response
                          </Button>
                        {:else if conn.status === 'accepted'}
                          <Button variant="secondary" class="w-full gap-2 bg-purple-500/20 text-purple-300 border border-purple-500/30" disabled>
                            <CheckCircle2 size={16} /> Connected
                          </Button>
                        {:else if conn.status === 'rejected'}
                          <Button variant="outline" class="w-full gap-2 text-red-400 border-red-500/30" disabled>
                            Rejected
                          </Button>
                        {/if}
                      </div>
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
              </div>
            {/if}

            <!-- Create Dummy Users confirmation modal -->
            <Dialog.Root bind:open={dummyModalOpen}>
              <Dialog.Content class="sm:max-w-lg bg-[#0f0f11] border border-white/10 text-white">
                <Dialog.Header>
                  <Dialog.Title class="text-xl font-bold text-white">Create Simulation</Dialog.Title>
                </Dialog.Header>
                <p class="text-sm leading-6 text-ink-300 mt-2">
                  This action will create 5 dummy participants with unique dummy email addresses.
                  Each participant will automatically join this event and generate a realistic
                  networking profile designed to be relevant to your profile, allowing you to test
                  the AI matchmaking experience.
                </p>
                <div class="flex justify-end gap-3 mt-6">
                  <Button variant="outline" class="border-white/10 text-white hover:bg-white/10" onclick={() => (dummyModalOpen = false)} disabled={creatingDummy}>
                    Cancel
                  </Button>
                  <Button class="gap-2" onclick={createDummyUsers} disabled={creatingDummy}>
                    {#if creatingDummy}
                      <LoaderCircle size={15} class="animate-spin" />
                      Creating…
                    {:else}
                      Continue
                    {/if}
                  </Button>
                </div>
              </Dialog.Content>
            </Dialog.Root>
          </Tabs.Content>

          <!-- Dummy user connect confirmation modal -->
          <Dialog.Root bind:open={dummyConnectModalOpen}>
            <Dialog.Content class="sm:max-w-md bg-[#0f0f11] border border-white/10 text-white">
              <Dialog.Header>
                <Dialog.Title class="text-xl font-bold text-white flex items-center gap-2">
                  <span class="text-amber-400">⚠</span> Dummy User
                </Dialog.Title>
              </Dialog.Header>
              <p class="text-sm leading-6 text-ink-300 mt-2">
                This is a dummy user created for testing. The connection request will be automatically accepted.
              </p>
              <div class="flex gap-3 mt-4">
                <Button variant="outline" class="flex-1 border-white/10 text-white hover:bg-white/10" onclick={() => { dummyConnectModalOpen = false; pendingDummyUserId = null; }}>
                  Cancel
                </Button>
                <Button class="flex-1" onclick={async () => { dummyConnectModalOpen = false; if (pendingDummyUserId) { await doConnect(pendingDummyUserId); pendingDummyUserId = null; } }}>
                  Continue
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Root>

          <!-- Connections tab -->
          <Tabs.Content value="connections" class="mt-4">
            <!-- Filter tabs + Refresh -->
            <div class="flex flex-wrap items-center gap-2 mb-4">
              {#each ['received', 'sent', 'connected', 'met'] as f}
                <Button
                  variant={connectionFilter === f ? 'default' : 'outline'}
                  class="capitalize"
                  onclick={() => { connectionFilter = f; }}
                >{f}</Button>
              {/each}
              <Button 
                variant="outline" 
                class="ml-auto gap-2 text-ink-300 border-white/10 hover:bg-white/10" 
                onclick={fetchAllConnections}
                disabled={loadingConnections}
              >
                <RefreshCw size={16} class={loadingConnections ? "animate-spin" : ""} />
                Refresh
              </Button>
            </div>

            {#if loadingConnections}
              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {#each Array(3) as _}
                  <div class="glass card-hover rounded-2xl border border-white/8 h-[350px] animate-pulse bg-white/5"></div>
                {/each}
              </div>
            {:else if filteredConnections.length}
              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {#each filteredConnections as conn (conn.id)}
                  <div transition:slide class="glass card-hover rounded-2xl border border-white/8 overflow-hidden">
                    <div class="h-0.5 bg-gradient-to-r from-purple-400 to-pink-400" style="width: {conn.matchPercentage ?? 50}%"></div>
                    <div class="p-5 flex flex-col gap-2">
                      <h3 class="text-base font-bold text-white">{conn.profile?.display_name || 'Unknown'}</h3>
                      <span class="rounded-full bg-purple-400/20 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-300">{conn.matchPercentage ?? '—'}% Match</span>
                      {#if conn.explanation}
                        <div class="rounded-xl border border-pink-400/15 bg-pink-400/6 p-3 text-sm text-ink-300">{conn.explanation}</div>
                      {/if}
                      <!-- Action buttons based on status -->
                      {#if conn.status === 'pending' && conn.receiver_user_id === data.user?.id}
                        <div class="flex gap-2 mt-2">
                          <Button class="flex-1" onclick={() => updateConnection(conn.id, 'accepted')}>Accept</Button>
                          <Button variant="destructive" class="flex-1" onclick={() => updateConnection(conn.id, 'rejected')}>Reject</Button>
                        </div>
                      {:else if conn.status === 'pending' && conn.sender_user_id === data.user?.id}
                        <Button variant="outline" class="mt-2 w-full" onclick={() => updateConnection(conn.id, 'cancelled')}>Cancel Request</Button>
                      {:else if conn.status === 'accepted' && !conn.met_at}
                        <Button variant="outline" class="mt-2 w-full" onclick={() => updateConnection(conn.id, 'met')}>Mark as Met</Button>
                      {:else if conn.status === 'accepted' && conn.met_at}
                        <span class="mt-2 text-xs text-emerald-400 font-semibold">✓ Met</span>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
              
              {#if connectionsHasMore}
                <div class="mt-6 flex justify-center">
                  <Button variant="outline" onclick={loadMoreConnections} disabled={loadingMoreConnections}>
                    {#if loadingMoreConnections}
                      <LoaderCircle size={16} class="animate-spin mr-2" />
                      Loading...
                    {:else}
                      Load More
                    {/if}
                  </Button>
                </div>
              {/if}
            {:else}
              <div in:fade class="flex flex-col items-center justify-center p-12 text-center glass rounded-2xl border border-white/5">
                <div class="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <Ghost size={28} class="text-ink-500" />
                </div>
                <h3 class="text-white font-bold mb-1">No connections yet</h3>
                <p class="text-sm text-ink-400 max-w-sm">We couldn't find any connections matching this filter. Go to the Matches tab to find new people to connect with.</p>
              </div>
            {/if}
          </Tabs.Content>
        </Tabs.Root>
      </div>
    {/if}
  </main>
</PageShell>
