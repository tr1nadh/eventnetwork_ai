<script>
  import { Tabs as TabsPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils';

  export let className = '';
  export let value;
</script>

<TabsPrimitive.Content
  {value}
  class={cn('outline-none focus-visible:ring-2 focus-visible:ring-amber-300/30 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950', className)}
  {...$$restProps}
>
  <slot />
</TabsPrimitive.Content>
