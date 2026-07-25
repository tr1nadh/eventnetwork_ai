<script>
  import { onMount } from 'svelte';
  import { aiCreditsStore } from '$lib/stores/ai-credits';
  import { Cpu } from '@lucide/svelte';
  
  onMount(() => {
    aiCreditsStore.fetchStatus();
  });
  
  $: ({ remaining, limit, resetAt, loading } = $aiCreditsStore);
  
  $: progressPercentage = (remaining / limit) * 100;
  
  // Format date e.g., "Aug 1"
  $: formattedReset = resetAt ? new Date(resetAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
</script>

{#if !loading}
  <div class="flex flex-col space-y-1.5 p-3 rounded-xl bg-card border border-border/50 text-sm w-full max-w-xs shadow-sm">
    <div class="flex items-center justify-between text-muted-foreground">
      <div class="flex items-center space-x-1.5">
        <Cpu size={14} class="text-primary" />
        <span class="font-medium">AI Credits</span>
      </div>
      <span class="text-xs font-semibold" class:text-destructive={remaining <= 5}>{remaining} / {limit}</span>
    </div>
    
    <div class="h-2 w-full bg-secondary rounded-full overflow-hidden">
      <div 
        class="h-full rounded-full transition-all duration-500 ease-out {remaining <= 5 ? 'bg-destructive' : (remaining <= 10 ? 'bg-warning text-warning-foreground' : 'bg-primary')}"
        style="width: {progressPercentage}%"
      ></div>
    </div>
    
    {#if resetAt}
      <div class="text-[10px] text-muted-foreground/70 text-right uppercase tracking-wider font-medium">
        Resets {formattedReset}
      </div>
    {/if}
  </div>
{/if}
