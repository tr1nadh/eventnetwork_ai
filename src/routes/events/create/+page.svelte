<script>
  import {
    ArrowLeft,
    FolderPlus,
    LoaderCircle,
    Plus,
    Link as LinkIcon,
    CalendarClock,
    MapPin,
    Globe,
    Lock,
    ShieldCheck,
  } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import Sidebar from "$lib/components/sidebar.svelte";
  import PageShell from "$lib/components/page-shell.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { toast } from "$lib/components/ui/sonner/index.js";
  import { createSupabaseBrowserClient } from "$lib/supabase/client";
  import { clearAllEventStores } from "$lib/stores/eventStore";
  import { clearAllChatStores } from "$lib/stores/chatStore";

  export let data;

  const supabase = createSupabaseBrowserClient();

  function formatDatetimeLocal(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  const now = new Date();
  const defaultStart = new Date(now.getTime() + 30 * 60 * 1000);
  const defaultEnd = new Date(defaultStart.getTime() + 2 * 60 * 60 * 1000);

  let signingOut = false;
  let creatingEvent = false;
  let form = {
    name: "",
    id: "",
    description: "",
    start_time: formatDatetimeLocal(defaultStart),
    end_time: formatDatetimeLocal(defaultEnd),
    event_format: "offline",
    location: "",
    google_map_url: "",
    is_approval_required: false,
  };

  // Auto-generate event ID from name
  $: autoId = form.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48);

  $: resolvedId = form.id.trim() || autoId;

  async function signOut() {
    signingOut = true;
    await supabase.auth.signOut();
    signingOut = false;
    clearAllEventStores();
    clearAllChatStores();
    await goto("/");
  }

  async function createEvent() {
    if (!form.name.trim()) return;
    creatingEvent = true;

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          id: resolvedId,
          description: form.description,
          start_time: form.start_time ? new Date(form.start_time).toISOString() : undefined,
          end_time: form.end_time ? new Date(form.end_time).toISOString() : undefined,
          event_format: form.event_format,
          location: form.location,
          google_map_url: form.google_map_url,
          is_approval_required: form.is_approval_required,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = payload?.error ?? "Could not create event.";
        toast.error(
          response.status === 409
            ? "ID already exists"
            : "Event creation failed",
          {
            description: message,
          },
        );
        return;
      }

      toast.success("Event created", {
        description: "Your new event is now available in your dashboard.",
      });
      await goto("/events");
    } catch (err) {
      toast.error("Event creation failed", {
        description:
          err instanceof Error ? err.message : "Could not create event.",
      });
    } finally {
      creatingEvent = false;
    }
  }
</script>

<svelte:head>
  <title>Create Event | Evenai</title>
  <meta name="description" content="Create a new networking event on Evenai." />
</svelte:head>

