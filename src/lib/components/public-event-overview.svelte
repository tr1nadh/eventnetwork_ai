<script>
  import { page } from '$app/stores';
  import { CalendarClock, MapPin, Check, Copy, LoaderCircle, Clock, CheckCheck } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button/index.js';

  export let data;
  export let currentEvent;
  export let currentTime;
  export let timelineItems;
  export let isEventEnded;
  export let isAttendeeRegistrationFull;
  export let isJoinAfterStartClosed;
  export let joining;
  export let signingIn;
  export let copiedPublicUrl;
  export let copyPublicEventUrl;
  export let joinEvent;
  export let formatEventDateRange;
  export let getCategoryColor;
  export let formatTimelineTimeRange;
</script>

<div class="mx-auto max-w-4xl space-y-10 sm:space-y-12 animate-fade-in text-ink-50">

  <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
  <section class="min-w-0 space-y-6">
    <p class="text-xs font-medium tracking-wide text-ink-400">
      {isEventEnded ? "Event ended" : currentEvent.start_time && new Date(currentEvent.start_time) <= currentTime ? "Happening now" : "Upcoming event"}
    </p>
    <div class="flex items-start justify-between gap-3">

      <h1 class="min-w-0 flex-1 break-words text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-[2.75rem]">{currentEvent.name}</h1>
      <button type="button" onclick={copyPublicEventUrl} aria-label="Copy event link" title="Copy event link" class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-400 hover:bg-white/5 hover:text-white">
        {#if copiedPublicUrl}<Check size={17} />{:else}<Copy size={17} />{/if}
      </button>
    </div>
    <div class="space-y-3 border-y border-white/10 py-5 text-sm font-medium leading-6 text-ink-200">
      <p class="flex items-start gap-2"><CalendarClock size={17} class="mt-0.5 shrink-0 text-ink-400" />
        {formatEventDateRange(currentEvent.start_time, currentEvent.end_time, true) || currentEvent.date || "Date to be announced"}
      </p>
      <p class="flex items-start gap-2"><MapPin size={17} class="mt-0.5 shrink-0 text-ink-400" />
        {#if currentEvent.event_format === "online"}
          Online event
        {:else}
          {#if currentEvent.event_format === "hybrid"}Hybrid · {/if}
          {#if currentEvent.google_map_url && currentEvent.location}
            <a href={currentEvent.google_map_url} target="_blank" rel="noopener noreferrer" class="underline decoration-white/30 underline-offset-4 hover:text-amber-200">{currentEvent.location} <span class="text-xs">(Directions)</span></a>
          {:else}
            {currentEvent.location || currentEvent.city || "Venue to be announced"}
          {/if}
        {/if}
      </p>
    </div>
    {#if currentEvent.description}
      <div class="space-y-3 pt-2">
      <h2 class="text-xl font-semibold tracking-tight text-white">About this event</h2>
      {#if currentEvent.description.length > 260}
        <details class="group text-[15px] leading-7 text-ink-300">
          <summary class="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <span class="group-open:hidden">{currentEvent.description.slice(0, 260).replace(/\s+\S*$/, "")}… </span>
            <span class="text-amber-300 group-open:hidden">Read more</span>
            <span class="hidden text-amber-300 group-open:inline">Show less</span>
          </summary>
          <p class="mt-2 whitespace-pre-line">{currentEvent.description}</p>
        </details>
      {:else}
        <p class="whitespace-pre-line text-[15px] leading-7 text-ink-300">{currentEvent.description}</p>
      {/if}
      </div>
    {/if}
  </section>
    <aside class="min-w-0 lg:sticky lg:top-8">
    <div id="registration" tabindex="-1" class="scroll-mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 lg:sticky lg:top-8">
      <h2 class="mb-5 text-xl font-semibold tracking-tight text-white">Registration</h2>
      {#if data.registrationPending}
        <p role="status" class="font-semibold text-amber-200">Spot requested · Awaiting host approval</p>
      {:else if isEventEnded || isAttendeeRegistrationFull || isJoinAfterStartClosed}
        <p class="font-semibold text-ink-200">{isEventEnded ? "Event ended · Registration closed" : isAttendeeRegistrationFull ? "Registration full" : "Registration closed · Event already started"}</p>
      {:else}
        {#if data.user && $page.url.hash === "#registration"}
          <p class="mb-2 text-sm text-ink-200">You are signed in. {currentEvent.is_approval_required ? "Submit your request below." : "Confirm your registration below."}</p>
        {/if}
        <Button id="join-event-btn" onclick={joinEvent} disabled={joining || signingIn} class="h-12 w-full bg-amber-400 px-4 text-sm font-semibold text-slate-950 hover:bg-amber-300 ">
          {#if joining || signingIn}
            <LoaderCircle size={16} class="animate-spin" /> {data.user ? "Submitting…" : "Opening Google…"}
          {:else if currentEvent.is_approval_required}
            {data.user ? "Request a spot" : "Sign in to request a spot"}
          {:else}
            {data.user ? "Confirm registration" : "Sign in to register"}
          {/if}
        </Button>
        {#if !data.user}
          <p class="mt-3 text-xs leading-5 text-ink-400">You’ll return here after signing in to {currentEvent.is_approval_required ? "submit your request" : "confirm your registration"}.</p>
        {/if}
        {#if currentEvent.is_approval_required}
          <p class="mt-2 text-sm text-ink-300">The host reviews each request.</p>
        {/if}
        {#if currentEvent.is_attendees_register_limited && currentEvent.max_attendees}
          <p class="mt-2 text-sm text-ink-300">{Math.max(0, currentEvent.max_attendees - (currentEvent.attendees_count || 0))} spots available</p>
        {/if}
      {/if}
    </div>
    </aside>
  </div>
  <!-- ── B. Schedule & Agenda Section ── -->
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold tracking-tight text-white">
          <span class="h-5 w-1 rounded-full bg-amber-400"></span>
          Schedule & Agenda
        </h2>
        <p class="text-sm text-ink-400 mt-2">
          {timelineItems.length} {timelineItems.length === 1 ? "session" : "sessions"} planned
        </p>
      </div>
    </div>

    {#if timelineItems.length === 0}
      <p class="text-sm text-ink-400">The schedule has not been announced yet.</p>
    {:else}
      <!-- Timeline Rail -->
      <div class="relative pt-2">
        <div
          class="absolute left-[27px] top-4 bottom-4 w-px bg-gradient-to-b from-white/15 via-white/8 to-transparent pointer-events-none"
        ></div>

        <div class="space-y-4">
          {#each timelineItems as item, idx (item.id)}
            {@const style = getCategoryColor(item.category)}
            {@const isLiveNow =
              item.start_time &&
              item.end_time &&
              new Date(item.start_time) <= currentTime &&
              new Date(item.end_time) >= currentTime}
            {@const isPast =
              item.end_time &&
              new Date(item.end_time) < currentTime}

            <div class="relative flex gap-4 group">
              <!-- Timeline node -->
              <div
                class="relative flex-shrink-0 flex flex-col items-center"
                style="width: 56px;"
              >
                <div
                  class="relative flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-300
                  {isLiveNow
                    ? 'bg-emerald-400/15 border-emerald-400/40 shadow-[0_0_16px_rgba(52,211,153,0.25)]'
                    : isPast
                      ? 'bg-white/3 border-white/6'
                      : 'bg-white/5 border-white/10 group-hover:border-white/20'}"
                >
                  {#if isLiveNow}
                    <span
                      class="absolute inset-0 rounded-2xl animate-ping border border-emerald-400/40 opacity-50"
                    ></span>
                  {/if}
                  <div
                    class="h-2.5 w-2.5 rounded-full {style.dot} {isLiveNow
                      ? 'shadow-[0_0_8px_currentColor]'
                      : ''} {isPast ? 'opacity-30' : ''}"
                  ></div>
                </div>
              </div>

              <!-- Session Card -->
              <div class="flex-1 min-w-0 pb-1">
                <div
                  class="rounded-2xl border p-4 sm:p-5 transition-all duration-200
                  {isLiveNow
                    ? 'border-emerald-400/30 bg-emerald-400/5 shadow-[0_4px_20px_rgba(16,185,129,0.08)]'
                    : isPast
                      ? 'border-white/6 bg-white/[0.02] opacity-70'
                      : 'glass border-white/8 hover:border-white/15 hover:shadow-lg'}"
                >
                  <!-- Top Row: Time + Live + Category -->
                  <div
                    class="flex flex-wrap items-center gap-2 mb-2"
                  >
                    <span
                      class="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-lg"
                    >
                      <Clock size={11} />
                      {formatTimelineTimeRange(
                        item.start_time,
                        item.end_time,
                      )}
                    </span>

                    {#if isLiveNow}
                      <span
                        class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-400/15 border border-emerald-400/30 px-2 py-0.5 rounded-full"
                      >
                        <span
                          class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"
                        ></span>
                        Live Now
                      </span>
                    {:else if isPast}
                      <span
                        class="inline-flex items-center gap-1 text-[10px] font-medium text-ink-500 px-2 py-0.5 rounded-full border border-white/5 bg-white/3"
                      >
                        <CheckCheck size={10} /> Completed
                      </span>
                    {/if}

                    <span
                      class="ml-auto text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border {style.bg} {style.text} {style.border}"
                    >
                      {item.category || "General"}
                    </span>
                  </div>

                  <!-- Title -->
                  <h3
                    class="text-sm sm:text-base font-bold text-white leading-snug mb-1 {isPast
                      ? 'text-ink-300'
                      : ''}"
                  >
                    {item.title}
                  </h3>

                  <!-- Description -->
                  {#if item.description}
                    <p
                      class="text-xs sm:text-sm leading-relaxed text-ink-300/80 mb-3"
                    >
                      {item.description}
                    </p>
                  {/if}

                  <!-- Speaker + Location footer -->
                  {#if item.speaker_name || item.location}
                    <div
                      class="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/6 mt-2"
                    >
                      {#if item.speaker_name}
                        <div class="flex items-center gap-2.5">
                          {#if item.speaker_avatar_url}
                            <img
                              src={item.speaker_avatar_url}
                              alt={item.speaker_name}
                              class="h-7 w-7 rounded-full object-cover border border-white/20"
                            />
                          {:else}
                            <div
                              class="h-7 w-7 rounded-full {style.bg} border {style.border} flex items-center justify-center text-[10px] font-black {style.text}"
                            >
                              {item.speaker_name
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          {/if}
                          <div class="leading-tight">
                            <p
                              class="text-xs font-bold text-white"
                            >
                              {item.speaker_name}
                            </p>
                            {#if item.speaker_role}
                              <p class="text-[10px] text-ink-400">
                                {item.speaker_role}
                              </p>
                            {/if}
                          </div>
                        </div>
                      {/if}

                      {#if item.location}
                        <span class="inline-flex items-center gap-1.5 text-xs text-ink-300">
                          <MapPin size={11} class="text-amber-400" />
                          {item.location}
                        </span>
                      {/if}
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  {#if currentEvent.is_venue_enabled && currentEvent.venue_map}
    <details class="rounded-xl border border-white/10 p-4">
      <summary class="cursor-pointer font-semibold text-white">View venue map</summary>
      <div class="mt-4">{#await import("$lib/components/venue-map.svelte") then module}<svelte:component this={module.default} isOrganizer={false} initialZones={currentEvent.venue_map} schedule={timelineItems} />{/await}</div>
    </details>
  {/if}
</div>
