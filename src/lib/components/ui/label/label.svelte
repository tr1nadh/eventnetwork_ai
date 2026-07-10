<script>
  import { Label as LabelPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils';

  export let className = '';
</script>

<LabelPrimitive.Root
  class={cn('mb-2 block text-sm font-medium text-slate-200', className)}
  {...$$restProps}
>
  <slot />
</LabelPrimitive.Root>
