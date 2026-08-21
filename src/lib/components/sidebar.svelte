<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import {
    LogIn,
    LogOut,
    Sparkles,
    UserCircle2,
    LayoutGrid,
    Plus,
    ChevronLeft,
    ChevronRight,
    Cpu,
    Home,
  } from "@lucide/svelte";
  import * as Avatar from "$lib/components/ui/avatar/index.js";
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
    user?.email ??
    "Account";
  $: firstName = name.split(" ")[0];
  $: initials = name.slice(0, 1).toUpperCase();

  $: collapsed = $sidebarCollapsed;

  $: currentPath = $page?.url?.pathname ?? "";
  $: isEvents = currentPath === "/discover" || currentPath === "/discover/";
  $: isCreate = currentPath.startsWith("/discover/create");
  $: isConnections = currentPath.startsWith("/connections");

  onMount(() => {
    if (user) {
      aiCreditsStore.fetchStatus();
    }
  });

  function toggle() {
    sidebarCollapsed.update((v) => !v);
  }

  const navItems = [
    {
      label: "Discover",
      icon: LayoutGrid,
      href: "/discover",
      active: () => isEvents,
    },
    {
      label: "Connections",
      icon: UserCircle2,
      href: "/connections",
      active: () => isConnections,
    }
  ];
</script>

<!-- ── Desktop Sidebar (hidden on mobile) ── -->
<aside class="sidebar-root" class:collapsed aria-label="Main navigation">
  <!-- Glow accent line at the top -->
  <div class="sidebar-top-accent"></div>

  <!-- ── Logo + Toggle row ── -->
  <div class="sidebar-logo" class:collapsed>
    {#if !collapsed}
      <a href="/" class="logo-link" title="Home">
        <div class="logo-icon">
          <Sparkles size={16} />
        </div>
        <div class="logo-text">
          <p class="logo-title">Evenai</p>
          <p class="logo-sub">AI networking for events</p>
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
        class:active={item.active()}
        onclick={() => goto(item.href)}
        title={collapsed ? item.label : undefined}
        aria-label={item.label}
        aria-current={item.active() ? "page" : undefined}
      >
        <span class="nav-icon"
          ><svelte:component this={item.icon} size={18} /></span
        >
        {#if !collapsed}
          <span class="nav-label">{item.label}</span>
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
            <p class="user-name">{firstName}</p>
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
<nav class="mobile-bar" aria-label="Mobile navigation">
  <a
    href="/"
    class="mobile-item"
    class:active={currentPath === "/"}
    title="Home"
  >
    <Home size={20} />
    <span>Home</span>
  </a>
  {#each navItems as item}
    <button
      class="mobile-item"
      class:active={item.active()}
      onclick={() => goto(item.href)}
      aria-label={item.label}
    >
      <svelte:component this={item.icon} size={20} />
      <span>{item.label}</span>
    </button>
  {/each}
  {#if user}
    <button class="mobile-item" onclick={() => onSignOut?.()}>
      <Avatar.Root class="h-5 w-5">
        {#if avatar}
          <Avatar.Image src={avatar} alt={name} />
        {/if}
        <Avatar.Fallback
          class="text-[9px] font-bold bg-amber-400/20 text-amber-300"
          >{initials}</Avatar.Fallback
        >
      </Avatar.Root>
      <span>Account</span>
    </button>
  {:else}
    <button class="mobile-item" onclick={() => onSignIn?.()}>
      <LogIn size={20} />
      <span>Sign in</span>
    </button>
  {/if}
</nav>

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

    /* Glassmorphism matching existing design */
    background: rgba(5, 8, 22, 0.82);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-right: 1px solid rgba(255, 255, 255, 0.07);
    box-shadow:
      4px 0 32px rgba(0, 0, 0, 0.4),
      inset -1px 0 0 rgba(255, 255, 255, 0.04);

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

  /* ── Top amber accent line ── */
  .sidebar-top-accent {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(
      90deg,
      rgba(250, 204, 21, 0.8) 0%,
      rgba(34, 211, 238, 0.4) 60%,
      transparent 100%
    );
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
    background: #facc15;
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
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #fde68a;
    white-space: nowrap;
  }
  .logo-sub {
    font-size: 0.65rem;
    color: rgba(148, 163, 184, 0.7);
    white-space: nowrap;
    margin-top: 1px;
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
      background: rgba(5, 8, 22, 0.92);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding: 0.5rem 0 calc(0.5rem + env(safe-area-inset-bottom));
      justify-content: space-around;
      align-items: flex-end;
    }

    .mobile-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.2rem;
      font-size: 0.6rem;
      font-weight: 500;
      color: rgba(148, 163, 184, 0.7);
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.3rem 0.75rem;
      border-radius: 0.5rem;
      transition: color 150ms;
      text-decoration: none;
    }
    .mobile-item.active,
    .mobile-item:hover {
      color: #facc15;
    }
  }
</style>
