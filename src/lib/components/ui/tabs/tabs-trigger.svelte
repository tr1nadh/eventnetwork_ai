<script>
  import { Tabs as TabsPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils';

  export let className = '';
  export let value;
  export let disabled = false;
</script>

<TabsPrimitive.Trigger
  {value}
  {disabled}
  class={cn(
    'inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/30 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-glow hover:bg-white/5',
    className
  )}
  {...$$restProps}
>
  <slot />
</TabsPrimitive.Trigger>
