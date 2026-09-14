<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { BellOff, Bell, X } from '@lucide/svelte';
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  let permissionState = 'granted'; // optimistic — no flash on SSR
  let dismissed = false;
  let showPopover = false; // shown when state is 'denied' and user clicks

  function readPermission() {
    if (!browser || !('Notification' in window)) {
      permissionState = 'unsupported';
      return;
    }
    permissionState = Notification.permission;
  }

  async function handleClick() {
    if (!browser || !('Notification' in window)) return;

    if (permissionState === 'default') {
      // Not yet asked — trigger the native browser prompt
      const result = await Notification.requestPermission();
      permissionState = result;
      if (result === 'granted') {
        setTimeout(() => { dismissed = true; }, 600);
      }
      // If denied after prompt, badge will switch to BellOff state naturally
    } else if (permissionState === 'denied') {
      // Can't re-prompt — show instructions popover instead
      showPopover = !showPopover;
    }
  }

  function dismissPopoverAndBadge() {
    showPopover = false;
    dismissed = true;
  }

  $: shouldShow = !dismissed && (permissionState === 'denied' || permissionState === 'default');

  // Close popover if state somehow resolves
  $: if (!shouldShow) showPopover = false;

  onMount(() => {
    readPermission();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) readPermission();
    });
  });
</script>

<!-- Click-outside to close popover -->
{#if showPopover}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="popover-backdrop"
    onclick={() => { showPopover = false; }}
    transition:fade={{ duration: 120 }}
  ></div>
{/if}

{#if shouldShow}
  <div
    class="notif-wrap"
    in:fly={{ y: -10, duration: 280, easing: cubicOut }}
    out:fly={{ y: -10, duration: 200, easing: cubicOut }}
  >
    <button
      class="notif-btn"
      class:denied={permissionState === 'denied'}
      onclick={handleClick}
      aria-label={permissionState === 'denied' ? 'Notifications blocked — see how to enable' : 'Enable notifications'}
      aria-expanded={permissionState === 'denied' ? showPopover : undefined}
    >
      {#if permissionState === 'denied'}
        <BellOff size={16} />
      {:else}
        <Bell size={16} />
      {/if}
    </button>

    <!-- Hover tooltip — only when popover is closed -->
    {#if !showPopover}
      <div class="notif-tooltip" role="tooltip">
        {permissionState === 'denied' ? 'Notifications blocked' : 'Enable notifications'}
      </div>
    {/if}

    <!-- Denied instructions popover -->
    {#if showPopover}
      <div
        class="notif-popover"
        role="dialog"
        aria-label="How to enable notifications"
        in:fly={{ y: -6, duration: 200, easing: cubicOut }}
        out:fly={{ y: -6, duration: 150, easing: cubicOut }}
      >
        <div class="popover-header">
          <span class="popover-title">Enable notifications</span>
          <button class="popover-close" onclick={() => { showPopover = false; }} aria-label="Close">
            <X size={12} />
          </button>
        </div>
        <p class="popover-body">
          Your browser has blocked notifications. To re-enable:
        </p>
        <ol class="popover-steps">
          <li>Click the <strong>🔒 lock icon</strong> in the address bar</li>
          <li>Find <strong>Notifications</strong> → set to <strong>Allow</strong></li>
          <li>Reload the page</li>
        </ol>
        <button class="popover-dismiss-btn" onclick={dismissPopoverAndBadge}>
          Got it
        </button>
      </div>
    {/if}
  </div>
{/if}

<style>
  /* ── Backdrop (closes popover on outside click) ── */
  .popover-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9998;
  }

  /* ── Wrapper ── */
  .notif-wrap {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 9999;
  }

  @media (max-width: 767px) {
    .notif-wrap {
      top: auto;
      bottom: 5.5rem;
      right: 0.75rem;
    }
  }

  /* ── Bell button ── */
  .notif-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(250, 204, 21, 0.12);
    color: #facc15;
    border: 1px solid rgba(250, 204, 21, 0.28);
    cursor: pointer;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    transition: background 160ms, border-color 160ms, transform 160ms, box-shadow 160ms;
  }

  .notif-btn:hover {
    background: rgba(250, 204, 21, 0.22);
    border-color: rgba(250, 204, 21, 0.5);
    transform: scale(1.08);
    box-shadow: 0 0 14px rgba(250, 204, 21, 0.25), 0 2px 12px rgba(0, 0, 0, 0.35);
  }

  .notif-btn.denied {
    background: rgba(251, 113, 133, 0.1);
    color: #fda4af;
    border-color: rgba(251, 113, 133, 0.25);
  }

  .notif-btn.denied:hover {
    background: rgba(251, 113, 133, 0.2);
    border-color: rgba(251, 113, 133, 0.45);
    box-shadow: 0 0 14px rgba(251, 113, 133, 0.2), 0 2px 12px rgba(0, 0, 0, 0.35);
  }

  /* ── Hover tooltip ── */
  .notif-tooltip {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    white-space: nowrap;
    font-size: 0.68rem;
    font-weight: 600;
    color: #f1f5f9;
    background: rgba(10, 14, 35, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.5rem;
    padding: 0.3rem 0.6rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    opacity: 0;
    transform: translateY(-4px);
    pointer-events: none;
    transition: opacity 150ms ease, transform 150ms ease;
  }

  .notif-wrap:hover .notif-tooltip {
    opacity: 1;
    transform: translateY(0);
  }

  /* ── Denied instructions popover ── */
  .notif-popover {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    width: 230px;
    background: rgba(10, 14, 35, 0.96);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 0.875rem;
    padding: 0.85rem 0.9rem 0.75rem;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(255, 255, 255, 0.04) inset;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  .popover-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .popover-title {
    font-size: 0.75rem;
    font-weight: 700;
    color: #fda4af;
  }

  .popover-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.06);
    color: rgba(148, 163, 184, 0.6);
    cursor: pointer;
    padding: 0;
    transition: background 150ms, color 150ms;
  }

  .popover-close:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #f1f5f9;
  }

  .popover-body {
    font-size: 0.68rem;
    color: rgba(148, 163, 184, 0.8);
    line-height: 1.5;
    margin-bottom: 0.5rem;
  }

  .popover-steps {
    margin: 0 0 0.75rem 0;
    padding-left: 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .popover-steps li {
    font-size: 0.66rem;
    color: rgba(148, 163, 184, 0.75);
    line-height: 1.5;
  }

  .popover-steps li strong {
    color: #f1f5f9;
    font-weight: 600;
  }

  .popover-dismiss-btn {
    width: 100%;
    padding: 0.35rem 0;
    font-size: 0.68rem;
    font-weight: 700;
    border-radius: 0.5rem;
    background: rgba(251, 113, 133, 0.12);
    color: #fda4af;
    border: 1px solid rgba(251, 113, 133, 0.25);
    cursor: pointer;
    transition: background 150ms, border-color 150ms;
  }

  .popover-dismiss-btn:hover {
    background: rgba(251, 113, 133, 0.22);
    border-color: rgba(251, 113, 133, 0.4);
  }
</style>