<PageShell>
  <Sidebar user={data.user} {signingOut} onSignOut={signOut} />

  <main class="mx-auto max-w-2xl px-4 pb-20 sm:px-6">
    <!-- Back + header -->
    <div class="mb-8 flex items-center justify-between animate-fade-in">
      <div>
        <p
          class="text-xs font-bold uppercase tracking-[0.2em] text-amber-300 mb-1"
        >
          New event
        </p>
        <h1 class="text-3xl font-black text-white">
          Create a networking event
        </h1>
      </div>
      <Button
        variant="secondary"
        onclick={() => goto("/events")}
        class="gap-2 shrink-0"
      >
        <ArrowLeft size={15} />
        Back
      </Button>
    </div>

    <!-- Form card -->
    <div
      class="glass rounded-2xl overflow-hidden border border-amber-400/15 animate-slide-up"
    >
      <!-- Card accent top border -->
      <div
        class="h-0.5 bg-gradient-to-r from-amber-400 via-amber-300 to-transparent"
      ></div>

      <div class="p-7 space-y-6">
        <div class="flex items-center gap-2.5">
          <div
            class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/12 border border-amber-400/20"
          >
            <FolderPlus size={17} class="text-amber-300" />
          </div>
          <div>
            <p class="text-sm font-semibold text-white">Event details</p>
            <p class="text-xs text-ink-500">
              Set up your event name, format, date, venue, and description.
            </p>
          </div>
        </div>

        <div class="h-px bg-white/6"></div>

        <!-- Event name -->
        <div class="space-y-1.5">
          <Label
            for="name"
            class="text-xs font-semibold uppercase tracking-widest text-ink-400"
            >Event name *</Label
          >
          <Input
            id="name"
            bind:value={form.name}
            placeholder="HackNight Delhi 2026"
            class="bg-white/4 border-white/10 text-white placeholder:text-ink-600 focus:border-amber-400/50 focus:ring-amber-400/20"
          />
        </div>

        <!-- Event Format Selection -->
        <div class="space-y-2">
          <Label class="text-xs font-semibold uppercase tracking-widest text-ink-400">
            Event Format
          </Label>
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              class="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition {form.event_format === 'offline' ? 'bg-amber-400/15 border-amber-400/40 text-amber-300' : 'bg-white/4 border-white/8 text-ink-400 hover:text-white hover:border-white/15'}"
              onclick={() => form.event_format = 'offline'}
            >
              <MapPin size={14} />
              Offline
            </button>
            <button
              type="button"
              class="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition {form.event_format === 'online' ? 'bg-amber-400/15 border-amber-400/40 text-amber-300' : 'bg-white/4 border-white/8 text-ink-400 hover:text-white hover:border-white/15'}"
              onclick={() => form.event_format = 'online'}
            >
              <Globe size={14} />
              Online
            </button>
            <button
              type="button"
              class="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition {form.event_format === 'hybrid' ? 'bg-amber-400/15 border-amber-400/40 text-amber-300' : 'bg-white/4 border-white/8 text-ink-400 hover:text-white hover:border-white/15'}"
              onclick={() => form.event_format = 'hybrid'}
            >
              <ShieldCheck size={14} />
              Hybrid
            </button>
          </div>
        </div>

        <!-- Start Time & End Time -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <Label
              for="start_time"
              class="text-xs font-semibold uppercase tracking-widest text-ink-400"
            >
              Start Time *
            </Label>
            <Input
              id="start_time"
              type="datetime-local"
              bind:value={form.start_time}
              class="bg-white/4 border-white/10 text-white focus:border-amber-400/50 focus:ring-amber-400/20 color-scheme-dark"
            />
          </div>
          <div class="space-y-1.5">
            <Label
              for="end_time"
              class="text-xs font-semibold uppercase tracking-widest text-ink-400"
            >
              End Time *
            </Label>
            <Input
              id="end_time"
              type="datetime-local"
              bind:value={form.end_time}
              class="bg-white/4 border-white/10 text-white focus:border-amber-400/50 focus:ring-amber-400/20 color-scheme-dark"
            />
          </div>
        </div>

        <!-- Location -->
        <div class="space-y-1.5">
          <Label
            for="location"
            class="text-xs font-semibold uppercase tracking-widest text-ink-400"
          >
            {form.event_format === 'online' ? 'Meeting Link / Platform' : 'Location / Venue Address'}
          </Label>
          <Input
            id="location"
            bind:value={form.location}
            placeholder={form.event_format === 'online' ? 'e.g. Google Meet https://meet.google.com/xyz' : 'e.g. WeWork Cyber City, Phase 2, Gurugram'}
            class="bg-white/4 border-white/10 text-white placeholder:text-ink-600 focus:border-amber-400/50 focus:ring-amber-400/20"
          />
        </div>

        <!-- Google Map URL (Only if offline or hybrid) -->
        {#if form.event_format !== 'online'}
          <div class="space-y-1.5">
            <Label
              for="google_map_url"
              class="text-xs font-semibold uppercase tracking-widest text-ink-400"
            >
              Google Map Link <span class="text-ink-600 normal-case font-normal">(optional)</span>
            </Label>
            <Input
              id="google_map_url"
              type="url"
              bind:value={form.google_map_url}
              placeholder="e.g. https://maps.app.goo.gl/..."
              class="bg-white/4 border-white/10 text-white placeholder:text-ink-600 focus:border-amber-400/50 focus:ring-amber-400/20 font-mono text-xs"
            />
          </div>
        {/if}

        <!-- Event ID -->
        <div class="space-y-1.5">
          <Label
            for="id"
            class="text-xs font-semibold uppercase tracking-widest text-ink-400"
          >
            Event ID <span
              class="text-ink-600 normal-case tracking-normal font-normal"
              >(optional — auto-generated)</span
            >
          </Label>
          <div class="relative">
            <Input
              id="id"
              bind:value={form.id}
              placeholder={autoId || "hacknight-delhi-2026"}
              class="bg-white/4 border-white/10 text-white placeholder:text-ink-600 focus:border-amber-400/50 focus:ring-amber-400/20 font-mono"
            />
          </div>
          {#if resolvedId}
            <div class="flex items-center gap-1.5 text-xs text-ink-500">
              <LinkIcon size={11} />
              <span
                >Event URL: <span class="text-ink-300 font-mono"
                  >/event/{resolvedId}</span
                ></span
              >
            </div>
          {/if}
        </div>

        <!-- Description -->
        <div class="space-y-1.5">
          <Label
            for="description"
            class="text-xs font-semibold uppercase tracking-widest text-ink-400"
            >Description</Label
          >
          <textarea
            id="description"
            bind:value={form.description}
            placeholder="A high-energy offline event where builders, founders, designers, and operators meet the right people fast."
            rows="3"
            class="w-full rounded-lg border border-white/10 bg-white/4 px-3 py-2.5 text-sm text-white placeholder:text-ink-600 resize-none focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition"
          ></textarea>
        </div>

        <!-- Approval Required Toggle -->
        <div class="flex items-center justify-between p-3.5 rounded-xl border border-white/8 bg-white/4">
          <div class="space-y-0.5">
            <p class="text-xs font-semibold text-white flex items-center gap-1.5">
              <Lock size={13} class="text-amber-400" />
              Require Host Approval
            </p>
            <p class="text-[11px] text-ink-500">
              Attendees must be approved by host before gaining full access.
            </p>
          </div>
          <input
            type="checkbox"
            bind:checked={form.is_approval_required}
            class="h-4 w-4 rounded border-white/20 bg-white/10 text-amber-400 focus:ring-amber-400/30 accent-amber-400 cursor-pointer"
          />
        </div>

        <!-- Submit -->
        <div class="flex items-center gap-4 pt-2">
          <Button
            id="create-event-submit"
            onclick={createEvent}
            disabled={creatingEvent || !form.name.trim()}
            class="gap-2"
          >
            {#if creatingEvent}
              <LoaderCircle size={15} class="animate-spin" />
              Creating event…
            {:else}
              <Plus size={15} />
              Create event
            {/if}
          </Button>
        </div>
      </div>
    </div>
  </main>
</PageShell>

