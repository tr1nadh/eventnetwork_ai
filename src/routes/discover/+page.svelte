<script>
  import {
    ArrowRight,
    Sparkles,
    Plus,
    Link as LinkIcon,
    Copy,
    CheckCheck,
    CalendarClock,
    Search,
    Compass,
    Crown,
    Globe,
    MapPin,
    Lock,
    Calendar,
    CalendarDays,
    SlidersHorizontal,
    Check,
    RotateCcw,
    X,
    ChevronLeft,
    ChevronRight,
  } from "@lucide/svelte";
  import { onDestroy } from "svelte";
  import Sidebar from "$lib/components/sidebar.svelte";
  import PageShell from "$lib/components/page-shell.svelte";
  import { createSupabaseBrowserClient } from "$lib/supabase/client";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { goto } from "$app/navigation";
  import { navigating } from "$app/stores";
  import { toast } from "$lib/components/ui/sonner/index.js";
  import { clearAllEventStores } from "$lib/stores/eventStore";
  import { clearAllChatStores } from "$lib/stores/chatStore";

  export let data;

  const supabase = createSupabaseBrowserClient();
  let signingOut = false;
  let copiedSlug = null;

  // Filter states — initialised from URL (returned by server)
  let filterOnline = data.format === 'online';
  let filterOffline = data.format === 'offline';
  // Determine date mode from URL params
  let dateFilterMode = data.date ? 'single' : (data.dateStart || data.dateEnd ? 'range' : 'all');
  let selectedSingleDate = data.date || null;     // 'YYYY-MM-DD'
  let rangeStartDate = data.dateStart || null;    // 'YYYY-MM-DD'
  let rangeEndDate = data.dateEnd || null;         // 'YYYY-MM-DD'
  let mobileFiltersOpen = false;

  // Debounce timer for date changes (calendar taps shouldn't each fire a navigation)
  let filterTimeout;

  // Mobile Bottom Sheet Swipe gestures
  let touchStartY = 0;
  let currentTouchY = 0;
  let sheetTransform = 0;
  let isDragging = false;

  function handleTouchStart(e) {
    if (!e.touches || e.touches.length === 0) return;
    touchStartY = e.touches[0].clientY;
    currentTouchY = touchStartY;
    isDragging = true;
    sheetTransform = 0;
  }

  function handleTouchMove(e) {
    if (!isDragging || !e.touches || e.touches.length === 0) return;
    currentTouchY = e.touches[0].clientY;
    const deltaY = currentTouchY - touchStartY;
    if (deltaY > 0) {
      sheetTransform = deltaY;
    } else {
      sheetTransform = 0;
    }
  }

  function handleTouchEnd() {
    if (!isDragging) return;
    isDragging = false;
    const deltaY = currentTouchY - touchStartY;
    if (deltaY > 60) {
      closeMobileFilters();
    } else {
      sheetTransform = 0;
    }
  }

  function openMobileFilters() {
    sheetTransform = 0;
    mobileFiltersOpen = true;
  }

  function closeMobileFilters() {
    sheetTransform = 0;
    isDragging = false;
    mobileFiltersOpen = false;
  }

  $: if (typeof document !== "undefined") {
    if (mobileFiltersOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }

  onDestroy(() => {
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
  });

  // Calendar state
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  let currentMonth = now.getMonth();
  let currentYear = now.getFullYear();

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  function getEventDateStr(event) {
    const raw = event.start_time || event.created_at;
    if (!raw) return null;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function getEventEndDateStr(event) {
    if (!event.end_time) return null;
    const d = new Date(event.end_time);
    if (isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // Pre-calculate event dates for calendar indicators (from already-filtered server results)
  $: eventDatesSet = new Set(
    (data.events || [])
      .map((e) => getEventDateStr(e))
      .filter(Boolean)
  );

  // Events are pre-filtered server-side; expose directly
  $: filteredEvents = data.events || [];

  $: onlineCount = (data.events || []).filter((e) => e.event_format === "online" || e.event_format === "hybrid").length;
  $: offlineCount = (data.events || []).filter((e) => !e.event_format || e.event_format === "offline" || e.event_format === "hybrid").length;

  $: hasActiveFilters =
    filterOnline ||
    filterOffline ||
    (dateFilterMode === "single" && selectedSingleDate) ||
    (dateFilterMode === "range" && (rangeStartDate || rangeEndDate));

  $: activeFilterCount =
    (filterOnline ? 1 : 0) +
    (filterOffline ? 1 : 0) +
    (dateFilterMode === "single" && selectedSingleDate ? 1 : 0) +
    (dateFilterMode === "range" && (rangeStartDate || rangeEndDate) ? 1 : 0);

  /** Pushes current filter state into the URL, triggering a server re-fetch */
  function applyFilters() {
    const params = new URLSearchParams(window.location.search);
    // Format
    const fmt = filterOnline && !filterOffline ? 'online' : (!filterOnline && filterOffline ? 'offline' : '');
    if (fmt) params.set('format', fmt);
    else params.delete('format');
    // Date
    params.delete('date');
    params.delete('date_start');
    params.delete('date_end');
    if (dateFilterMode === 'single' && selectedSingleDate) {
      params.set('date', selectedSingleDate);
    } else if (dateFilterMode === 'range') {
      if (rangeStartDate) params.set('date_start', rangeStartDate);
      if (rangeEndDate) params.set('date_end', rangeEndDate);
    }
    goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
  }

  function applyFiltersDebounced() {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(applyFilters, 300);
  }

  function resetFilters() {
    filterOnline = false;
    filterOffline = false;
    dateFilterMode = "all";
    selectedSingleDate = null;
    rangeStartDate = null;
    rangeEndDate = null;
    const params = new URLSearchParams(window.location.search);
    params.delete('format');
    params.delete('date');
    params.delete('date_start');
    params.delete('date_end');
    goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
  }

  function handleDateClick(dateStr) {
    if (dateFilterMode === "single") {
      if (selectedSingleDate === dateStr) {
        selectedSingleDate = null;
        dateFilterMode = "all";
      } else {
        selectedSingleDate = dateStr;
      }
    } else if (dateFilterMode === "range") {
      if (!rangeStartDate || (rangeStartDate && rangeEndDate)) {
        rangeStartDate = dateStr;
        rangeEndDate = null;
      } else if (rangeStartDate && !rangeEndDate) {
        if (dateStr < rangeStartDate) {
          rangeEndDate = rangeStartDate;
          rangeStartDate = dateStr;
        } else {
          rangeEndDate = dateStr;
        }
      }
    } else {
      dateFilterMode = "single";
      selectedSingleDate = dateStr;
    }
    // Only fire navigation when selection is complete
    const isComplete =
      dateFilterMode === 'all' ||
      (dateFilterMode === 'single' && (selectedSingleDate || true)) ||
      (dateFilterMode === 'range' && rangeStartDate && rangeEndDate);
    if (isComplete) applyFiltersDebounced();
  }

  function prevMonth() {
    if (currentMonth === 0) {
      currentMonth = 11;
      currentYear--;
    } else {
      currentMonth--;
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      currentMonth = 0;
      currentYear++;
    } else {
      currentMonth++;
    }
  }

  function formatShortDate(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function setPreset(preset) {
    const d = new Date();
    if (preset === "today") {
      dateFilterMode = "single";
      selectedSingleDate = todayStr;
      currentYear = d.getFullYear();
      currentMonth = d.getMonth();
    } else if (preset === "thisWeek") {
      dateFilterMode = "range";
      const day = d.getDay();
      const start = new Date(d);
      start.setDate(d.getDate() - day);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const sYear = start.getFullYear();
      const sMonth = String(start.getMonth() + 1).padStart(2, "0");
      const sDay = String(start.getDate()).padStart(2, "0");
      const eYear = end.getFullYear();
      const eMonth = String(end.getMonth() + 1).padStart(2, "0");
      const eDay = String(end.getDate()).padStart(2, "0");
      rangeStartDate = `${sYear}-${sMonth}-${sDay}`;
      rangeEndDate = `${eYear}-${eMonth}-${eDay}`;
      currentYear = d.getFullYear();
      currentMonth = d.getMonth();
    } else if (preset === "thisMonth") {
      dateFilterMode = "range";
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const sYear = start.getFullYear();
      const sMonth = String(start.getMonth() + 1).padStart(2, "0");
      const sDay = String(start.getDate()).padStart(2, "0");
      const eYear = end.getFullYear();
      const eMonth = String(end.getMonth() + 1).padStart(2, "0");
      const eDay = String(end.getDate()).padStart(2, "0");
      rangeStartDate = `${sYear}-${sMonth}-${sDay}`;
      rangeEndDate = `${eYear}-${eMonth}-${eDay}`;
      currentYear = d.getFullYear();
      currentMonth = d.getMonth();
    } else if (preset === "all") {
      dateFilterMode = "all";
      selectedSingleDate = null;
      rangeStartDate = null;
      rangeEndDate = null;
    }
    applyFilters();
  }

  function getCalendarGrid(year, month) {
    const numDays = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const grid = [];
    for (let i = 0; i < firstDayIndex; i++) {
      grid.push(null);
    }
    for (let d = 1; d <= numDays; d++) {
      const monthStr = String(month + 1).padStart(2, "0");
      const dayStr = String(d).padStart(2, "0");
      grid.push({ day: d, dateStr: `${year}-${monthStr}-${dayStr}` });
    }
    return grid;
  }

  function formatEventDateRange(start, end) {
    if (!start) return "";
    const startDate = new Date(start);
    const dateStr = startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const startTimeStr = startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    if (!end) return `${dateStr}, ${startTimeStr}`;
    const endDate = new Date(end);
    const endTimeStr = endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${dateStr} • ${startTimeStr} - ${endTimeStr}`;
  }

  $: searchQuery = data.q || "";

  async function signOut() {
    signingOut = true;
    await supabase.auth.signOut();
    clearAllEventStores();
    clearAllChatStores();
    await goto("/");
    signingOut = false;
  }

  async function copySlug(slug) {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/event/${slug}`,
      );
      copiedSlug = slug;
      toast.success("Link copied!");
      setTimeout(() => {
        copiedSlug = null;
      }, 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  let searchTimeout;

  function handleInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (searchQuery) {
        params.set("q", searchQuery);
      } else {
        params.delete("q");
      }
      goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
    }, 300);
  }

  function applySearch(e) {
    e.preventDefault();
    clearTimeout(searchTimeout);
    const params = new URLSearchParams(window.location.search);
    if (searchQuery) {
      params.set("q", searchQuery);
    } else {
      params.delete("q");
    }
    goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
  }
</script>

<!-- Filter Sections Reusable Snippet -->
{#snippet filterSections(isMobile = false)}
  <!-- Section 1: Event Format / Type (Online and Offline Checkboxes) -->
  <div class="space-y-3">
    <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
      <span>Event Type</span>
    </h3>
    <div class="space-y-2">
      <!-- Online Checkbox -->
      <label
        class="group flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none {filterOnline
          ? 'bg-amber-400/10 border-amber-400/40 shadow-sm'
          : 'bg-white/3 border-white/8 hover:bg-white/6 hover:border-white/15'}"
      >
        <div class="flex items-center gap-3">
          <div
            class="h-4 w-4 rounded-md border flex items-center justify-center transition {filterOnline
              ? 'bg-amber-400 border-amber-400 text-slate-950'
              : 'border-white/30 group-hover:border-white/60 bg-white/5'}"
          >
            {#if filterOnline}
              <Check size={12} strokeWidth={3} />
            {/if}
          </div>
          <input
            type="checkbox"
            id="{isMobile ? 'm-' : ''}filter-online"
            bind:checked={filterOnline}
            onchange={applyFilters}
            class="sr-only"
          />
          <div class="flex items-center gap-2 text-xs font-semibold text-white">
            <Globe size={14} class="text-cyan-400" />
            <span>Online</span>
          </div>
        </div>
        <span class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">
          {onlineCount}
        </span>
      </label>

      <!-- Offline Checkbox -->
      <label
        class="group flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none {filterOffline
          ? 'bg-amber-400/10 border-amber-400/40 shadow-sm'
          : 'bg-white/3 border-white/8 hover:bg-white/6 hover:border-white/15'}"
      >
        <div class="flex items-center gap-3">
          <div
            class="h-4 w-4 rounded-md border flex items-center justify-center transition {filterOffline
              ? 'bg-amber-400 border-amber-400 text-slate-950'
              : 'border-white/30 group-hover:border-white/60 bg-white/5'}"
          >
            {#if filterOffline}
              <Check size={12} strokeWidth={3} />
            {/if}
          </div>
          <input
            type="checkbox"
            id="{isMobile ? 'm-' : ''}filter-offline"
            bind:checked={filterOffline}
            onchange={applyFilters}
            class="sr-only"
          />
          <div class="flex items-center gap-2 text-xs font-semibold text-white">
            <MapPin size={14} class="text-amber-400" />
            <span>Offline</span>
          </div>
        </div>
        <span class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">
          {offlineCount}
        </span>
      </label>
    </div>
  </div>

  <!-- Section 2: Date Filter (By calendar & calendar range) -->
  <div class="space-y-3.5 pt-3 border-t border-white/8">
    <div class="flex items-center justify-between">
      <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
        <Calendar size={13} class="text-amber-400" />
        <span>Date Filter</span>
      </h3>
      {#if dateFilterMode !== 'all'}
        <button
          type="button"
          onclick={() => setPreset('all')}
          class="text-[10px] text-slate-400 hover:text-white transition"
        >
          Clear date
        </button>
      {/if}
    </div>

    <!-- Mode Selector Pills (By Calendar vs Calendar Range) -->
    <div class="grid grid-cols-2 gap-1 p-1 bg-white/5 border border-white/8 rounded-xl text-xs font-semibold">
      <button
        type="button"
        id="{isMobile ? 'm-' : ''}btn-mode-single"
        onclick={() => {
          dateFilterMode = 'single';
          rangeStartDate = null;
          rangeEndDate = null;
          applyFilters();
        }}
        class="flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition {dateFilterMode === 'single'
          ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
          : 'text-slate-400 hover:text-white hover:bg-white/5'}"
      >
        <Calendar size={13} />
        By Calendar
      </button>
      <button
        type="button"
        id="{isMobile ? 'm-' : ''}btn-mode-range"
        onclick={() => {
          dateFilterMode = 'range';
          selectedSingleDate = null;
          applyFilters();
        }}
        class="flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition {dateFilterMode === 'range'
          ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
          : 'text-slate-400 hover:text-white hover:bg-white/5'}"
      >
        <CalendarDays size={13} />
        Date Range
      </button>
    </div>

    <!-- Quick Preset Chips -->
    <div class="flex flex-wrap gap-1.5">
      <button
        type="button"
        onclick={() => setPreset('today')}
        class="px-2.5 py-1 rounded-lg text-[11px] font-medium border transition {dateFilterMode === 'single' && selectedSingleDate === todayStr
          ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
          : 'bg-white/4 text-slate-300 border-white/8 hover:bg-white/8 hover:text-white'}"
      >
        Today
      </button>
      <button
        type="button"
        onclick={() => setPreset('thisWeek')}
        class="px-2.5 py-1 rounded-lg text-[11px] font-medium border transition {dateFilterMode === 'range' && rangeStartDate && rangeEndDate
          ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
          : 'bg-white/4 text-slate-300 border-white/8 hover:bg-white/8 hover:text-white'}"
      >
        This Week
      </button>
      <button
        type="button"
        onclick={() => setPreset('thisMonth')}
        class="px-2.5 py-1 rounded-lg text-[11px] font-medium border transition bg-white/4 text-slate-300 border-white/8 hover:bg-white/8 hover:text-white"
      >
        This Month
      </button>
    </div>

    <!-- Date Status Feedback Pill -->
    {#if dateFilterMode === 'single' && selectedSingleDate}
      <div class="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-xs">
        <span class="text-amber-200">
          Date: <strong>{formatShortDate(selectedSingleDate)}</strong>
        </span>
        <button
          type="button"
          onclick={() => { selectedSingleDate = null; dateFilterMode = 'all'; applyFilters(); }}
          class="text-amber-300 hover:text-white"
          aria-label="Clear selected date"
        >
          <X size={13} />
        </button>
      </div>
    {:else if dateFilterMode === 'range' && (rangeStartDate || rangeEndDate)}
      <div class="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-xs">
        <span class="text-amber-200 truncate pr-2">
          {#if rangeStartDate && rangeEndDate}
            <strong>{formatShortDate(rangeStartDate)}</strong> → <strong>{formatShortDate(rangeEndDate)}</strong>
          {:else if rangeStartDate}
            From <strong>{formatShortDate(rangeStartDate)}</strong> (click end date)
          {:else}
            Until <strong>{formatShortDate(rangeEndDate)}</strong>
          {/if}
        </span>
        <button
          type="button"
          onclick={() => { rangeStartDate = null; rangeEndDate = null; dateFilterMode = 'all'; applyFilters(); }}
          class="text-amber-300 hover:text-white shrink-0"
          aria-label="Clear date range"
        >
          <X size={13} />
        </button>
      </div>
    {/if}

    <!-- Interactive Inline Mini Calendar -->
    <div class="rounded-xl border border-white/8 bg-black/40 p-3 space-y-2">
      <!-- Month navigation header -->
      <div class="flex items-center justify-between px-1">
        <button
          type="button"
          onclick={prevMonth}
          class="h-7 w-7 rounded-lg border border-white/10 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition"
          aria-label="Previous month"
        >
          <ChevronLeft size={14} />
        </button>
        <span class="text-xs font-bold text-white tracking-wide">
          {MONTH_NAMES[currentMonth]} {currentYear}
        </span>
        <button
          type="button"
          onclick={nextMonth}
          class="h-7 w-7 rounded-lg border border-white/10 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition"
          aria-label="Next month"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <!-- Weekdays header -->
      <div class="grid grid-cols-7 gap-1 text-center">
        {#each ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as day}
          <span class="text-[10px] font-bold text-slate-500 py-0.5">{day}</span>
        {/each}
      </div>

      <!-- Days Grid -->
      <div class="grid grid-cols-7 gap-1 text-center">
        {#each getCalendarGrid(currentYear, currentMonth) as item}
          {#if !item}
            <div></div>
          {:else}
            {@const isSingleSelected = dateFilterMode === 'single' && selectedSingleDate === item.dateStr}
            {@const isStart = dateFilterMode === 'range' && rangeStartDate === item.dateStr}
            {@const isEnd = dateFilterMode === 'range' && rangeEndDate === item.dateStr}
            {@const isInRange = dateFilterMode === 'range' && rangeStartDate && rangeEndDate && item.dateStr > rangeStartDate && item.dateStr < rangeEndDate}
            {@const isToday = todayStr === item.dateStr}
            {@const hasEvents = eventDatesSet.has(item.dateStr)}

            <button
              type="button"
              onclick={() => handleDateClick(item.dateStr)}
              class="relative h-7 w-7 mx-auto rounded-lg text-[11px] font-medium flex flex-col items-center justify-center transition-all {isSingleSelected || isStart || isEnd
                ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                : isInRange
                ? 'bg-amber-400/25 text-amber-200'
                : isToday
                ? 'border border-amber-400/50 text-white font-bold bg-white/5'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'}"
              title="{item.dateStr}{hasEvents ? ' (has events)' : ''}"
            >
              <span>{item.day}</span>
              {#if hasEvents && !isSingleSelected && !isStart && !isEnd}
                <span class="absolute bottom-0.5 h-1 w-1 rounded-full bg-amber-400"></span>
              {/if}
            </button>
          {/if}
        {/each}
      </div>

      <!-- Calendar legend & hint -->
      <div class="pt-2 border-t border-white/6 flex items-center justify-between text-[10px] text-slate-400 px-1">
        <span class="flex items-center gap-1.5">
          <span class="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
          Events scheduled
        </span>
        <span class="text-slate-500">
          {dateFilterMode === 'range' ? 'Select 2 dates' : 'Click to filter'}
        </span>
      </div>
    </div>
  </div>
{/snippet}

<svelte:head>
  <title>Discover Events | Evenai</title>
  <meta
    name="description"
    content="Discover and browse all public networking events on Evenai."
  />
</svelte:head>

<PageShell>
  <Sidebar user={data.user} {signingOut} onSignOut={signOut} />

  <main class="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
    <!-- Page header -->
    <div
      class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-slide-up"
    >
      <div>
        <h1 class="text-3xl font-black text-white flex items-center gap-2">
          <Compass class="text-amber-400" size={28} />
          Discover Events
        </h1>
        <p class="mt-1 text-sm text-ink-400">Explore public networking events hosted on the platform</p>
      </div>
    </div>

    <!-- Top Toolbar: Search + Mobile Filter Button -->
    <div class="mb-6 flex flex-col sm:flex-row gap-3 animate-slide-up items-stretch sm:items-center justify-between">
      <div class="flex items-center gap-2">
        <form onsubmit={applySearch} class="relative w-full sm:w-80">
          <Search
            class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500"
          />
          <Input
            type="search"
            placeholder="Search events by title, description or location..."
            bind:value={searchQuery}
            oninput={handleInput}
            class="pl-9 bg-white/5 border-white/10 text-white h-10 w-full"
          />
        </form>

        <!-- Mobile Filter Button (lg:hidden) -> Opens Bottom Canvas -->
        <button
          type="button"
          onclick={openMobileFilters}
          class="lg:hidden flex items-center gap-2 px-3.5 h-10 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-white hover:bg-white/10 transition shrink-0"
          aria-haspopup="dialog"
          aria-expanded={mobileFiltersOpen}
        >
          <SlidersHorizontal size={14} class="text-amber-400" />
          <span>Filters</span>
          {#if activeFilterCount > 0}
            <span class="flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-slate-950">
              {activeFilterCount}
            </span>
          {/if}
        </button>
      </div>

      <div class="text-xs sm:text-sm font-semibold text-ink-300">
        Showing {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
        {#if filteredEvents.length !== data.events.length}
          <span class="text-xs text-ink-400 font-normal">(filtered from {data.events.length})</span>
        {/if}
      </div>
    </div>

    <!-- Active Filter Tags Bar -->
    {#if hasActiveFilters}
      <div class="mb-5 flex flex-wrap items-center gap-2 animate-fade-in p-2.5 rounded-xl bg-white/3 border border-white/8">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Active:</span>

        {#if filterOnline}
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
            <Globe size={12} />
            Online
            <button onclick={() => { filterOnline = false; applyFilters(); }} class="hover:text-white" aria-label="Remove online filter">
              <X size={12} />
            </button>
          </span>
        {/if}

        {#if filterOffline}
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-400/10 text-amber-300 border border-amber-400/20">
            <MapPin size={12} />
            Offline
            <button onclick={() => { filterOffline = false; applyFilters(); }} class="hover:text-white" aria-label="Remove offline filter">
              <X size={12} />
            </button>
          </span>
        {/if}

        {#if dateFilterMode === 'single' && selectedSingleDate}
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-400/10 text-amber-300 border border-amber-400/20">
            <Calendar size={12} />
            Date: {formatShortDate(selectedSingleDate)}
            <button onclick={() => { selectedSingleDate = null; dateFilterMode = 'all'; applyFilters(); }} class="hover:text-white" aria-label="Remove date filter">
              <X size={12} />
            </button>
          </span>
        {/if}

        {#if dateFilterMode === 'range' && (rangeStartDate || rangeEndDate)}
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-400/10 text-amber-300 border border-amber-400/20">
            <CalendarDays size={12} />
            Range: {rangeStartDate ? formatShortDate(rangeStartDate) : '...'} - {rangeEndDate ? formatShortDate(rangeEndDate) : '...'}
            <button onclick={() => { rangeStartDate = null; rangeEndDate = null; dateFilterMode = 'all'; applyFilters(); }} class="hover:text-white" aria-label="Remove date range filter">
              <X size={12} />
            </button>
          </span>
        {/if}

        <button
          onclick={resetFilters}
          class="ml-auto text-xs font-semibold text-amber-300 hover:text-amber-200 hover:underline flex items-center gap-1"
        >
          <RotateCcw size={12} />
          Clear all
        </button>
      </div>
    {/if}

    <!-- 2-Column Layout: Left Events Grid + Right Filters Sidebar -->
    <div class="flex flex-col lg:flex-row items-start gap-8">
      <!-- Left Column: Events -->
      <div class="flex-1 min-w-0 w-full animate-slide-up-delay-1">
        {#if $navigating}
          <!-- Skeleton card grid -->
          <div class="events-grid">
            {#each Array(6) as _}
              <div class="glass rounded-2xl border border-white/8 animate-pulse event-card-skeleton">
                <div class="skeleton-header"></div>
                <div class="p-5 space-y-3">
                  <div class="h-5 w-3/4 rounded-lg bg-white/10"></div>
                  <div class="h-3.5 w-full rounded-lg bg-white/5"></div>
                  <div class="h-3.5 w-4/5 rounded-lg bg-white/5"></div>
                </div>
                <div class="p-5 pt-0 flex items-center justify-between">
                  <div class="h-6 w-24 rounded-full bg-white/8"></div>
                  <div class="h-8 w-20 rounded-lg bg-white/10"></div>
                </div>
              </div>
            {/each}
          </div>
        {:else if filteredEvents.length}
          <div class="events-grid">
            {#each filteredEvents as event}
              <div class="event-card glass card-hover rounded-2xl border border-amber-400/15">
                <!-- Card top accent bar -->
                <div class="card-accent accent-discover"></div>

                <!-- Card body -->
                <div class="card-body">
                  <!-- Badges header -->
                  <div class="flex flex-wrap items-center gap-1.5 mb-3">
                    {#if event.event_format}
                      <span class="format-badge">
                        {#if event.event_format === 'online'}
                          <Globe size={10} class="text-cyan-400" /> Online
                        {:else if event.event_format === 'hybrid'}
                          <Globe size={10} class="text-amber-400" /> Hybrid
                        {:else}
                          <MapPin size={10} class="text-amber-400" /> Offline
                        {/if}
                      </span>
                    {/if}

                    {#if event.created_by === data.user?.id}
                      <span class="hosting-badge">
                        <Crown size={10} class="text-amber-300" />
                        Hosting
                      </span>
                    {:else if event.joined}
                      <span class="joined-badge">
                        <CheckCheck size={10} class="text-emerald-400" />
                        Joined
                      </span>
                    {/if}

                    {#if event.is_approval_required}
                      <span class="approval-badge" title="Approval required by host">
                        <Lock size={10} class="text-amber-300" />
                        Approval
                      </span>
                    {/if}
                  </div>

                  <!-- Title -->
                  <h2 class="card-title">{event.name}</h2>

                  <!-- Description -->
                  <p class="card-desc">
                    {event.description ?? "No description added yet."}
                  </p>

                  {#if event.location}
                    <p class="mt-2 text-[11px] text-ink-400 flex items-center gap-1 truncate">
                      <MapPin size={11} class="text-amber-400 shrink-0" />
                      <span class="truncate">{event.location}</span>
                    </p>
                  {/if}
                </div>

                <!-- Card footer -->
                <div class="card-footer">
                  <div class="card-meta">
                    <span class="meta-date">
                      <CalendarClock size={11} />
                      {event.start_time ? formatEventDateRange(event.start_time, event.end_time) : new Date(event.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <button
                      id="copy-link-{event.slug}"
                      onclick={() => copySlug(event.slug)}
                      class="copy-btn"
                      title="Copy event link"
                    >
                      {#if copiedSlug === event.slug}
                        <CheckCheck size={11} class="text-emerald-400" />
                        Copied!
                      {:else}
                        <Copy size={11} />
                        /{event.slug}
                      {/if}
                    </button>
                  </div>
                  <Button
                    id="open-event-{event.slug}"
                    onclick={() => goto(`/event/${event.slug}`)}
                    class="card-view-btn gap-1.5 text-xs px-3 py-1.5 h-auto"
                  >
                    View
                    <ArrowRight size={13} />
                  </Button>
                </div>
              </div>
            {/each}
          </div>
        {:else if hasActiveFilters}
          <!-- Empty filter state -->
          <div
            class="glass rounded-2xl p-12 text-center border border-white/8 border-dashed"
          >
            <div
              class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 border border-amber-400/20"
            >
              <SlidersHorizontal class="text-amber-300" size={22} />
            </div>
            <h2 class="text-xl font-bold text-white mb-2">No matching events</h2>
            <p class="text-sm text-ink-400 max-w-sm mx-auto mb-6">
              No events match your current filter criteria. Try clearing or expanding your format or date filters.
            </p>
            <Button
              onclick={resetFilters}
              class="bg-amber-400 text-slate-950 hover:bg-amber-300 font-bold text-xs"
            >
              <RotateCcw size={13} class="mr-1.5" />
              Reset Filters
            </Button>
          </div>
        {:else}
          <!-- Empty state -->
          <div
            class="glass rounded-2xl p-12 text-center border border-white/8 border-dashed"
          >
            <div
              class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 border border-amber-400/20"
            >
              <Compass class="text-amber-300" size={22} />
            </div>
            <h2 class="text-xl font-bold text-white mb-2">No events found</h2>
            <p class="text-sm text-ink-400 max-w-xs mx-auto mb-6">
              There are no public events matching your search or active on the platform at the moment.
            </p>
          </div>
        {/if}
      </div>

      <!-- Desktop Right Column: Filters Sidebar (hidden on mobile, visible on lg+) -->
      <aside class="hidden lg:block w-full lg:w-80 xl:w-88 shrink-0">
        <div class="glass rounded-2xl border border-white/10 p-5 shadow-2xl sticky top-6 space-y-5 bg-[#0b0f19]/90 backdrop-blur-xl">
          <!-- Filters Header -->
          <div class="flex items-center justify-between border-b border-white/8 pb-3.5">
            <div class="flex items-center gap-2">
              <SlidersHorizontal size={16} class="text-amber-400" />
              <h2 class="text-sm font-bold text-white tracking-wide uppercase">Filters</h2>
              {#if activeFilterCount > 0}
                <span class="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-slate-950">
                  {activeFilterCount}
                </span>
              {/if}
            </div>
            {#if hasActiveFilters}
              <button
                type="button"
                onclick={resetFilters}
                class="flex items-center gap-1 text-[11px] font-semibold text-amber-300 hover:text-amber-200 hover:underline transition"
              >
                <RotateCcw size={11} />
                Reset all
              </button>
            {/if}
          </div>

          {@render filterSections(false)}
        </div>
      </aside>
    </div>
  </main>
</PageShell>

<!-- Mobile Bottom Sheet / Swipe-up Card (Mobile only) -->
{#if mobileFiltersOpen}
  <div class="lg:hidden fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="Filters">
    <!-- Backdrop Overlay -->
    <div
      class="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-fade-in"
      onclick={closeMobileFilters}
      role="button"
      tabindex="0"
      aria-label="Close filters backdrop"
      onkeydown={(e) => e.key === 'Escape' && closeMobileFilters()}
    ></div>

    <!-- Swipe-up Card Canvas -->
    <div
      class="relative z-10 w-full max-h-[88vh] rounded-t-3xl bg-[#0b0f19] border-t border-white/15 shadow-2xl flex flex-col overflow-hidden animate-sheet-up"
      style={sheetTransform ? `transform: translateY(${sheetTransform}px); transition: ${isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'};` : ''}
    >
      <!-- Swipe Handle Header Area -->
      <div
        class="pt-3 pb-1 cursor-grab active:cursor-grabbing flex flex-col items-center justify-center touch-none select-none"
        ontouchstart={handleTouchStart}
        ontouchmove={handleTouchMove}
        ontouchend={handleTouchEnd}
      >
        <div class="w-12 h-1.5 rounded-full bg-white/25 hover:bg-white/40 transition"></div>
      </div>

      <!-- Sheet Top Bar -->
      <div
        class="flex items-center justify-between px-5 py-3 border-b border-white/8 touch-none select-none"
        ontouchstart={handleTouchStart}
        ontouchmove={handleTouchMove}
        ontouchend={handleTouchEnd}
      >
        <div class="flex items-center gap-2">
          <SlidersHorizontal size={16} class="text-amber-400" />
          <h2 class="text-base font-bold text-white tracking-wide">Filters</h2>
          {#if activeFilterCount > 0}
            <span class="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-slate-950">
              {activeFilterCount}
            </span>
          {/if}
        </div>

        <div class="flex items-center gap-3">
          {#if hasActiveFilters}
            <button
              type="button"
              onclick={resetFilters}
              class="flex items-center gap-1 text-xs font-semibold text-amber-300 hover:text-amber-200 hover:underline transition"
            >
              <RotateCcw size={12} />
              Reset all
            </button>
          {/if}
          <button
            type="button"
            onclick={closeMobileFilters}
            class="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition"
            aria-label="Close filters"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <!-- Scrollable Filter Content -->
      <div class="px-5 py-4 space-y-5 overflow-y-auto overscroll-contain flex-1">
        {@render filterSections(true)}
      </div>

      <!-- Bottom Sticky Action Bar -->
      <div class="p-4 bg-[#070a12] border-t border-white/10 flex items-center gap-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {#if hasActiveFilters}
          <Button
            type="button"
            variant="outline"
            onclick={resetFilters}
            class="border-white/15 text-slate-300 hover:bg-white/5 h-11 px-4 text-xs font-semibold"
          >
            Clear
          </Button>
        {/if}
        <Button
          type="button"
          onclick={closeMobileFilters}
          class="flex-1 bg-amber-400 text-slate-950 hover:bg-amber-300 font-bold h-11 text-sm shadow-lg shadow-amber-400/20"
        >
          Show {filteredEvents.length} {filteredEvents.length === 1 ? 'Event' : 'Events'}
        </Button>
      </div>
    </div>
  </div>
{/if}

<style>
  .events-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }
  .event-card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .event-card:hover {
    transform: translateY(-2px);
    border-color: rgba(251, 191, 36, 0.35);
    box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.4), 0 0 15px -3px rgba(251, 191, 36, 0.12);
  }
  .card-accent {
    height: 3px;
    flex-shrink: 0;
  }
  .accent-discover {
    background: linear-gradient(90deg, rgba(251, 191, 36, 0.8) 0%, rgba(251, 191, 36, 0.1) 100%);
  }
  .card-body {
    flex: 1;
    padding: 1.1rem 1.1rem 0.85rem;
  }
  .card-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: #f1f5f9;
    line-height: 1.35;
    margin-bottom: 0.45rem;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .card-desc {
    font-size: 0.785rem;
    color: rgba(148, 163, 184, 0.75);
    line-height: 1.6;
    display: -webkit-box;
    line-clamp: 3;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.75rem 1.1rem 0.95rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    margin-top: auto;
  }
  .card-meta {
    display: flex;
    flex-direction: column;
    gap: 0.28rem;
    min-width: 0;
    overflow: hidden;
  }
  .meta-date {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.65rem;
    color: rgba(100, 116, 139, 0.85);
    white-space: nowrap;
  }
  .copy-btn {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.625rem;
    font-family: monospace;
    color: rgba(148, 163, 184, 0.55);
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
    transition: color 150ms;
  }
  .copy-btn:hover {
    color: rgba(251, 191, 36, 0.9);
  }
  .hosting-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.625rem;
    font-weight: 700;
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.12);
    border: 1px solid rgba(251, 191, 36, 0.3);
    padding: 0.18rem 0.48rem;
    border-radius: 9999px;
  }
  .joined-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.625rem;
    font-weight: 700;
    color: #34d399;
    background: rgba(52, 211, 153, 0.12);
    border: 1px solid rgba(52, 211, 153, 0.3);
    padding: 0.18rem 0.48rem;
    border-radius: 9999px;
  }
  .format-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.625rem;
    font-weight: 600;
    color: #cbd5e1;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 0.18rem 0.48rem;
    border-radius: 9999px;
    text-transform: capitalize;
  }
  .approval-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.625rem;
    font-weight: 600;
    color: #fde68a;
    background: rgba(251, 191, 36, 0.08);
    border: 1px solid rgba(251, 191, 36, 0.2);
    padding: 0.18rem 0.48rem;
    border-radius: 9999px;
  }
  .event-card-skeleton {
    height: 220px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .skeleton-header {
    height: 3px;
    background: rgba(255, 255, 255, 0.08);
  }

  @keyframes slideUpSheet {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
  .animate-sheet-up {
    animation: slideUpSheet 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
</style>

