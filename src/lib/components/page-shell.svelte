<!-- Shared full-screen page shell: background gradients + dot grid + container -->
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

  <!-- Page content -->
  <div class="relative z-10">
    <slot />
  </div>
</div>
