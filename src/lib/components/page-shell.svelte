<!-- Shared full-screen page shell: background gradients + dot grid + container -->
<script>
  import { sidebarCollapsed } from '$lib/stores/sidebar';
  import { browser } from '$app/environment';

  // On mobile there's no sidebar — no padding needed.
  // We apply padding-left via inline style so the transition is smooth.
  $: paddingLeft = browser
    ? `var(--sidebar-width, ${$sidebarCollapsed ? '64px' : '240px'})`
    : '240px';
</script>

<div class="relative min-h-screen bg-ink-950 text-ink-50 overflow-x-hidden">
  <!-- Ambient gradient layer -->
  <div
    class="pointer-events-none fixed inset-0 z-0"
    aria-hidden="true"
    style="background:
      radial-gradient(ellipse 70% 50% at 10% 10%, rgba(250,204,21,0.13) 0%, transparent 60%),
      radial-gradient(ellipse 60% 45% at 88% 18%, rgba(34,211,238,0.12) 0%, transparent 55%),
      radial-gradient(ellipse 50% 60% at 50% 100%, rgba(99,102,241,0.07) 0%, transparent 60%),
      linear-gradient(180deg, #050816 0%, #060c1a 100%)"
  ></div>

  <!-- Dot grid overlay -->
  <div
    class="pointer-events-none fixed inset-0 z-0 opacity-20"
    aria-hidden="true"
    style="background-image: var(--background-image-radial-grid); background-size: 24px 24px;"
  ></div>

  <!-- Page content — shifts right to accommodate the sidebar on desktop -->
  <div
    class="relative z-10 page-content"
    style="padding-left: {paddingLeft}; padding-top: 2rem; transition: padding-left 300ms cubic-bezier(0.4, 0, 0.2, 1);"
  >
    <slot />
  </div>
</div>

<style>
  /* On mobile the sidebar is replaced by a bottom bar — remove left padding */
  @media (max-width: 767px) {
    .page-content {
      padding-left: 0 !important;
      /* Add bottom padding so content isn't hidden behind the mobile bottom bar */
      padding-bottom: 4.5rem;
    }
  }
</style>
