<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import {
    LogIn,
    LogOut,
    Sparkles,
    UserCircle2,
    Calendar,
    Plus,
    ChevronLeft,
    ChevronRight,
    Cpu,
    Compass,
    ContactRound,
    Settings,
  } from "@lucide/svelte";
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import AICredits from "$lib/components/AICredits.svelte";
  import { aiCreditsStore } from "$lib/stores/ai-credits";
  import { sidebarCollapsed } from "$lib/stores/sidebar";
  import { onMount } from "svelte";

  export let user = null;
  export let signingIn = false;
  export let signingOut = false;
  export let onSignIn = undefined;
  export let onSignOut = undefined;

  $: avatar =
    user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? "";
  $: name =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.user_metadata?.display_name ??
    user?.email?.split("@")[0] ??
    "Account";
  $: firstName = name.split(" ")[0];
  $: initials = name.slice(0, 1).toUpperCase();

  $: collapsed = $sidebarCollapsed;

  $: currentPath = $page?.url?.pathname ?? "";
  $: isEvents = currentPath === "/events" || currentPath === "/events/";
  $: isDiscover = currentPath === "/discover" || currentPath === "/discover/";
  $: isCreate = currentPath.startsWith("/events/create");
  $: isConnections = currentPath.startsWith("/connections");
  $: isNetworkCards = currentPath.startsWith("/network-card");

  let accountMenuOpen = false;
  let accountArea;
  let accountTrigger;

  function dismissOutsideAccount(event) {
    if (accountMenuOpen && !accountArea?.contains(event.target)) accountMenuOpen = false;
  }

  function closeAccountOnEscape(event) {
    if (accountMenuOpen && event.key === "Escape") {
      accountMenuOpen = false;
      accountTrigger?.focus();
    }
  }

  onMount(() => {
    if (user) {
      aiCreditsStore.fetchStatus(user.id);
    }
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (desktop.matches) accountMenuOpen = false;
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  });

  let networkCardSignInOpen = false;
  function requiresSignIn(item) {
    return !user && item.href === "/network-card";
  }
  function navigateToItem(item) {
    if (requiresSignIn(item)) {
      networkCardSignInOpen = true;
      return;
    }
    goto(item.href);
  }

  function toggle() {
    sidebarCollapsed.update((v) => !v);
  }

  $: navItems = [
    {
      label: "Events",
      icon: Calendar,
      href: "/events",
      active: isEvents,
      disabled: false,
    },
    {
      label: "Discover",
      icon: Compass,
      href: "/discover",
      active: isDiscover,
      disabled: false,
    },
    {
      label: "Connections",
      icon: UserCircle2,
      href: "/connections",
      active: isConnections,
      disabled: false,
    },
    {
      label: "Network Card",
      icon: ContactRound,
      href: "/network-card",
      active: isNetworkCards,
      disabled: false,
    },
  ];
  $: mobileNavItems = [navItems[0], navItems[1], navItems[3], navItems[2]];
</script>

