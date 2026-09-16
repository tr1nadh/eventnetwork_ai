<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import {
    ArrowLeft,
    LoaderCircle,
    Save,
    Trash2,
    Settings,
    CalendarClock,
    MapPin,
    Globe,
    Lock,
    AlertTriangle,
    CheckCircle2,
    Copy,
    Check,
  } from '@lucide/svelte';
  import { createSupabaseBrowserClient } from '$lib/supabase/client';
  import Sidebar from '$lib/components/sidebar.svelte';
  import PageShell from '$lib/components/page-shell.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { toast } from '$lib/components/ui/sonner/index.js';

  export let data;

  const { event, user } = data;
  const supabase = createSupabaseBrowserClient();

  let signingOut = false;
  async function signOut() {
    signingOut = true;
    try {
      await supabase.auth.signOut();
      await goto('/auth/login');
    } catch (e) {
      toast.error('Failed to sign out');
    } finally {
      signingOut = false;
    }
  }

  // Form state — pre-filled with existing data
  let name = event.name ?? '';
  let description = event.description ?? '';
  let slug = event.slug ?? '';
  let location = event.location ?? '';
  let googleMapUrl = event.google_map_url ?? '';
  let eventFormat = event.event_format ?? 'offline';
  let startTime = event.start_time ? event.start_time.slice(0, 16) : '';
  let endTime = event.end_time ? event.end_time.slice(0, 16) : '';
  let isApprovalRequired = event.is_approval_required ?? false;
  let isVenueEnabled = event.is_venue_enabled ?? true;

  let saving = false;
  let saveError = '';
  let saveSuccess = false;

  let deleteConfirmOpen = false;
  let deleteConfirmText = '';
  let deleting = false;

  let copiedSlug = false;
  function copySlugUrl() {
    if (typeof window === 'undefined') return;
    const fullUrl = `${window.location.origin}/event/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    copiedSlug = true;
    toast.success('Event link copied to clipboard!');
    setTimeout(() => (copiedSlug = false), 2000);
  }

  function setStartNow() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    startTime = d.toISOString().slice(0, 16);
  }

  function setStartTomorrow() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    startTime = d.toISOString().slice(0, 16);
  }

  function addDurationToEnd(hours) {
    let base = startTime ? new Date(startTime) : new Date();
    const end = new Date(base.getTime() + hours * 3600000);
    end.setMinutes(end.getMinutes() - end.getTimezoneOffset());
    endTime = end.toISOString().slice(0, 16);
  }

  async function saveSettings() {
    saving = true;
    saveError = '';
    saveSuccess = false;

    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          description,
          slug,
          location,
          google_map_url: googleMapUrl,
          event_format: eventFormat,
          start_time: startTime || null,
          end_time: endTime || null,
          is_approval_required: isApprovalRequired,
          is_venue_enabled: isVenueEnabled,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        saveError = json?.message ?? 'Failed to save changes.';
        return;
      }

      saveSuccess = true;
      toast.success('Event updated successfully.');

      // If slug changed, redirect to new URL
      if (slug !== event.slug) {
        await goto(`/event/${slug}/settings`);
      }
    } catch (e) {
      saveError = e.message ?? 'Something went wrong.';
    } finally {
      saving = false;
    }
  }

  async function deleteEvent() {
    deleting = true;
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json?.message ?? 'Failed to delete event.');
        return;
      }

      toast.success('Event deleted.');
      await goto('/events');
    } catch (e) {
      toast.error('Something went wrong.');
    } finally {
      deleting = false;
    }
  }
</script>

<svelte:head>
  <title>Settings — {event.name}</title>
</svelte:head>

<PageShell>
  <Sidebar {user} {signingOut} onSignOut={signOut} />

  <main class="max-w-3xl mx-auto px-4 py-8 space-y-8 animate-fade-in">

    <!-- Header -->
    <div class="flex items-center gap-4">
      <a
        href="/event/{event.slug}"
        class="flex items-center justify-center w-9 h-9 rounded-xl glass border border-white/10 text-ink-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
      </a>
      <div>
        <div class="flex items-center gap-2 mb-0.5">
          <Settings size={16} class="text-indigo-400" />
          <p class="text-xs font-bold uppercase tracking-widest text-indigo-400">Event Settings</p>
        </div>
        <h1 class="text-2xl font-black text-white tracking-tight">{event.name}</h1>
      </div>
    </div>

    <!-- Edit Form -->
    <div class="glass rounded-2xl border border-white/8 p-6 sm:p-8 space-y-6">

      <div class="border-b border-white/8 pb-4 mb-2">
        <h2 class="text-base font-bold text-white">General</h2>
        <p class="text-xs text-ink-500 mt-0.5">Basic information about your event.</p>
      </div>

      <!-- Name -->
      <div class="space-y-2">
        <Label class="text-xs font-semibold uppercase tracking-widest text-ink-400">Event Name</Label>
        <Input
          bind:value={name}
          placeholder="My Awesome Event"
          class="bg-white/5 border-white/10 text-white placeholder:text-ink-600 focus:border-indigo-400/50"
        />
      </div>

      <!-- Description -->
      <div class="space-y-2">
        <Label class="text-xs font-semibold uppercase tracking-widest text-ink-400">Description</Label>
        <textarea
          bind:value={description}
          rows="4"
          placeholder="What is this event about?"
          class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-ink-600 focus:border-indigo-400/50 focus:outline-none focus:ring-1 focus:ring-indigo-400/20 resize-none"
        ></textarea>
      </div>

      <!-- Slug -->
      <div class="space-y-2">
        <Label class="text-xs font-semibold uppercase tracking-widest text-ink-400">Slug (URL ID)</Label>
        <div class="flex items-center gap-2">
          <span class="text-xs text-ink-500 shrink-0">/event/</span>
          <Input
            bind:value={slug}
            placeholder="my-awesome-event"
            class="bg-white/5 border-white/10 text-white placeholder:text-ink-600 focus:border-indigo-400/50 font-mono flex-1"
          />
          <button
            type="button"
            onclick={copySlugUrl}
            class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-ink-300 hover:text-white transition-colors shrink-0"
            title="Copy full event link"
          >
            {#if copiedSlug}
              <Check size={14} class="text-emerald-400" />
              <span class="text-emerald-400">Copied</span>
            {:else}
              <Copy size={14} />
              <span>Copy Link</span>
            {/if}
          </button>
        </div>
        <p class="text-[11px] text-ink-500">Changing the slug will redirect to the new URL.</p>
      </div>

      <!-- Format -->
      <div class="space-y-2">
        <Label class="text-xs font-semibold uppercase tracking-widest text-ink-400">Event Format</Label>
        <div class="grid grid-cols-3 gap-2">
          {#each ['online', 'offline', 'hybrid'] as fmt}
            <button
              type="button"
              onclick={() => (eventFormat = fmt)}
              class="py-2.5 rounded-xl border text-sm font-semibold capitalize transition-all {eventFormat === fmt
                ? 'bg-indigo-500/20 border-indigo-400/50 text-indigo-300'
                : 'bg-white/4 border-white/10 text-ink-400 hover:text-white hover:border-white/20'}"
            >
              {fmt}
            </button>
          {/each}
        </div>
      </div>

      <!-- Date & Time -->
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label class="text-xs font-semibold uppercase tracking-widest text-ink-400">
              <CalendarClock size={12} class="inline mr-1 text-indigo-400" />Start Time
            </Label>
            <div class="flex gap-2 text-[11px]">
              <button type="button" onclick={setStartNow} class="text-indigo-400 hover:underline">Now</button>
              <span class="text-white/20">•</span>
              <button type="button" onclick={setStartTomorrow} class="text-indigo-400 hover:underline">Tomorrow 9am</button>
            </div>
          </div>
          <Input
            type="datetime-local"
            bind:value={startTime}
            class="bg-white/5 border-white/10 text-white focus:border-indigo-400/50 [color-scheme:dark]"
          />
        </div>
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label class="text-xs font-semibold uppercase tracking-widest text-ink-400">
              <CalendarClock size={12} class="inline mr-1 text-indigo-400" />End Time
            </Label>
            <div class="flex gap-2 text-[11px]">
              <button type="button" onclick={() => addDurationToEnd(1)} class="text-indigo-400 hover:underline">+1h</button>
              <span class="text-white/20">•</span>
              <button type="button" onclick={() => addDurationToEnd(2)} class="text-indigo-400 hover:underline">+2h</button>
              <span class="text-white/20">•</span>
              <button type="button" onclick={() => addDurationToEnd(4)} class="text-indigo-400 hover:underline">+4h</button>
            </div>
          </div>
          <Input
            type="datetime-local"
            bind:value={endTime}
            class="bg-white/5 border-white/10 text-white focus:border-indigo-400/50 [color-scheme:dark]"
          />
        </div>
      </div>

      <!-- Location & Venue Map (offline/hybrid only) -->
      {#if eventFormat !== 'online'}
        <div class="space-y-4 pt-2 border-t border-white/6">
          <div>
            <h3 class="text-sm font-bold text-white mb-0.5">Location & Venue</h3>
            <p class="text-xs text-ink-500">Venue details for offline and hybrid events.</p>
          </div>
          <div class="space-y-2">
            <Label class="text-xs font-semibold uppercase tracking-widest text-ink-400">
              <MapPin size={12} class="inline mr-1 text-amber-400" />Address
            </Label>
            <textarea
              bind:value={location}
              rows="3"
              placeholder="123 Main St, City, Country"
              class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-ink-600 focus:border-indigo-400/50 focus:outline-none focus:ring-1 focus:ring-indigo-400/20 resize-none"
            ></textarea>
          </div>
          <div class="space-y-2">
            <Label class="text-xs font-semibold uppercase tracking-widest text-ink-400">
              <Globe size={12} class="inline mr-1 text-amber-400" />Google Maps URL
            </Label>
            <Input
              bind:value={googleMapUrl}
              placeholder="https://maps.google.com/..."
              class="bg-white/5 border-white/10 text-white placeholder:text-ink-600 focus:border-indigo-400/50"
            />
          </div>

          <!-- Venue Map Enabled -->
          <div class="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/3 border border-white/6 mt-2">
            <div class="flex items-start gap-3">
              <MapPin size={16} class="text-cyan-400 mt-0.5 shrink-0" />
              <div>
                <p class="text-sm font-semibold text-white">Enable Venue Map</p>
                <p class="text-xs text-ink-500 mt-0.5">Show the interactive venue map tab to attendees.</p>
              </div>
            </div>
            <button
              type="button"
              onclick={() => (isVenueEnabled = !isVenueEnabled)}
              class="relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 {isVenueEnabled ? 'bg-cyan-500' : 'bg-white/10'}"
              role="switch"
              aria-checked={isVenueEnabled}
            >
              <span
                class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 {isVenueEnabled ? 'translate-x-5' : 'translate-x-0'}"
              ></span>
            </button>
          </div>
        </div>
      {/if}

      <!-- Options -->
      <div class="space-y-4 pt-2 border-t border-white/6">
        <h3 class="text-sm font-bold text-white">Options</h3>

        <!-- Approval Required -->
        <div class="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/3 border border-white/6">
          <div class="flex items-start gap-3">
            <Lock size={16} class="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p class="text-sm font-semibold text-white">Approval Required</p>
              <p class="text-xs text-ink-500 mt-0.5">New attendees must be approved before joining.</p>
            </div>
          </div>
          <button
            type="button"
            onclick={() => (isApprovalRequired = !isApprovalRequired)}
            class="relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 {isApprovalRequired ? 'bg-amber-500' : 'bg-white/10'}"
            role="switch"
            aria-checked={isApprovalRequired}
          >
            <span
              class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 {isApprovalRequired ? 'translate-x-5' : 'translate-x-0'}"
            ></span>
          </button>
        </div>
      </div>

      <!-- Save error -->
      {#if saveError}
        <div class="flex items-start gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
          <AlertTriangle size={15} class="shrink-0 mt-0.5" />
          {saveError}
        </div>
      {/if}

      <!-- Save success -->
      {#if saveSuccess}
        <div class="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-4 py-3">
          <CheckCircle2 size={15} class="shrink-0" />
          Changes saved successfully.
        </div>
      {/if}

      <!-- Save Button -->
      <Button
        onclick={saveSettings}
        disabled={saving}
        class="w-full gap-2 h-11 text-sm font-semibold"
      >
        {#if saving}
          <LoaderCircle size={15} class="animate-spin" />
          Saving…
        {:else}
          <Save size={15} />
          Save Changes
        {/if}
      </Button>

    </div>

    <!-- Danger Zone -->
    <div class="glass rounded-2xl border border-red-500/20 p-6 sm:p-8">
      <h2 class="text-base font-bold text-red-400 mb-1">Danger Zone</h2>
      <p class="text-xs text-ink-500 mb-6">Permanently delete this event and all associated data. This cannot be undone.</p>

      {#if !deleteConfirmOpen}
        <Button
          variant="destructive"
          class="gap-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30"
          onclick={() => (deleteConfirmOpen = true)}
        >
          <Trash2 size={14} />
          Delete Event
        </Button>
      {:else}
        <div class="space-y-4">
          <p class="text-sm text-ink-300">
            Type <span class="font-mono font-bold text-red-400">{event.slug}</span> to confirm deletion:
          </p>
          <Input
            bind:value={deleteConfirmText}
            placeholder={event.slug}
            class="bg-white/5 border-red-500/30 text-white placeholder:text-ink-600 focus:border-red-400/50 font-mono"
          />
          <div class="flex gap-3">
            <Button
              variant="destructive"
              class="gap-2 bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteConfirmText !== event.slug || deleting}
              onclick={deleteEvent}
            >
              {#if deleting}
                <LoaderCircle size={14} class="animate-spin" />
                Deleting…
              {:else}
                <Trash2 size={14} />
                Confirm Delete
              {/if}
            </Button>
            <Button
              variant="ghost"
              class="text-ink-400 hover:text-white"
              onclick={() => { deleteConfirmOpen = false; deleteConfirmText = ''; }}
            >
              Cancel
            </Button>
          </div>
        </div>
      {/if}
    </div>

  </main>
</PageShell>
