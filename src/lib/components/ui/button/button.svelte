<script>
  import { cva } from 'class-variance-authority';
  import { cn } from '$lib/utils';

  const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/30 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-50',
    {
      variants: {
        variant: {
          default: 'bg-amber-400 text-slate-950 shadow-glow hover:bg-amber-300',
          secondary: 'border border-white/10 bg-white/5 text-white hover:bg-white/10',
          ghost: 'text-ink-200 hover:bg-white/5',
          outline: 'border border-white/10 bg-transparent text-white hover:bg-white/5',
          destructive: 'bg-rose-500 text-white hover:bg-rose-400'
        },
        size: {
          default: 'h-11 px-4 py-2',
          sm: 'h-9 rounded-lg px-3',
          lg: 'h-12 rounded-xl px-6',
          icon: 'h-11 w-11'
        }
      },
      defaultVariants: {
        variant: 'default',
        size: 'default'
      }
    }
  );

  export let className = '';
  export let variant = 'default';
  export let size = 'default';
  export let type = 'button';
</script>

<button
  {type}
  class={cn(buttonVariants({ variant, size }), className)}
  {...$$restProps}
>
  <slot />
</button>
