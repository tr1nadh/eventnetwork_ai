<script>
  import { onMount } from 'svelte';
  import EventDateTime from './event-date-time.svelte';
  import { Video } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button/index.js';

  export let event;
  export let now;
  let showStartNotice = false;
  let joinBlock;
  let blockVisible = true;
  onMount(() => {
    const observer = new IntersectionObserver(([entry]) => {
      blockVisible = entry.isIntersecting;
    });
    observer.observe(joinBlock);
    return () => observer.disconnect();
  });

  $: startsAt = Date.parse(event.start_time);
  $: hasStart = Number.isFinite(startsAt);
  $: remaining = hasStart ? Math.max(0, Math.ceil((startsAt - now.getTime()) / 1000)) : 0;
  $: started = hasStart && remaining === 0;
  $: ended = Boolean(event.end_time && Date.parse(event.end_time) <= now.getTime());
  $: days = Math.floor(remaining / 86400);
  $: hours = Math.floor((remaining % 86400) / 3600);
  $: minutes = Math.floor((remaining % 3600) / 60);
  $: seconds = remaining % 60;
  $: if (started) showStartNotice = false;

  function joinMeeting() {
    if (!started) {
      showStartNotice = true;
      return;
    }
    if (!ended && event.event_meeting_url) window.location.assign(event.event_meeting_url);
  }
</script>

<section bind:this={joinBlock} class="space-y-5 rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-5 sm:p-6" aria-label="Join online event">
  <h3 class="text-lg font-semibold text-white">
    {ended ? 'Event ended' : started ? 'The event has started' : 'Event starts in'}
  </h3>
  {#if !started && hasStart}
    <p class="text-2xl font-semibold tabular-nums tracking-tight text-white sm:text-3xl" aria-label="Time until event starts">
      {#if days > 0}
        {days} {days === 1 ? 'day' : 'days'}, {hours} {hours === 1 ? 'hour' : 'hours'}
      {:else if remaining >= 3600}
        {hours} {hours === 1 ? 'hour' : 'hours'}, {minutes} {minutes === 1 ? 'minute' : 'minutes'}
      {:else}
        {minutes}m {String(seconds).padStart(2, '0')}s
      {/if}
    </p>
  {:else if !hasStart}
    <p class="text-sm text-ink-400">The start time has not been announced.</p>
  {/if}
  <EventDateTime start={event.start_time} end={event.end_time} />
  <Button onclick={joinMeeting} disabled={ended || !event.event_meeting_url} aria-disabled={!started || ended || !event.event_meeting_url}
    class="h-12 w-full sm:w-auto gap-2 bg-amber-400 px-6 font-semibold text-slate-950 hover:bg-amber-300">
    <Video size={17} /> Join event
  </Button>
  {#if showStartNotice && !started}
    <p role="status" class="text-sm text-ink-300">Join will be active after the event starts.</p>
  {/if}
  {#if !event.event_meeting_url && !ended}
    <p class="text-sm text-ink-400">The organizer has not added a meeting link yet.</p>
  {/if}
</section>

{#if started && !ended && event.event_meeting_url && !blockVisible}
  <div class="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 px-4 md:hidden">
    <Button onclick={joinMeeting} class="h-12 w-full gap-2 bg-amber-400 font-semibold text-slate-950 shadow-xl hover:bg-amber-300">
      <Video size={17} /> Join event
    </Button>
  </div>
{/if}
