<script>
  import { Tabs as TabsPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils';

  export let className = '';
</script>

<TabsPrimitive.List
  class={cn('inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/70 p-1 text-slate-200', className)}
  {...$$restProps}
>
  <slot />
</TabsPrimitive.List>
