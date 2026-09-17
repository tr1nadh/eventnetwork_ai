<script>
  let { label = '', class: className = '', children } = $props();

  let scrollContainer = $state(null);

  function scrollLeft(e) {
    e?.preventDefault();
    e?.stopPropagation();
    if (scrollContainer) {
      scrollContainer.scrollBy({ left: -160, behavior: 'smooth' });
    }
  }

  function scrollRight(e) {
    e?.preventDefault();
    e?.stopPropagation();
    if (scrollContainer) {
      scrollContainer.scrollBy({ left: 160, behavior: 'smooth' });
    }
  }
</script>

<div class="flex items-center gap-1.5 w-full min-w-0 {className}">
  {#if label}
    <span class="text-xs text-ink-500 font-medium shrink-0 select-none">{label}</span>
  {/if}

  <!-- Desktop Left Scroll Button -->
  <button
    type="button"
    onclick={scrollLeft}
    aria-label="Scroll left"
    title="Scroll left"
    class="hidden sm:flex items-center justify-center w-5 h-5 rounded-full bg-white/10 hover:bg-amber-400/20 hover:border-amber-400/40 border border-white/10 text-ink-300 hover:text-white shrink-0 transition-all shadow-sm active:scale-95 cursor-pointer"
  >
    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
    </svg>
  </button>

  <!-- Scrollable Pill Track -->
  <div
    bind:this={scrollContainer}
    class="flex-1 flex items-center gap-1.5 overflow-x-auto py-1 min-w-0 scroll-smooth scrollbar-hide"
  >
    {@render children?.()}
  </div>

  <!-- Desktop Right Scroll Button -->
  <button
    type="button"
    onclick={scrollRight}
    aria-label="Scroll right"
    title="Scroll right"
    class="hidden sm:flex items-center justify-center w-5 h-5 rounded-full bg-white/10 hover:bg-amber-400/20 hover:border-amber-400/40 border border-white/10 text-ink-300 hover:text-white shrink-0 transition-all shadow-sm active:scale-95 cursor-pointer"
  >
    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
    </svg>
  </button>
</div>
