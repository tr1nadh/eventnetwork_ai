<script>
  import { Cpu } from "@lucide/svelte";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { cn } from "$lib/utils.js";

  let {
    class: className,
  } = $props();
</script>

<Badge
  variant="outline"
  class={cn(
    "inline-flex h-auto items-center gap-1.5 rounded-full border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-400 shadow-sm",
    className,
  )}
>
  <Cpu size={10} class="text-cyan-300" />
  Powered by AMD AI
</Badge>
