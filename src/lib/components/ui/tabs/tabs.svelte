<script>
  import { Tabs as TabsPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils';

  export let className = '';
  export let value = undefined;
  export let orientation = 'horizontal';
  export let loop = false;
  export let activationMode = 'automatic';
  export let disabled = false;
  export let onValueChange = undefined;
</script>

<TabsPrimitive.Root
  {value}
  {orientation}
  {loop}
  {activationMode}
  {disabled}
  {onValueChange}
  class={cn('flex flex-col gap-4', className)}
  {...$$restProps}
>
  <slot />
</TabsPrimitive.Root>
