<script>
  import { Toaster as Sonner } from 'svelte-sonner';
  import { cn } from '$lib/utils';

  export let className = '';
</script>

<Sonner
  position="top-right"
  theme="dark"
  richColors
  closeButton
  toastOptions={{
    unstyled: true,
    classes: {
      toast: cn(
        'group pointer-events-auto flex w-full items-start gap-3 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 text-white shadow-2xl backdrop-blur-xl',
        className
      ),
      title: 'text-sm font-semibold text-white',
      description: 'mt-1 text-sm leading-5 text-slate-300',
      closeButton:
        'rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
    }
  }}
  {...$$restProps}
/>
