<script>
  import { LoaderCircle } from "@lucide/svelte";
  import { fade } from "svelte/transition";
  import { cn } from "$lib/utils.js";
  import AmdAiBadge from "$lib/components/amd-ai-badge.svelte";

  let {
    message = "AI is working...",
    detail = "",
    class: className,
  } = $props();
</script>

<div
  class={cn(
    "flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-4 text-center",
    className,
  )}
  transition:fade
>
  <div class="flex items-center gap-2 text-sm font-medium text-white">
    <LoaderCircle size={16} class="animate-spin text-cyan-300" />
    <span>{message}</span>
  </div>

  {#if detail}
    <p class="max-w-md text-xs leading-5 text-ink-400">{detail}</p>
  {/if}

  <div class="h-px w-16 bg-white/10"></div>

  <AmdAiBadge />
</div>
