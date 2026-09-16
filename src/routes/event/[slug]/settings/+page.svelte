<script>
  import { onMount } from 'svelte';
  import { goto, beforeNavigate } from '$app/navigation';
  import { page } from '$app/stores';
  import {
    ArrowLeft,
    ArrowRight,
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
    Calendar,
    Clock,
    X,
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

  // Split start & end time into Date and Time components for custom UX
  let startDate = startTime ? startTime.split('T')[0] : '';
  let startTimeVal = startTime ? startTime.split('T')[1]?.slice(0, 5) : '09:00';

  let endDate = endTime ? endTime.split('T')[0] : '';
  let endTimeVal = endTime ? endTime.split('T')[1]?.slice(0, 5) : '17:00';

  // Keep startTime and endTime synchronized with split components
  $: if (startDate && startTimeVal) {
    startTime = `${startDate}T${startTimeVal}`;
  } else if (!startDate) {
    startTime = '';
  }

  $: if (endDate && endTimeVal) {
    endTime = `${endDate}T${endTimeVal}`;
  } else if (!endDate) {
    endTime = '';
  }

  function getFormattedDateStr(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const todayStr = getFormattedDateStr(new Date());

  function setStartDateQuick(type) {
    const d = new Date();
    if (type === 'tomorrow') d.setDate(d.getDate() + 1);
    else if (type === 'nextweek') d.setDate(d.getDate() + 7);
    startDate = getFormattedDateStr(d);
    if (!endDate || endDate < startDate) {
      endDate = startDate;
    }
  }

  function setEndDateQuick(type) {
    if (!startDate) setStartDateQuick('today');
    const d = new Date(startDate ? new Date(startDate) : new Date());
    if (type === 'sameday') {
      endDate = startDate;
    } else if (type === 'nextday') {
      d.setDate(d.getDate() + 1);
      endDate = getFormattedDateStr(d);
    }
  }

  function formatTime12h(timeStr) {
    if (!timeStr) return '12:00 PM';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    const displayHStr = String(displayH).padStart(2, '0');
    const displayMStr = String(m || 0).padStart(2, '0');
    return `${displayHStr}:${displayMStr} ${period}`;
  }

  function formatDateHuman(dateStr) {
    if (!dateStr) return 'Select Date';
    const parts = dateStr.split('-').map(Number);
    if (parts.length < 3) return dateStr;
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    return dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  // --- Theme Calendar Popover Logic ---
  let activeDatePicker = null; // 'start' | 'end' | null
  let viewMonth = new Date().getMonth();
  let viewYear = new Date().getFullYear();

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  function openCalendar(target) {
    activeDatePicker = target;
    const targetDateStr = target === 'start' ? startDate : endDate;
    if (targetDateStr && targetDateStr.includes('-')) {
      const parts = targetDateStr.split('-').map(Number);
      viewYear = parts[0];
      viewMonth = parts[1] - 1;
    } else {
      viewMonth = new Date().getMonth();
      viewYear = new Date().getFullYear();
    }
  }

  function getCalendarGrid(year, month) {
    const numDays = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const grid = [];
    for (let i = 0; i < firstDayIndex; i++) {
      grid.push(null);
    }
    for (let d = 1; d <= numDays; d++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      grid.push({ day: d, dateStr: `${year}-${monthStr}-${dayStr}` });
    }
    return grid;
  }

  function prevMonth() {
    if (viewMonth === 0) {
      viewMonth = 11;
      viewYear--;
    } else {
      viewMonth--;
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      viewMonth = 0;
      viewYear++;
    } else {
      viewMonth++;
    }
  }

  function selectCalendarDate(dateStr) {
    if (activeDatePicker === 'start') {
      startDate = dateStr;
      if (!endDate || endDate < startDate) {
        endDate = startDate;
      }
    } else if (activeDatePicker === 'end') {
      endDate = dateStr;
    }
    activeDatePicker = null;
  }

  // --- Theme Clock Time Picker Logic ---
  let activeTimePicker = null; // 'start' | 'end' | null
  let clockHour = 9;
  let clockMinute = 0;
  let clockPeriod = 'AM';

  function openClock(target) {
    activeTimePicker = target;
    const timeVal = target === 'start' ? startTimeVal : endTimeVal;
    if (timeVal) {
      const [h24, m] = timeVal.split(':').map(Number);
      clockPeriod = h24 >= 12 ? 'PM' : 'AM';
      clockHour = h24 % 12 || 12;
      clockMinute = m || 0;
    } else {
      clockHour = 9;
      clockMinute = 0;
      clockPeriod = 'AM';
    }
  }

  function applyClockTime() {
    let h24 = clockHour % 12;
    if (clockPeriod === 'PM') h24 += 12;
    const hStr = String(h24).padStart(2, '0');
    const mStr = String(clockMinute).padStart(2, '0');
    const newTimeVal = `${hStr}:${mStr}`;

    if (activeTimePicker === 'start') {
      startTimeVal = newTimeVal;
      if (startDate === endDate && endTimeVal <= startTimeVal) {
        const nextH24 = (h24 + 1) % 24;
        endTimeVal = `${String(nextH24).padStart(2, '0')}:${mStr}`;
      }
    } else if (activeTimePicker === 'end') {
      endTimeVal = newTimeVal;
    }
    activeTimePicker = null;
  }

  // --- Strict Validation Flags ---
  const now = new Date();
  const eventStart = event.start_time ? new Date(event.start_time) : null;
  const eventEnd = event.end_time ? new Date(event.end_time) : null;

  $: isEventLive = Boolean(eventStart && eventStart <= now && (!eventEnd || new Date(eventEnd) >= now));
  $: isEventEnded = Boolean(eventEnd && new Date(eventEnd) < now);

  $: isStartInPast = Boolean(!isEventLive && !isEventEnded && startDate && startDate < todayStr);
  $: isEndBeforeStart = Boolean(
    (endDate && startDate && endDate < startDate) ||
    (startDate && endDate && startDate === endDate && startTimeVal && endTimeVal && endTimeVal <= startTimeVal)
  );
  $: isTimeInvalid = isStartInPast || isEndBeforeStart;

  // Unsaved changes tracking
  let initialFormSnapshot = JSON.stringify({
    name,
    description,
    slug,
    location,
    googleMapUrl,
    eventFormat,
    startTime,
    endTime,
    isApprovalRequired,
    isVenueEnabled,
  });

  $: currentFormSnapshot = JSON.stringify({
    name,
    description,
    slug,
    location,
    googleMapUrl,
    eventFormat,
    startTime,
    endTime,
    isApprovalRequired,
    isVenueEnabled,
  });

  $: isDirty = currentFormSnapshot !== initialFormSnapshot;

  let showUnsavedModal = false;
  let pendingNavigation = null;

  // Browser tab close / refresh protection
  onMount(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && !saving && !deleting) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  });

  // SvelteKit internal navigation guard
  beforeNavigate((nav) => {
    if (isDirty && !saving && !deleting && nav.to && !pendingNavigation) {
      nav.cancel();
      pendingNavigation = nav;
      showUnsavedModal = true;
    }
  });

  async function handleDiscardAndLeave() {
    initialFormSnapshot = currentFormSnapshot; // mark clean
    showUnsavedModal = false;
    if (pendingNavigation?.to?.url) {
      const targetUrl = pendingNavigation.to.url.pathname + pendingNavigation.to.url.search;
      pendingNavigation = null;
      await goto(targetUrl);
    }
  }

  async function handleSaveAndLeave() {
    showUnsavedModal = false;
    await saveSettings();
    if (saveSuccess && pendingNavigation?.to?.url) {
      const targetUrl = pendingNavigation.to.url.pathname + pendingNavigation.to.url.search;
      pendingNavigation = null;
      await goto(targetUrl);
    }
  }

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
      initialFormSnapshot = currentFormSnapshot; // reset snapshot after successful save
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

      initialFormSnapshot = currentFormSnapshot; // prevent prompt
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

    <!-- Live or Ended Event Status Banner -->
    {#if isEventEnded}
      <div class="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-300 text-xs">
        <AlertTriangle size={18} class="shrink-0 text-red-400 mt-0.5" />
        <div>
          <p class="font-bold text-sm text-red-400">📁 Event Ended — Read-Only Mode</p>
          <p class="text-ink-400 mt-0.5 leading-relaxed">
            This event has ended. Settings are locked to preserve historical attendee records. You can still delete the event below if needed.
          </p>
        </div>
      </div>
    {:else if isEventLive}
      <div class="flex items-start gap-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 text-indigo-300 text-xs">
        <Clock size={18} class="shrink-0 text-indigo-400 mt-0.5" />
        <div>
          <p class="font-bold text-sm text-indigo-300">🔴 Event is Currently Live</p>
          <p class="text-ink-400 mt-0.5 leading-relaxed">
            Start time is locked while the event is live, but you can update location, end time, venue map, and details.
          </p>
        </div>
      </div>
    {/if}

    <!-- Edit Form -->
    <div class="glass rounded-2xl border border-white/8 p-6 sm:p-8 space-y-6 {isEventEnded ? 'opacity-75 pointer-events-none' : ''}">

      <div class="border-b border-white/8 pb-4 mb-2">
        <h2 class="text-base font-bold text-white">General</h2>
        <p class="text-xs text-ink-500 mt-0.5">Basic information about your event.</p>
      </div>

      <!-- Name -->
      <div class="space-y-2">
        <Label class="text-xs font-semibold uppercase tracking-widest text-ink-400">Event Name</Label>
        <Input
          bind:value={name}
          disabled={isEventEnded}
          placeholder="My Awesome Event"
          class="bg-white/5 border-white/10 text-white placeholder:text-ink-600 focus:border-indigo-400/50"
        />
      </div>

      <!-- Description -->
      <div class="space-y-2">
        <Label class="text-xs font-semibold uppercase tracking-widest text-ink-400">Description</Label>
        <textarea
          bind:value={description}
          disabled={isEventEnded}
          rows="4"
          placeholder="What is this event about?"
          class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-ink-600 focus:border-indigo-400/50 focus:outline-none focus:ring-1 focus:ring-indigo-400/20 resize-none disabled:opacity-50"
        ></textarea>
      </div>

      <!-- Slug -->
      <div class="space-y-2">
        <Label class="text-xs font-semibold uppercase tracking-widest text-ink-400">Slug (URL ID)</Label>
        <div class="flex items-center gap-2">
          <span class="text-xs text-ink-500 shrink-0">/event/</span>
          <Input
            bind:value={slug}
            disabled={isEventEnded}
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
              disabled={isEventEnded}
              onclick={() => (eventFormat = fmt)}
              class="py-2.5 rounded-xl border text-sm font-semibold capitalize transition-all {eventFormat === fmt
                ? 'bg-indigo-500/20 border-indigo-400/50 text-indigo-300'
                : 'bg-white/4 border-white/10 text-ink-400 hover:text-white hover:border-white/20'} disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {fmt}
            </button>
          {/each}
        </div>
      </div>

      <!-- Custom Date & Time Controls -->
      <div class="space-y-4 border-t border-white/6 pt-4">
        <div>
          <h3 class="text-sm font-bold text-white mb-0.5">Date & Time</h3>
          <p class="text-xs text-ink-500">Set event start and end schedule.</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <!-- Start Date & Time -->
          <div class="p-4 rounded-xl bg-white/3 border border-white/6 space-y-3 {isEventLive || isEventEnded ? 'opacity-60' : ''}">
            <div class="flex items-center justify-between">
              <Label class="text-xs font-semibold uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                <CalendarClock size={14} /> Start Schedule
                {#if isEventLive}
                  <span class="text-[10px] text-amber-400 font-bold ml-1">(Locked - Live)</span>
                {/if}
              </Label>
              {#if !isEventLive && !isEventEnded}
                <div class="flex gap-1.5 text-[11px]">
                  <button type="button" onclick={() => setStartDateQuick('today')} class="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-indigo-300 transition-colors">Today</button>
                  <button type="button" onclick={() => setStartDateQuick('tomorrow')} class="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-indigo-300 transition-colors">Tomorrow</button>
                </div>
              {/if}
            </div>

            <!-- Custom Date Button -->
            <div>
              <span class="text-[11px] text-ink-500 block mb-1">Start Date</span>
              <button
                type="button"
                disabled={isEventLive || isEventEnded}
                onclick={() => openCalendar('start')}
                class="w-full flex items-center justify-between bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white transition-colors disabled:cursor-not-allowed"
              >
                <span class="flex items-center gap-2">
                  <Calendar size={15} class="text-indigo-400" />
                  {formatDateHuman(startDate)}
                </span>
                {#if !isEventLive && !isEventEnded}
                  <span class="text-xs text-indigo-400 font-medium">Pick Date</span>
                {/if}
              </button>
            </div>

            <!-- Custom Clock Time Button -->
            <div>
              <span class="text-[11px] text-ink-500 block mb-1">Start Time</span>
              <button
                type="button"
                disabled={isEventLive || isEventEnded}
                onclick={() => openClock('start')}
                class="w-full flex items-center justify-between bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white transition-colors disabled:cursor-not-allowed"
              >
                <span class="flex items-center gap-2">
                  <Clock size={15} class="text-indigo-400" />
                  {formatTime12h(startTimeVal)}
                </span>
                {#if !isEventLive && !isEventEnded}
                  <span class="text-xs text-indigo-400 font-medium">Pick Time</span>
                {/if}
              </button>
            </div>
          </div>

          <!-- End Date & Time -->
          <div class="p-4 rounded-xl bg-white/3 border border-white/6 space-y-3">
            <div class="flex items-center justify-between">
              <Label class="text-xs font-semibold uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                <CalendarClock size={14} /> End Schedule
              </Label>
              {#if !isEventEnded}
                <div class="flex gap-1.5 text-[11px]">
                  <button type="button" onclick={() => setEndDateQuick('sameday')} class="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-indigo-300 transition-colors">Same Day</button>
                  <button type="button" onclick={() => setEndDateQuick('nextday')} class="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-indigo-300 transition-colors">Next Day</button>
                </div>
              {/if}
            </div>

            <!-- Custom Date Button -->
            <div>
              <span class="text-[11px] text-ink-500 block mb-1">End Date</span>
              <button
                type="button"
                disabled={isEventEnded}
                onclick={() => openCalendar('end')}
                class="w-full flex items-center justify-between bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white transition-colors disabled:cursor-not-allowed"
              >
                <span class="flex items-center gap-2">
                  <Calendar size={15} class="text-indigo-400" />
                  {formatDateHuman(endDate)}
                </span>
                {#if !isEventEnded}
                  <span class="text-xs text-indigo-400 font-medium">Pick Date</span>
                {/if}
              </button>
            </div>

            <!-- Custom Clock Time Button -->
            <div>
              <span class="text-[11px] text-ink-500 block mb-1">End Time</span>
              <button
                type="button"
                disabled={isEventEnded}
                onclick={() => openClock('end')}
                class="w-full flex items-center justify-between bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white transition-colors disabled:cursor-not-allowed"
              >
                <span class="flex items-center gap-2">
                  <Clock size={15} class="text-indigo-400" />
                  {formatTime12h(endTimeVal)}
                </span>
                {#if !isEventEnded}
                  <span class="text-xs text-indigo-400 font-medium">Pick Time</span>
                {/if}
              </button>
            </div>
          </div>
        </div>

        <!-- Strict Time Validation Alerts -->
        {#if isStartInPast}
          <div class="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
            <AlertTriangle size={14} class="shrink-0" />
            Start date cannot be in the past.
          </div>
        {:else if isEndBeforeStart}
          <div class="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
            <AlertTriangle size={14} class="shrink-0" />
            End time must be greater than start time.
          </div>
        {/if}
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
              disabled={isEventEnded}
              rows="3"
              placeholder="123 Main St, City, Country"
              class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-ink-600 focus:border-indigo-400/50 focus:outline-none focus:ring-1 focus:ring-indigo-400/20 resize-none disabled:opacity-50"
            ></textarea>
          </div>
          <div class="space-y-2">
            <Label class="text-xs font-semibold uppercase tracking-widest text-ink-400">
              <Globe size={12} class="inline mr-1 text-amber-400" />Google Maps URL
            </Label>
            <Input
              bind:value={googleMapUrl}
              disabled={isEventEnded}
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
              disabled={isEventEnded}
              onclick={() => (isVenueEnabled = !isVenueEnabled)}
              class="relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 {isVenueEnabled ? 'bg-cyan-500' : 'bg-white/10'} disabled:opacity-50"
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
            disabled={isEventEnded}
            onclick={() => (isApprovalRequired = !isApprovalRequired)}
            class="relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 {isApprovalRequired ? 'bg-amber-500' : 'bg-white/10'} disabled:opacity-50"
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
        disabled={saving || isTimeInvalid || isEventEnded}
        class="w-full gap-2 h-11 text-sm font-semibold"
      >
        {#if saving}
          <LoaderCircle size={15} class="animate-spin" />
          Saving…
        {:else}
          <Save size={15} />
          {isEventEnded ? 'Settings Locked (Event Ended)' : 'Save Changes'}
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

    <!-- Theme Calendar Popover Modal -->
    {#if activeDatePicker}
      <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div class="glass rounded-2xl border border-white/10 p-6 max-w-sm w-full space-y-4 shadow-2xl bg-neutral-950/95">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-white uppercase tracking-wider">
              {activeDatePicker === 'start' ? 'Select Start Date' : 'Select End Date'}
            </h3>
            <button type="button" onclick={() => (activeDatePicker = null)} class="text-ink-400 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <!-- Month Navigation -->
          <div class="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
            <button type="button" onclick={prevMonth} class="text-ink-400 hover:text-white p-1">
              <ArrowLeft size={16} />
            </button>
            <span class="text-sm font-semibold text-white">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button type="button" onclick={nextMonth} class="text-ink-400 hover:text-white p-1">
              <ArrowRight size={16} />
            </button>
          </div>

          <!-- Days Grid -->
          <div class="grid grid-cols-7 gap-1 text-center">
            {#each ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as dayHead}
              <span class="text-[11px] font-bold text-ink-500 py-1">{dayHead}</span>
            {/each}

            {#each getCalendarGrid(viewYear, viewMonth) as item}
              {#if !item}
                <div></div>
              {:else}
                {@const minAllowed = activeDatePicker === 'start' ? todayStr : (startDate || todayStr)}
                {@const isDisabled = item.dateStr < minAllowed}
                {@const isSelected = item.dateStr === (activeDatePicker === 'start' ? startDate : endDate)}
                <button
                  type="button"
                  disabled={isDisabled}
                  onclick={() => selectCalendarDate(item.dateStr)}
                  class="h-9 w-9 mx-auto rounded-xl text-xs font-semibold flex items-center justify-center transition-all {isSelected
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                    : isDisabled
                    ? 'text-white/20 cursor-not-allowed opacity-30'
                    : 'text-ink-300 hover:bg-white/10 hover:text-white'}"
                >
                  {item.day}
                </button>
              {/if}
            {/each}
          </div>

          <div class="text-[11px] text-ink-500 text-center pt-1 border-t border-white/6">
            Dates prior to {activeDatePicker === 'start' ? 'today' : 'start date'} are blocked.
          </div>
        </div>
      </div>
    {/if}

    <!-- Theme Clock Time Picker Popover Modal -->
    {#if activeTimePicker}
      <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div class="glass rounded-2xl border border-white/10 p-6 max-w-sm w-full space-y-5 shadow-2xl bg-neutral-950/95">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} class="text-indigo-400" />
              {activeTimePicker === 'start' ? 'Set Start Time' : 'Set End Time'}
            </h3>
            <button type="button" onclick={() => (activeTimePicker = null)} class="text-ink-400 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <!-- Clock Display -->
          <div class="flex items-center justify-center gap-3 bg-white/5 rounded-2xl p-4 border border-white/8">
            <div class="text-3xl font-black font-mono text-white tracking-wider">
              {String(clockHour).padStart(2, '0')}:{String(clockMinute).padStart(2, '0')}
            </div>
            <div class="flex flex-col gap-1">
              <button
                type="button"
                onclick={() => (clockPeriod = 'AM')}
                class="px-2.5 py-1 text-xs font-bold rounded-lg transition-all {clockPeriod === 'AM' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-ink-400 hover:text-white'}"
              >
                AM
              </button>
              <button
                type="button"
                onclick={() => (clockPeriod = 'PM')}
                class="px-2.5 py-1 text-xs font-bold rounded-lg transition-all {clockPeriod === 'PM' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-ink-400 hover:text-white'}"
              >
                PM
              </button>
            </div>
          </div>

          <!-- Hours Selection Grid -->
          <div class="space-y-1.5">
            <span class="text-[11px] font-bold uppercase tracking-wider text-ink-400">Hour</span>
            <div class="grid grid-cols-6 gap-1.5">
              {#each [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as h}
                <button
                  type="button"
                  onclick={() => (clockHour = h)}
                  class="py-2 rounded-xl text-xs font-semibold transition-all {clockHour === h
                    ? 'bg-indigo-500/30 border border-indigo-400/50 text-indigo-300 font-bold'
                    : 'bg-white/4 border border-white/6 text-ink-300 hover:bg-white/10 hover:text-white'}"
                >
                  {h}
                </button>
              {/each}
            </div>
          </div>

          <!-- Minutes Selection Grid -->
          <div class="space-y-1.5">
            <span class="text-[11px] font-bold uppercase tracking-wider text-ink-400">Minute</span>
            <div class="grid grid-cols-4 gap-2">
              {#each [0, 15, 30, 45] as m}
                <button
                  type="button"
                  onclick={() => (clockMinute = m)}
                  class="py-2 rounded-xl text-xs font-semibold transition-all {clockMinute === m
                    ? 'bg-indigo-500/30 border border-indigo-400/50 text-indigo-300 font-bold'
                    : 'bg-white/4 border border-white/6 text-ink-300 hover:bg-white/10 hover:text-white'}"
                >
                  :{String(m).padStart(2, '0')}
                </button>
              {/each}
            </div>
          </div>

          <!-- Apply Button -->
          <Button onclick={applyClockTime} class="w-full font-semibold">
            Apply Time
          </Button>
        </div>
      </div>
    {/if}

    <!-- Unsaved Changes Prompt Modal -->
    {#if showUnsavedModal}
      <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div class="glass rounded-2xl border border-amber-500/30 p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle class="text-amber-400" size={20} />
            </div>
            <div>
              <h3 class="text-lg font-bold text-white">Unsaved Changes</h3>
              <p class="text-xs text-ink-400 mt-1 leading-relaxed">
                You have unsaved changes. If you leave now, your modifications will be lost.
              </p>
            </div>
          </div>
          <div class="flex flex-col sm:flex-row justify-end gap-2.5 pt-2 border-t border-white/10">
            <Button
              variant="outline"
              class="border-white/10 text-ink-300 hover:text-white text-xs"
              onclick={() => { showUnsavedModal = false; pendingNavigation = null; }}
            >
              Keep Editing
            </Button>
            <Button
              variant="destructive"
              class="bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 text-xs"
              onclick={handleDiscardAndLeave}
            >
              Discard & Leave
            </Button>
            <Button
              class="bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs"
              onclick={handleSaveAndLeave}
            >
              Save & Leave
            </Button>
          </div>
        </div>
      </div>
    {/if}

  </main>
</PageShell>