<!-- ── Desktop Sidebar (hidden on mobile) ── -->
<aside class="sidebar-root" class:collapsed aria-label="Main navigation">

  <!-- ── Logo + Toggle row ── -->
  <div class="sidebar-logo" class:collapsed>
    {#if !collapsed}
      <a href="/" class="logo-link" title="Home">
        <div class="logo-icon">
          <Sparkles size={16} />
        </div>
        <div class="logo-text">
          <p class="logo-title">Evenai</p>
        </div>
      </a>
    {/if}
    <button
      class="toggle-btn"
      onclick={toggle}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      title={collapsed ? "Expand" : "Collapse"}
    >
      {#if collapsed}
        <ChevronRight size={14} />
      {:else}
        <ChevronLeft size={14} />
      {/if}
    </button>
  </div>

  <!-- ── Nav links ── -->
  <nav class="sidebar-nav">
    {#each navItems as item}
      <button
        class="nav-item"
        class:active={item.active}
        class:disabled={item.disabled}
        disabled={item.disabled}
        aria-disabled={item.disabled ? "true" : undefined}
        tabindex={item.disabled ? -1 : 0}
        onclick={(e) => {
          if (item.disabled) {
            e.preventDefault();
            return;
          }
          navigateToItem(item);
        }}
        title={item.disabled ? `${item.label} (Disabled)` : (collapsed ? item.label : undefined)}
        aria-label={item.disabled ? `${item.label} (Disabled)` : item.label}
        aria-current={item.active ? "page" : undefined}
      >
        <span class="nav-icon"
          ><svelte:component this={item.icon} size={18} /></span
        >
        {#if !collapsed}
          <span class="nav-label">{item.label}</span>
          {#if item.disabled}
            <span class="nav-disabled-badge">Disabled</span>
          {/if}
        {/if}
      </button>
    {/each}
  </nav>

  <!-- ── Spacer ── -->
  <div class="flex-1"></div>

  <!-- ── Bottom section ── -->
  <div class="sidebar-bottom">
    <!-- AI Credits pill -->
    {#if user && !$aiCreditsStore.loading}
      <div
        class="credits-pill"
        class:warn={$aiCreditsStore.remaining <= 10}
        class:danger={$aiCreditsStore.remaining <= 5}
        title="AI Credits"
      >
        <Cpu size={13} />
        {#if !collapsed}
          <span
            >{$aiCreditsStore.remaining} / {$aiCreditsStore.limit} credits</span
          >
        {:else}
          <span class="sr-only">{$aiCreditsStore.remaining} credits</span>
        {/if}
      </div>
    {/if}

    <!-- User row / Sign in -->
    {#if user}
      <div class="user-row" title={collapsed ? name : undefined}>
        <Avatar.Root class="avatar-root">
          {#if avatar}
            <Avatar.Image src={avatar} alt={name} />
          {/if}
          <Avatar.Fallback class="avatar-fallback">{initials}</Avatar.Fallback>
        </Avatar.Root>
        {#if !collapsed}
          <div class="user-info">
            <div class="user-name-row">
              <p class="user-name">{firstName}</p>
              <button class="settings-button" onclick={() => goto('/settings')} aria-label="Settings" title="Settings"><Settings size={15} /></button>
            </div>
            <p class="user-email">{user.email}</p>
          </div>
        {/if}
      </div>

      <button
        class="nav-item signout"
        onclick={() => onSignOut?.()}
        disabled={signingOut}
        title={collapsed ? "Sign out" : undefined}
        aria-label="Sign out"
      >
        <span class="nav-icon"><LogOut size={16} /></span>
        {#if !collapsed}
          <span class="nav-label"
            >{signingOut ? "Signing out…" : "Sign out"}</span
          >
        {/if}
      </button>
    {:else}
      <button
        class="nav-item signin"
        onclick={() => onSignIn?.()}
        disabled={signingIn}
        title={collapsed ? "Sign in" : undefined}
        aria-label="Sign in with Google"
      >
        <span class="nav-icon"><LogIn size={16} /></span>
        {#if !collapsed}
          <span class="nav-label"
            >{signingIn ? "Redirecting…" : "Continue with Google"}</span
          >
        {/if}
      </button>
    {/if}
  </div>
</aside>

<!-- ── Mobile Bottom Bar ── -->
<svelte:window onpointerdown={dismissOutsideAccount} onfocusin={dismissOutsideAccount} onkeydown={closeAccountOnEscape} />
<nav class="mobile-bar" aria-label="Mobile navigation">
  {#each mobileNavItems as item}
    <button
      class="mobile-item"
      class:active={item.active}
      class:disabled={item.disabled}
      aria-current={item.active ? "page" : undefined}
      disabled={item.disabled}
      aria-disabled={item.disabled ? "true" : undefined}
      tabindex={item.disabled ? -1 : 0}
      onclick={(e) => {
        if (item.disabled) {
          e.preventDefault();
          return;
        }
        navigateToItem(item);
      }}
      title={item.disabled ? `${item.label} (Disabled)` : undefined}
      aria-label={item.disabled ? `${item.label} (Disabled)` : item.label}
    >
      <svelte:component this={item.icon} size={20} />
      <span>{item.label}</span>
    </button>
  {/each}
  {#if user}
    <div bind:this={accountArea} class="account-area">
      <button type="button" class="mobile-item" class:active={accountMenuOpen || currentPath === "/settings"}
        bind:this={accountTrigger} aria-expanded={accountMenuOpen} aria-controls="mobile-account-panel"
        aria-label="Account" onclick={() => (accountMenuOpen = !accountMenuOpen)}>
        <Avatar.Root class="h-5 w-5">
          {#if avatar}<Avatar.Image src={avatar} alt="" />{/if}
          <Avatar.Fallback class="text-[9px] font-bold bg-primary/15 text-primary">{initials}</Avatar.Fallback>
        </Avatar.Root>
        <span>Account</span>
      </button>
      <section id="mobile-account-panel" aria-label="Account options" hidden={!accountMenuOpen} class="account-panel">
        <div class="flex items-center gap-3 px-2 py-2">
          <Avatar.Root class="size-9 shrink-0">
            {#if avatar}<Avatar.Image src={avatar} alt="" />{/if}
            <Avatar.Fallback class="bg-primary/15 text-primary">{initials}</Avatar.Fallback>
          </Avatar.Root>
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-foreground">{name}</p>
            <p class="truncate text-xs text-muted-foreground">{user?.email ?? ""}</p>
          </div>
        </div>
        <div class="my-2"><AICredits loadStatus={false} /></div>
        <a href="/settings" class="account-action" onclick={() => (accountMenuOpen = false)}>
          <Settings size={17} /> Settings
        </a>
        {#if onSignOut}
          <button type="button" class="account-action text-rose-300" disabled={signingOut}
            onclick={() => { accountMenuOpen = false; onSignOut(); }}>
            <LogOut size={17} /> {signingOut ? "Signing out…" : "Sign out"}
          </button>
        {/if}
      </section>
    </div>
  {:else}
    <button class="mobile-item" onclick={() => onSignIn?.()}>
      <LogIn size={20} />
      <span>Sign in</span>
    </button>
  {/if}
</nav>

<Dialog.Root bind:open={networkCardSignInOpen}>
  <Dialog.Content showCloseButton={false} class="sm:max-w-md bg-ink-950 text-white border-white/10">
    <Dialog.Header>
      <Dialog.Title>Sign in to view your Network Card</Dialog.Title>
      <Dialog.Description>Your Network Card is available after you sign in.</Dialog.Description>
    </Dialog.Header>
    <Button disabled={signingIn} onclick={() => onSignIn?.()}>
      {signingIn ? "Opening Google…" : "Sign in with Google"}
    </Button>
    <Button variant="ghost" onclick={() => (networkCardSignInOpen = false)}>Later</Button>
  </Dialog.Content>
</Dialog.Root>

<style>
  /* ── Root ── */
  .sidebar-root {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 50;
    width: 240px;
    display: flex;
    flex-direction: column;
    padding: 1.25rem 0.75rem 1rem;
    gap: 0.25rem;

    background: var(--sidebar);
    border-right: 1px solid var(--border);
    transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }

  .sidebar-root.collapsed {
    width: 64px;
  }

  /* Hide on mobile — bottom bar takes over */
  @media (max-width: 767px) {
    .sidebar-root {
      display: none;
    }
  }

  /* ── Logo ── */
  .sidebar-logo {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.25rem;
    padding: 0 0.25rem 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    margin-bottom: 0.5rem;
    flex-shrink: 0;
  }

  /* When collapsed, center just the toggle button */
  .sidebar-logo.collapsed {
    justify-content: center;
  }

  .logo-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    border-radius: 0.75rem;
    padding: 0.4rem 0.5rem;
    transition: background 200ms;
    min-width: 0;
    flex: 1;
  }
  .logo-link:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .logo-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--primary);
    color: #0a0a0a;
    box-shadow: 0 0 12px rgba(250, 204, 21, 0.35);
    transition:
      box-shadow 200ms,
      transform 200ms;
  }
  .logo-link:hover .logo-icon {
    box-shadow: 0 0 20px rgba(250, 204, 21, 0.55);
    transform: scale(1.05);
  }

  .logo-text {
    min-width: 0;
    overflow: hidden;
  }
  .logo-title {
    color: var(--foreground);
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: -.025em;
  }

  /* ── Toggle ── */
  .toggle-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(148, 163, 184, 0.7);
    cursor: pointer;
    transition:
      background 200ms,
      color 200ms;
  }
  .toggle-btn:hover {
    background: rgba(250, 204, 21, 0.12);
    color: #facc15;
    border-color: rgba(250, 204, 21, 0.25);
  }

  /* ── Nav ── */
  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    flex-shrink: 0;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.6rem 0.75rem;
    border-radius: 0.625rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: rgba(148, 163, 184, 0.85);
    cursor: pointer;
    background: transparent;
    border: none;
    text-align: left;
    transition:
      background 180ms,
      color 180ms;
    white-space: nowrap;
    overflow: hidden;
    min-width: 0;
  }

  .nav-item:hover {
    background: rgba(255, 255, 255, 0.07);
    color: #f1f5f9;
  }

  .nav-item:disabled,
  .nav-item.disabled {
    opacity: 0.35;
    cursor: not-allowed !important;
    color: rgba(148, 163, 184, 0.45) !important;
    background: transparent !important;
    border-color: transparent !important;
  }

  .nav-disabled-badge {
    margin-left: auto;
    font-size: 0.5625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.125rem 0.375rem;
    border-radius: 0.375rem;
    background: rgba(255, 255, 255, 0.05);
    color: rgba(148, 163, 184, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.06);
    line-height: 1;
  }

  .nav-item.active {
    background: rgba(250, 204, 21, 0.1);
    color: #fde68a;
    border: 1px solid rgba(250, 204, 21, 0.18);
  }

  .nav-item.signout {
    color: rgba(251, 113, 133, 0.8);
  }
  .nav-item.signout:hover {
    background: rgba(251, 113, 133, 0.1);
    color: #fda4af;
  }

  .nav-item.signin {
    color: #fde68a;
  }
  .nav-item.signin:hover {
    background: rgba(250, 204, 21, 0.1);
    color: #facc15;
  }

  .nav-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
  }

  .nav-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ── Bottom ── */
  .sidebar-bottom {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    flex-shrink: 0;
  }

  .credits-pill {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.72rem;
    font-weight: 500;
    color: #67e8f9;
    background: rgba(103, 232, 249, 0.06);
    border: 1px solid rgba(103, 232, 249, 0.15);
    overflow: hidden;
    white-space: nowrap;
  }
  .credits-pill.warn {
    color: #fde68a;
    background: rgba(250, 204, 21, 0.06);
    border-color: rgba(250, 204, 21, 0.2);
  }
  .credits-pill.danger {
    color: #fda4af;
    background: rgba(251, 113, 133, 0.06);
    border-color: rgba(251, 113, 133, 0.2);
  }

  .user-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0.6rem;
    border-radius: 0.625rem;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.04);
  }
  .user-name-row { display: flex; align-items: center; gap: 0.15rem; min-width: 0; }
  .settings-button { display: grid; place-items: center; width: 22px; height: 22px; flex-shrink: 0; border: 0; border-radius: .4rem; color: rgba(148,163,184,.8); background: transparent; cursor: pointer; }
  .settings-button:hover { color: #67e8f9; background: rgba(103,232,249,.1); }

  :global(.avatar-root) {
    width: 28px !important;
    height: 28px !important;
    flex-shrink: 0;
  }
  :global(.avatar-fallback) {
    font-size: 0.65rem;
    font-weight: 700;
    background: rgba(250, 204, 21, 0.2);
    color: #fde68a;
  }

  .user-info {
    min-width: 0;
    overflow: hidden;
  }
  .user-name {
    min-width: 0;
    font-size: 0.8rem;
    font-weight: 600;
    color: #f1f5f9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .user-email {
    font-size: 0.65rem;
    color: rgba(148, 163, 184, 0.6);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 1px;
  }

  /* ── Mobile bottom bar ── */
  .account-panel {
    position: absolute;
    right: max(.75rem, env(safe-area-inset-right));
    bottom: calc(100% + .5rem);
    width: min(18rem, calc(100% - 1.5rem));
    max-height: calc(100dvh - 100% - 1.5rem - env(safe-area-inset-top));
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: .5rem;
    border: 1px solid var(--border);
    border-radius: 1rem;
    background: var(--popover);
    box-shadow: 0 8px 28px rgb(0 0 0 / 35%);
  }
  .account-action {
    display: flex;
    width: 100%;
    align-items: center;
    gap: .75rem;
    min-height: 44px;
    padding-inline: .75rem;
    border-radius: .5rem;
    font-size: .875rem;
    font-weight: 500;
    cursor: pointer;
  }
  .account-action:hover, .account-action:focus-visible { background: var(--accent); }

  .mobile-bar {
    display: none;
  }

  @media (max-width: 767px) {
    .mobile-bar {
      display: flex;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 50;
      background: var(--sidebar);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding: 0.5rem 0 calc(0.5rem + env(safe-area-inset-bottom));
      justify-content: space-evenly;
      align-items: center;
    }

    :global(.mobile-item) {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.2rem;
      min-width: 44px;
      min-height: 44px;
      justify-content: center;
      font-size: .68rem;
      font-weight: 500;
      color: #a4afbd;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.3rem 0.45rem;
      border-radius: 0.5rem;
      transition: color 150ms;
      text-decoration: none;
      font-family: inherit;
      line-height: 1.2;
    }
    :global(.mobile-item:disabled),
    :global(.mobile-item.disabled) {
      opacity: 0.35;
      cursor: not-allowed !important;
      color: rgba(148, 163, 184, 0.45) !important;
    }
    :global(.mobile-item.active) {
      background: rgba(250, 204, 21, .09);
    }
    :global(.mobile-item.active),
    :global(.mobile-item:hover),
    :global(.mobile-item[data-state="open"]) {
      color: #facc15;
    }
  }
</style>
