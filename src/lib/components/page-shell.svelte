<script>
  import { sidebarCollapsed } from '$lib/stores/sidebar';

  export let hasSidebar = true;
  export let fullHeight = false;
</script>

<div class="page-content" class:with-sidebar={hasSidebar} class:full-height={fullHeight}
  style:--sidebar-width={$sidebarCollapsed ? '64px' : '240px'}>
  <slot />
</div>

<style>
  .page-content {
    min-height: 100dvh;
    background: var(--background);
    color: var(--foreground);
    padding-top: clamp(1.5rem, 3vw, 2.75rem);
  }
  .full-height { padding-top: 0; }
  @media (min-width: 768px) {
    .with-sidebar { padding-left: var(--sidebar-width); }
  }
  @media (max-width: 767px) {
    .with-sidebar { padding-bottom: calc(4.5rem + env(safe-area-inset-bottom)); }
    .with-sidebar.full-height { padding-bottom: 0; }
  }
  @media (prefers-reduced-motion: no-preference) {
    .with-sidebar { transition: padding-left 300ms ease; }
  }
</style>
