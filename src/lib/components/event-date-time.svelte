<script>
  import { CalendarClock } from '@lucide/svelte';
  export let start;
  export let end;
  export let fallback = 'Date to be announced';
  function eventDateRows(startValue, endValue) {
    const start = new Date(startValue);
    if (!startValue || Number.isNaN(start.getTime())) return [];
    const end = endValue ? new Date(endValue) : null;
    const validEnd = end && !Number.isNaN(end.getTime());
    const date = value => value.toLocaleDateString(undefined, {
      weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
    });
    const time = value => value.toLocaleTimeString(undefined, {
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
    const zone = value => new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
      .formatToParts(value).find(part => part.type === 'timeZoneName')?.value ?? '';
    if (validEnd && start.toDateString() !== end.toDateString()) {
      return [
        { label: 'Starts', date: date(start), time: time(start), zone: zone(start) },
        { label: 'Ends', date: date(end), time: time(end), zone: zone(end) },
      ];
    }
    return [{
      label: '', date: date(start),
      time: time(start) + (validEnd ? ' – ' + time(end) : ''),
      zone: zone(start) + (validEnd && zone(start) !== zone(end) ? ' / ' + zone(end) : ''),
    }];
  }
  $: dateRows = eventDateRows(start, end);
</script>

      <div class="flex items-start gap-3 sm:gap-2">
        <CalendarClock size={18} class="mt-1 shrink-0 text-ink-400" />
        <div class="min-w-0 space-y-4">
          {#each dateRows as row}
            <div>
              {#if row.label}<p class="text-xs font-medium text-ink-400">{row.label}</p>{/if}
              <p class="text-base font-semibold leading-7 text-white">{row.date}</p>
              <p class="text-sm font-normal leading-6 text-ink-300">
                {row.time} <span class="ml-1 text-xs text-ink-400">{row.zone}</span>
              </p>
            </div>
          {:else}
            <p>{fallback}</p>
          {/each}
        </div>
      </div>
