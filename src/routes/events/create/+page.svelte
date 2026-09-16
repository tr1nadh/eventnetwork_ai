<script>
  import { onMount } from 'svelte';
  import { goto, beforeNavigate } from '$app/navigation';
  import {
    ArrowLeft,
    ArrowRight,
    FolderPlus,
    LoaderCircle,
    Plus,
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
  import { clearAllEventStores } from '$lib/stores/eventStore';
  import { clearAllChatStores } from '$lib/stores/chatStore';
  import Sidebar from '$lib/components/sidebar.svelte';
  import PageShell from '$lib/components/page-shell.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { toast } from '$lib/components/ui/sonner/index.js';

  export let data;

  const supabase = createSupabaseBrowserClient();

  let signingOut = false;
  async function signOut() {
    signingOut = true;
    try {
      await supabase.auth.signOut();
      clearAllEventStores();
      clearAllChatStores();
      await goto('/');
    } catch (e) {
      toast.error('Failed to sign out');
    } finally {
      signingOut = false;
    }
  }

  // Initial defaults
  function getFormattedDateStr(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const now = new Date();
  const defaultStartObj = new Date(now.getTime() + 30 * 60 * 1000);
  const defaultEndObj = new Date(defaultStartObj.getTime() + 2 * 60 * 60 * 1000);

  const todayStr = getFormattedDateStr(now);

  // Form State
  let name = '';
  let description = '';
  let slug = '';
  let eventFormat = 'offline';
  let location = '';
  let googleMapUrl = '';
  let isApprovalRequired = false;
  let isVenueEnabled = false;

  let startDate = getFormattedDateStr(defaultStartObj);
  let startTimeVal = `${String(defaultStartObj.getHours()).padStart(2, '0')}:${String(defaultStartObj.getMinutes()).padStart(2, '0')}`;

  let endDate = getFormattedDateStr(defaultEndObj);
  let endTimeVal = `${String(defaultEndObj.getHours()).padStart(2, '0')}:${String(defaultEndObj.getMinutes()).padStart(2, '0')}`;

  // Keep computed ISO timestamps in sync
  $: startTimeIso = startDate && startTimeVal ? `${startDate}T${startTimeVal}:00` : '';
  $: endTimeIso = endDate && endTimeVal ? `${endDate}T${endTimeVal}:00` : '';

  // Auto-generate event ID/slug from name if user hasn't modified it manually
  $: autoSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 48);

  $: resolvedSlug = slug.trim() || autoSlug;

  // Quick Date Selectors
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

  // Copy slug link
  let copiedSlug = false;
  async function copySlugUrl() {
    const fullUrl = `${window.location.origin}/event/${resolvedSlug}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      copiedSlug = true;
      toast.success('Event link copied to clipboard');
      setTimeout(() => (copiedSlug = false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  }

  // Validation Flags
  $: isStartInPast = Boolean(startDate && startDate < todayStr);
  $: isEndBeforeStart = Boolean(
    (endDate && startDate && endDate < startDate) ||
    (startDate && endDate && startDate === endDate && startTimeVal && endTimeVal && endTimeVal <= startTimeVal)
  );
  $: isTimeInvalid = isStartInPast || isEndBeforeStart;

  // Unsaved changes tracking
  let initialFormSnapshot = JSON.stringify({
    name: '',
    description: '',
    slug: '',
    location: '',
    googleMapUrl: '',
    eventFormat: 'offline',
    isApprovalRequired: false,
    isVenueEnabled: true,
  });

  $: currentFormSnapshot = JSON.stringify({
    name,
    description,
    slug,
    location,
    googleMapUrl,
    eventFormat,
    isApprovalRequired,
    isVenueEnabled,
  });

  $: isDirty = name.trim().length > 0 || currentFormSnapshot !== initialFormSnapshot;

  let showUnsavedModal = false;
  let pendingNavigation = null;
  let creatingEvent = false;
  let createError = null;

  onMount(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && !creatingEvent) {
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

  beforeNavigate(({ cancel, to }) => {
    if (isDirty && !creatingEvent && !pendingNavigation) {
      cancel();
      pendingNavigation = to;
      showUnsavedModal = true;
    }
  });

  function handleDiscardAndLeave() {
    showUnsavedModal = false;
    const dest = pendingNavigation?.url?.pathname || '/events';
    pendingNavigation = null;
    initialFormSnapshot = currentFormSnapshot;
    goto(dest);
  }

  async function handleSaveAndLeave() {
    showUnsavedModal = false;
    const created = await createEvent();
    if (created && pendingNavigation?.url?.pathname) {
      goto(pendingNavigation.url.pathname);
    }
    pendingNavigation = null;
  }

  async function createEvent() {
    if (!name.trim()) {
      createError = 'Event name is required.';
      return false;
    }
    if (isTimeInvalid) return false;

    creatingEvent = true;
    createError = null;

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          id: resolvedSlug,
          description: description.trim() || null,
          start_time: startTimeIso ? new Date(startTimeIso).toISOString() : undefined,
          end_time: endTimeIso ? new Date(endTimeIso).toISOString() : undefined,
          event_format: eventFormat,
          location: location.trim() || null,
          google_map_url: googleMapUrl.trim() || null,
          is_approval_required: isApprovalRequired,
          is_venue_enabled: isVenueEnabled,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = payload?.error ?? 'Could not create event.';
        createError = message;
        toast.error(
          response.status === 409
            ? 'ID already exists'
            : 'Event creation failed',
          { description: message }
        );
        return false;
      }

      initialFormSnapshot = currentFormSnapshot;
      toast.success('Event created', {
        description: 'Your new event is now available in your dashboard.',
      });
      await goto('/events');
      return true;
    } catch (err) {
      createError = err instanceof Error ? err.message : 'Could not create event.';
      toast.error('Event creation failed', { description: createError });
      return false;
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
    <!-- Header -->
    <div class="mb-8 flex items-center justify-between animate-fade-in">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400 mb-1">
          New Event
        </p>
        <h1 class="text-3xl font-black text-white">
          Create Event
        </h1>
      </div>
      <Button
        variant="secondary"
        onclick={() => goto('/events')}
        class="gap-2 shrink-0 border border-white/10 hover:bg-white/10"
      >
        <ArrowLeft size={15} />
        Back
      </Button>
    </div>

    <!-- Create Form Card -->
    <div class="glass rounded-2xl border border-white/8 p-6 sm:p-8 space-y-6">

      <div class="border-b border-white/8 pb-4 mb-2 flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-500/30">
          <FolderPlus size={17} class="text-indigo-400" />
        </div>
        <div>
          <h2 class="text-base font-bold text-white">General</h2>
          <p class="text-xs text-ink-500">Basic information about your event.</p>
        </div>
      </div>

      <!-- Name -->
      <div class="space-y-2">
        <Label class="text-xs font-semibold uppercase tracking-widest text-ink-400">Event Name *</Label>
        <Input
          bind:value={name}
          placeholder="HackNight Delhi 2026"
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
            placeholder={autoSlug || 'hacknight-delhi-2026'}
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
        <p class="text-[11px] text-ink-500">Unique identifier for your event URL.</p>
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

      <!-- Custom Date & Time Controls -->
      <div class="space-y-4 border-t border-white/6 pt-4">
        <div>
          <h3 class="text-sm font-bold text-white mb-0.5">Date & Time</h3>
          <p class="text-xs text-ink-500">Set event start and end schedule.</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <!-- Start Date & Time -->
          <div class="p-4 rounded-xl bg-white/3 border border-white/6 space-y-3">
            <div class="flex items-center justify-between">
              <Label class="text-xs font-semibold uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                <CalendarClock size={14} /> Start Schedule
              </Label>
              <div class="flex gap-1.5 text-[11px]">
                <button type="button" onclick={() => setStartDateQuick('today')} class="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-indigo-300 transition-colors">Today</button>
                <button type="button" onclick={() => setStartDateQuick('tomorrow')} class="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-indigo-300 transition-colors">Tomorrow</button>
              </div>
            </div>

            <!-- Custom Date Button -->
            <div>
              <span class="text-[11px] text-ink-500 block mb-1">Start Date</span>
              <button
                type="button"
                onclick={() => openCalendar('start')}
                class="w-full flex items-center justify-between bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white transition-colors"
              >
                <span class="flex items-center gap-2">
                  <Calendar size={15} class="text-indigo-400" />
                  {formatDateHuman(startDate)}
                </span>
                <span class="text-xs text-indigo-400 font-medium">Pick Date</span>
              </button>
            </div>

            <!-- Custom Clock Time Button -->
            <div>
              <span class="text-[11px] text-ink-500 block mb-1">Start Time</span>
              <button
                type="button"
                onclick={() => openClock('start')}
                class="w-full flex items-center justify-between bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white transition-colors"
              >
                <span class="flex items-center gap-2">
                  <Clock size={15} class="text-indigo-400" />
                  {formatTime12h(startTimeVal)}
                </span>
                <span class="text-xs text-indigo-400 font-medium">Pick Time</span>
              </button>
            </div>
          </div>

          <!-- End Date & Time -->
          <div class="p-4 rounded-xl bg-white/3 border border-white/6 space-y-3">
            <div class="flex items-center justify-between">
              <Label class="text-xs font-semibold uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                <CalendarClock size={14} /> End Schedule
              </Label>
              <div class="flex gap-1.5 text-[11px]">
                <button type="button" onclick={() => setEndDateQuick('sameday')} class="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-indigo-300 transition-colors">Same Day</button>
                <button type="button" onclick={() => setEndDateQuick('nextday')} class="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-indigo-300 transition-colors">Next Day</button>
              </div>
            </div>

            <!-- Custom Date Button -->
            <div>
              <span class="text-[11px] text-ink-500 block mb-1">End Date</span>
              <button
                type="button"
                onclick={() => openCalendar('end')}
                class="w-full flex items-center justify-between bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white transition-colors"
              >
                <span class="flex items-center gap-2">
                  <Calendar size={15} class="text-indigo-400" />
                  {formatDateHuman(endDate)}
                </span>
                <span class="text-xs text-indigo-400 font-medium">Pick Date</span>
              </button>
            </div>

            <!-- Custom Clock Time Button -->
            <div>
              <span class="text-[11px] text-ink-500 block mb-1">End Time</span>
              <button
                type="button"
                onclick={() => openClock('end')}
                class="w-full flex items-center justify-between bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white transition-colors"
              >
                <span class="flex items-center gap-2">
                  <Clock size={15} class="text-indigo-400" />
                  {formatTime12h(endTimeVal)}
                </span>
                <span class="text-xs text-indigo-400 font-medium">Pick Time</span>
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
        </div>
      {/if}

      <!-- Options -->
      <div class="space-y-4 pt-2 border-t border-white/6">
        <h3 class="text-sm font-bold text-white">Options</h3>

        <!-- Enable Venue Map (offline/hybrid only) -->
        {#if eventFormat !== 'online'}
          <div class="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/3 border border-white/6">
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
              aria-label="Enable Venue Map"
            >
              <span
                class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 {isVenueEnabled ? 'translate-x-5' : 'translate-x-0'}"
              ></span>
            </button>
          </div>
        {/if}

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
            aria-label="Approval Required"
          >
            <span
              class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 {isApprovalRequired ? 'translate-x-5' : 'translate-x-0'}"
            ></span>
          </button>
        </div>
      </div>

      <!-- Create error -->
      {#if createError}
        <div class="flex items-start gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
          <AlertTriangle size={15} class="shrink-0 mt-0.5" />
          {createError}
        </div>
      {/if}

      <!-- Create Event Submit Button -->
      <Button
        onclick={createEvent}
        disabled={creatingEvent || !name.trim() || isTimeInvalid}
        class="w-full gap-2 h-11 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
      >
        {#if creatingEvent}
          <LoaderCircle size={15} class="animate-spin" />
          Creating Event…
        {:else}
          <Plus size={15} />
          Create Event
        {/if}
      </Button>

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
              <h3 class="text-lg font-bold text-white">Unsaved Event Draft</h3>
              <p class="text-xs text-ink-400 mt-1 leading-relaxed">
                You have started creating an event. If you leave now, your draft will be lost.
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
              class="bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-xs"
              onclick={handleSaveAndLeave}
            >
              Create & Leave
            </Button>
          </div>
        </div>
      </div>
    {/if}

  </main>
</PageShell>
