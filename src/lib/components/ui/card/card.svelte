<script>
  import { cn } from '$lib/utils';

  export let className = '';
</script>

<div
  class={cn('rounded-3xl border border-white/10 bg-white/6 p-6 shadow-glow backdrop-blur-xl', className)}
  {...$$restProps}
>
  <slot />
</div>
