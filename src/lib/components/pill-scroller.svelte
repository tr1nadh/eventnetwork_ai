<script>
  import { onMount } from 'svelte';

  let { label = '', class: className = '', children } = $props();

  let scrollContainer = $state(null);
  let canScrollLeft = $state(false);
  let canScrollRight = $state(false);

  function checkScroll() {
    if (!scrollContainer) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
    // 2px buffer for rounding differences
    canScrollLeft = scrollLeft > 2;
    canScrollRight = scrollLeft < scrollWidth - clientWidth - 2;
  }

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

  function handleWheel(e) {
    if (!scrollContainer) return;
    // If user is doing native horizontal scroll, let browser handle it
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    
    if (e.deltaY !== 0) {
      e.preventDefault();
      scrollContainer.scrollLeft += e.deltaY;
      checkScroll();
    }
  }

  function autoScrollActivePill() {
    if (!scrollContainer) return;
    // Find active pill (has font-semibold or active border/bg)
    const activePill = scrollContainer.querySelector('.font-semibold, [data-active="true"]');
    if (activePill) {
      activePill.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    }
  }

  $effect(() => {
    if (scrollContainer) {
      checkScroll();
      // Delay slightly for initial DOM render to catch active pill
      const timer = setTimeout(() => {
        checkScroll();
        autoScrollActivePill();
      }, 50);
      return () => clearTimeout(timer);
    }
  });

  onMount(() => {
    if (!scrollContainer) return;
    const resizeObserver = new ResizeObserver(() => checkScroll());
    resizeObserver.observe(scrollContainer);
    return () => resizeObserver.disconnect();
  });
</script>

<div class="flex items-center gap-1.5 w-full min-w-0 {className}">
  {#if label}
    <span class="text-xs text-ink-500 font-medium shrink-0 select-none">{label}</span>
  {/if}

  <!-- Desktop Left Scroll Button -->
  <button
    type="button"
    onclick={scrollLeft}
    disabled={!canScrollLeft}
    aria-label="Scroll left"
    title="Scroll left"
    class="hidden sm:flex items-center justify-center w-5 h-5 rounded-full bg-white/10 hover:bg-amber-400/20 hover:border-amber-400/40 border border-white/10 text-ink-300 hover:text-white shrink-0 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-25 disabled:pointer-events-none disabled:cursor-not-allowed"
  >
    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
    </svg>
  </button>

  <!-- Track Wrapper with Fade Overlay Cues -->
  <div class="relative flex-1 min-w-0 flex items-center overflow-hidden">
    <!-- Left Fade Cue -->
    <div
      class="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-[#18191c]/90 to-transparent pointer-events-none z-10 transition-opacity duration-200"
      class:opacity-100={canScrollLeft}
      class:opacity-0={!canScrollLeft}
    ></div>

    <!-- Scrollable Pill Track -->
    <div
      bind:this={scrollContainer}
      onscroll={checkScroll}
      onwheel={handleWheel}
      class="w-full flex items-center gap-1.5 overflow-x-auto py-1 min-w-0 scroll-smooth scrollbar-hide"
    >
      {@render children?.()}
    </div>

    <!-- Right Fade Cue -->
    <div
      class="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-[#18191c]/90 to-transparent pointer-events-none z-10 transition-opacity duration-200"
      class:opacity-100={canScrollRight}
      class:opacity-0={!canScrollRight}
    ></div>
  </div>

  <!-- Desktop Right Scroll Button -->
  <button
    type="button"
    onclick={scrollRight}
    disabled={!canScrollRight}
    aria-label="Scroll right"
    title="Scroll right"
    class="hidden sm:flex items-center justify-center w-5 h-5 rounded-full bg-white/10 hover:bg-amber-400/20 hover:border-amber-400/40 border border-white/10 text-ink-300 hover:text-white shrink-0 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-25 disabled:pointer-events-none disabled:cursor-not-allowed"
  >
    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
    </svg>
  </button>
</div>
