<script>
  import { MapPin } from '@lucide/svelte';
  export let items;
  export let now;
  export let formatTime;
  export let onLocation;
  export let venueEnabled;
</script>

<section class="space-y-5" aria-label="Event schedule">
  <div>
    <h3 class="text-xl font-semibold tracking-tight text-white">Event schedule</h3>
    {#if items.length}<p class="mt-2 text-sm text-ink-400">{items.length} {items.length === 1 ? 'session' : 'sessions'} planned</p>{/if}
  </div>
  {#if !items.length}
    <p class="text-sm leading-6 text-ink-400">The organizer hasn’t published the schedule yet.</p>
  {:else}
    <div class="divide-y divide-white/10">
      {#each items as item (item.id)}
        {@const live = item.start_time && item.end_time && Date.parse(item.start_time) <= now.getTime() && Date.parse(item.end_time) >= now.getTime()}
        {@const past = item.end_time && Date.parse(item.end_time) < now.getTime()}
        <article class="grid gap-3 py-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-6 {live ? 'bg-emerald-400/5' : ''}">
          <div class="text-sm font-medium leading-6 tabular-nums text-ink-300">{formatTime(item.start_time, item.end_time)}</div>
          <div class="min-w-0 space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <h4 class="text-base font-semibold leading-6 text-white">{item.title}</h4>
              {#if live}<span class="text-xs font-semibold text-emerald-300">Live now</span>{:else if past}<span class="text-xs text-ink-500">Completed</span>{/if}
            </div>
            {#if item.description}<p class="whitespace-pre-line text-sm leading-6 text-ink-300">{item.description}</p>{/if}
            {#if item.speaker_name}
              <div class="flex items-center gap-2 pt-1">
                {#if item.speaker_avatar_url}<img src={item.speaker_avatar_url} alt="" loading="lazy" class="h-7 w-7 rounded-full object-cover" />{/if}
                <p class="text-sm text-ink-400">{item.speaker_name}{#if item.speaker_role}<span class="block text-xs">{item.speaker_role}</span>{/if}</p>
              </div>
            {/if}
            {#if item.location}
              <button type="button" onclick={() => onLocation(item.location)} title={venueEnabled ? 'View on venue map' : item.location} class="inline-flex items-center gap-1.5 text-sm text-ink-300 hover:text-amber-300">
                <MapPin size={14} />{item.location}
              </button>
            {/if}
            {#if item.category}<p class="text-xs text-ink-500">{item.category}</p>{/if}
          </div>
        </article>
      {/each}
    </div>
  {/if}
</section>
