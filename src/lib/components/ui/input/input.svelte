<script>
  import { cn } from '$lib/utils';

  export let className = '';
  export let value = '';
</script>

<input
  bind:value
  class={cn(
    'flex h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-amber-300/40 focus:ring-2 focus:ring-amber-300/20',
    className
  )}
  {...$$restProps}
/>
